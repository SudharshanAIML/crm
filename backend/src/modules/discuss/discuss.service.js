import * as repo from "./discuss.repository.js";

/* =====================================================
   INPUT SANITISATION HELPERS
===================================================== */

const MAX_CHANNEL_NAME = 80;
const MAX_DESCRIPTION = 255;
const MAX_MESSAGE_LENGTH = 4000;

const sanitiseText = (text) => {
  if (!text) return text;
  // Strip any HTML tags to prevent XSS stored in DB
  return text.replace(/<[^>]*>/g, "").trim();
};

const validateChannelName = (name) => {
  if (!name || typeof name !== "string") throw new Error("Channel name is required");
  const clean = sanitiseText(name).toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9\-_]/g, "");
  if (clean.length < 2) throw new Error("Channel name must be at least 2 characters");
  if (clean.length > MAX_CHANNEL_NAME) throw new Error(`Channel name max ${MAX_CHANNEL_NAME} chars`);
  return clean;
};

/* =====================================================
   MENTION PARSER — extracts @emp:ID and #deal:ID from content
   Syntax in message content:
     @[Name](emp:42)   → employee mention
     #[Deal Name](deal:7) → deal mention
===================================================== */

const MENTION_REGEX = /(?:@\[([^\]]*)\]\(emp:(\d+)\))|(?:#\[([^\]]*)\]\(deal:(\d+)\))/g;

/**
 * Parse mentions from raw message content
 * @returns {{ type: 'EMPLOYEE'|'DEAL', refId: number }[]}
 */
export const parseMentions = (content) => {
  const mentions = [];
  const seen = new Set();
  let match;
  MENTION_REGEX.lastIndex = 0;

  while ((match = MENTION_REGEX.exec(content)) !== null) {
    if (match[2]) {
      const key = `EMPLOYEE:${match[2]}`;
      if (!seen.has(key)) {
        seen.add(key);
        mentions.push({ type: "EMPLOYEE", refId: parseInt(match[2]) });
      }
    }
    if (match[4]) {
      const key = `DEAL:${match[4]}`;
      if (!seen.has(key)) {
        seen.add(key);
        mentions.push({ type: "DEAL", refId: parseInt(match[4]) });
      }
    }
  }
  return mentions;
};

/* =====================================================
   CHANNEL SERVICES
===================================================== */

export const createChannel = async (companyId, empId, { name, description, isDefault }) => {
  const cleanName = validateChannelName(name);
  const cleanDesc = description ? sanitiseText(description).slice(0, MAX_DESCRIPTION) : null;
  const channelId = await repo.createChannel(companyId, cleanName, cleanDesc, !!isDefault, empId);
  return { channelId, name: cleanName };
};

export const getMyChannels = async (companyId, empId) => {
  return repo.getChannelsForEmployee(companyId, empId);
};

export const browseChannels = async (companyId) => {
  return repo.getAllCompanyChannels(companyId);
};

export const getChannel = async (channelId, empId) => {
  const channel = await repo.getChannelById(channelId, empId);
  if (!channel) throw new Error("Channel not found");
  return channel;
};

export const updateChannel = async (channelId, empId, { name, description }) => {
  const channel = await repo.getChannelById(channelId, empId);
  if (!channel) throw new Error("Channel not found");
  // Only creator or admin can update (handled in controller via role check)
  const cleanName = name ? validateChannelName(name) : channel.name;
  const cleanDesc = description !== undefined ? sanitiseText(description)?.slice(0, MAX_DESCRIPTION) : channel.description;
  await repo.updateChannel(channelId, cleanName, cleanDesc);
};

export const deleteChannel = async (channelId, empId) => {
  const channel = await repo.getChannelById(channelId, empId);
  if (!channel) throw new Error("Channel not found");
  if (channel.is_default) throw new Error("Cannot delete the default channel");
  await repo.deleteChannel(channelId);
};

/* =====================================================
   MEMBER SERVICES
===================================================== */

export const joinChannel = async (channelId, empId) => {
  await repo.addMember(channelId, empId);
};

export const leaveChannel = async (channelId, empId) => {
  const channel = await repo.getChannelById(channelId, empId);
  if (channel?.is_default) throw new Error("Cannot leave the default channel");
  await repo.removeMember(channelId, empId);
};

export const getMembers = async (channelId) => {
  return repo.getChannelMembers(channelId);
};

export const markRead = async (channelId, empId) => {
  await repo.updateLastRead(channelId, empId);
};

/* =====================================================
   MESSAGE SERVICES
===================================================== */

/**
 * Send a message — creates message row + mention rows
 * Returns the full enriched message object for real-time broadcast
 */
export const sendMessage = async (channelId, empId, { content, parentMessageId }) => {
  if (!content || typeof content !== "string") throw new Error("Message content is required");

  const clean = sanitiseText(content);
  if (clean.length === 0) throw new Error("Message cannot be empty");
  if (clean.length > MAX_MESSAGE_LENGTH) throw new Error(`Message max ${MAX_MESSAGE_LENGTH} chars`);

  // Verify sender is a member
  const member = await repo.isMember(channelId, empId);
  if (!member) throw new Error("You must be a channel member to send messages");

  // Create message
  const messageId = await repo.createMessage(channelId, empId, clean, parentMessageId);

  // Parse & store mentions
  const mentions = parseMentions(clean);
  if (mentions.length > 0) {
    await repo.createMentions(messageId, mentions);
  }

  // Fetch the full message to return
  const message = await repo.getMessageById(messageId);
  message.mentions = mentions;

  // Update sender's last_read cursor automatically
  await repo.updateLastRead(channelId, empId);

  return message;
};

/**
 * Fetch paginated messages (cursor-based)
 */
export const getMessages = async (channelId, empId, { limit = 50, before = null }) => {
  // Verify membership
  const member = await repo.isMember(channelId, empId);
  if (!member) throw new Error("Not a member of this channel");

  const messages = await repo.getMessages(channelId, Math.min(limit, 100), before);
  return messages;
};

export const editMessage = async (messageId, empId, content) => {
  const msg = await repo.getMessageById(messageId);
  if (!msg) throw new Error("Message not found");
  if (msg.sender_emp_id !== empId) throw new Error("You can only edit your own messages");

  const clean = sanitiseText(content);
  if (!clean || clean.length === 0) throw new Error("Message cannot be empty");
  if (clean.length > MAX_MESSAGE_LENGTH) throw new Error(`Message max ${MAX_MESSAGE_LENGTH} chars`);

  await repo.editMessage(messageId, clean);

  // Re-parse mentions (delete old, insert new)
  const mentions = parseMentions(clean);

  const updated = await repo.getMessageById(messageId);
  updated.mentions = mentions;
  return updated;
};

export const deleteMessage = async (messageId, empId, role) => {
  const msg = await repo.getMessageById(messageId);
  if (!msg) throw new Error("Message not found");
  // Only the sender or an admin can delete
  if (msg.sender_emp_id !== empId && role !== "ADMIN") {
    throw new Error("You can only delete your own messages");
  }
  await repo.softDeleteMessage(messageId);
};

export const getThread = async (parentMessageId) => {
  return repo.getThreadReplies(parentMessageId);
};

/* =====================================================
   MENTION & SEARCH SERVICES
===================================================== */

export const getMyMentions = async (empId) => {
  return repo.getMentionsForEmployee(empId);
};

export const searchMessages = async (companyId, empId, query) => {
  if (!query || query.trim().length < 2) throw new Error("Search query too short");
  const clean = sanitiseText(query).slice(0, 100);
  // Use LIKE-based search (safe fallback, no FULLTEXT index needed)
  return repo.searchMessagesLike(companyId, empId, clean);
};
