import * as repo from "./discuss.repository.js";

/* =====================================================
   INPUT SANITISATION HELPERS
===================================================== */

const MAX_CHANNEL_NAME = 80;
const MAX_DESCRIPTION = 255;
const MAX_MESSAGE_LENGTH = 4000;

const sanitiseText = (text) => {
  if (!text) return text;
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
===================================================== */

const MENTION_REGEX = /(?:@\[([^\]]*)\]\(emp:(\d+)\))|(?:#\[([^\]]*)\]\(deal:(\d+)\))/g;

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

export const createChannel = async (companyId, empId, { name, description, isDefault, channelType }) => {
  const cleanName = validateChannelName(name);
  const cleanDesc = description ? sanitiseText(description).slice(0, MAX_DESCRIPTION) : null;
  const type = channelType === 'PRIVATE' ? 'PRIVATE' : 'PUBLIC';
  const channelId = await repo.createChannel(companyId, cleanName, cleanDesc, !!isDefault, type, empId);
  return { channelId, name: cleanName, channelType: type };
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

export const joinChannel = async (channelId, empId, companyId) => {
  // Verify the channel belongs to the employee's org (org-isolation check)
  const channel = await repo.getChannelById(channelId, empId);
  if (!channel) throw new Error("Channel not found");
  if (channel.company_id !== companyId) throw new Error("Access denied");
  if (channel.channel_type === 'PRIVATE') throw new Error("This is a private channel. Ask a member to invite you.");
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

/**
 * Get employees in the same org who are not yet channel members (for invite modal)
 */
export const getInvitableEmployees = async (channelId, companyId) => {
  return repo.getCompanyEmployeesNotInChannel(companyId, channelId);
};

/**
 * Invite multiple company employees to a channel
 * Enforces org-isolation: all invitees must belong to inviter's company
 * @param {number} channelId
 * @param {number} inviterEmpId
 * @param {number} inviterCompanyId
 * @param {number[]} targetEmpIds
 */
export const inviteMembers = async (channelId, inviterEmpId, inviterCompanyId, targetEmpIds) => {
  if (!Array.isArray(targetEmpIds) || targetEmpIds.length === 0) {
    throw new Error("No employees selected to invite");
  }
  if (targetEmpIds.length > 50) throw new Error("Cannot invite more than 50 people at once");

  // Verify channel belongs to inviter's org
  const channel = await repo.getChannelById(channelId, inviterEmpId);
  if (!channel) throw new Error("Channel not found");
  if (channel.company_id !== inviterCompanyId) throw new Error("Access denied");

  // Org-isolation: fetch only org employees with matching IDs to prevent cross-org invitations
  const eligible = await repo.getCompanyEmployeesNotInChannel(inviterCompanyId, channelId);
  const eligibleIds = new Set(eligible.map(e => e.emp_id));

  // Filter to only valid (same-org, not-yet-member) IDs
  const validIds = targetEmpIds.filter(id => eligibleIds.has(id));
  if (validIds.length === 0) throw new Error("Selected employees are already members or not in your organization");

  // Add members + record invitations atomically
  await repo.bulkAddMembers(channelId, validIds);
  await repo.createInvitations(channelId, inviterEmpId, validIds);
  await repo.acceptInvitations(channelId, validIds);

  // Return enriched objects for socket notifications
  return eligible.filter(e => validIds.includes(e.emp_id));
};

/* =====================================================
   MESSAGE SERVICES
===================================================== */

export const sendMessage = async (channelId, empId, { content, parentMessageId, attachmentUrl, attachmentType, attachmentName, attachmentSize }) => {
  // Either text OR attachment is required
  const hasText = content && typeof content === 'string' && content.trim().length > 0;
  const hasAttachment = !!attachmentUrl;
  if (!hasText && !hasAttachment) throw new Error('Message must have text or an attachment');

  const clean = hasText ? sanitiseText(content) : null;
  if (hasText && clean.length > MAX_MESSAGE_LENGTH) throw new Error(`Message max ${MAX_MESSAGE_LENGTH} chars`);

  const member = await repo.isMember(channelId, empId);
  if (!member) throw new Error('You must be a channel member to send messages');

  const attachment = attachmentUrl
    ? { url: attachmentUrl, type: attachmentType, name: attachmentName, size: attachmentSize }
    : {};

  const messageId = await repo.createMessage(channelId, empId, clean, parentMessageId, attachment);

  if (hasText) {
    const mentions = parseMentions(clean);
    if (mentions.length > 0) await repo.createMentions(messageId, mentions);
  }

  const message = await repo.getMessageById(messageId);
  message.mentions = [];

  await repo.updateLastRead(channelId, empId);
  return message;
};

export const getMessages = async (channelId, empId, { limit = 50, before = null }) => {
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

  const mentions = parseMentions(clean);
  const updated = await repo.getMessageById(messageId);
  updated.mentions = mentions;
  return updated;
};

export const deleteMessage = async (messageId, empId, role) => {
  const msg = await repo.getMessageById(messageId);
  if (!msg) throw new Error("Message not found");
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

export const searchMessages = async (companyId, empId, query, channelId = null) => {
  if (!query || query.trim().length < 2) throw new Error("Search query too short");
  const clean = sanitiseText(query).slice(0, 100);
  return repo.searchMessagesLike(companyId, empId, clean, channelId);
};

/* =====================================================
   PINNED MESSAGE SERVICES
===================================================== */

export const getPins = async (channelId, empId) => {
  const member = await repo.isMember(channelId, empId);
  if (!member) throw new Error('Not a member of this channel');
  return repo.getPinnedMessages(channelId);
};

export const pinMessage = async (channelId, messageId, empId) => {
  const member = await repo.isMember(channelId, empId);
  if (!member) throw new Error('Not a member of this channel');

  const msg = await repo.getMessageById(messageId);
  if (!msg) throw new Error('Message not found');
  if (msg.channel_id !== channelId) throw new Error('Message does not belong to this channel');
  if (msg.parent_message_id) throw new Error('Thread replies cannot be pinned');
  if (msg.is_deleted) throw new Error('Cannot pin a deleted message');

  await repo.pinMessage(channelId, messageId, empId);
  return repo.getPinnedMessages(channelId);
};

export const unpinMessage = async (channelId, messageId, empId) => {
  const member = await repo.isMember(channelId, empId);
  if (!member) throw new Error('Not a member of this channel');
  await repo.unpinMessage(channelId, messageId);
  return repo.getPinnedMessages(channelId);
};
