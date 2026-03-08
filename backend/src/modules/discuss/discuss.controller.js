import * as discussService from "./discuss.service.js";
import * as repo from "./discuss.repository.js";
import { getIO } from "../../services/socket.service.js";
import * as livekitService from "../../services/livekit.service.js";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/* =====================================================
   FILE UPLOAD CONTROLLER
===================================================== */

/**
 * POST /discuss/upload
 * Expects multipart/form-data with field name "file"
 * Returns { url, type, name, size } to be included in sendMessage body
 */
export const uploadAttachment = async (req, res, next) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: 'No file provided' });
    }
    // Build the public URL — served by express.static('/uploads')
    const relativePath = `/uploads/discuss/${req.file.filename}`;
    res.json({
      url: relativePath,
      type: req.file.mimetype,
      name: req.file.originalname,
      size: req.file.size,
    });
  } catch (error) { next(error); }
};

/* =====================================================
   CHANNEL CONTROLLERS
===================================================== */

export const createChannel = async (req, res, next) => {
  try {
    const result = await discussService.createChannel(
      req.user.companyId,
      req.user.empId,
      req.body
    );
    res.status(201).json(result);
  } catch (error) { next(error); }
};

export const getMyChannels = async (req, res, next) => {
  try {
    const channels = await discussService.getMyChannels(req.user.companyId, req.user.empId);
    res.json(channels);
  } catch (error) { next(error); }
};

export const browseChannels = async (req, res, next) => {
  try {
    const channels = await discussService.browseChannels(req.user.companyId);
    res.json(channels);
  } catch (error) { next(error); }
};

export const getChannel = async (req, res, next) => {
  try {
    const channel = await discussService.getChannel(
      parseInt(req.params.channelId),
      req.user.empId
    );
    res.json(channel);
  } catch (error) { next(error); }
};

export const updateChannel = async (req, res, next) => {
  try {
    await discussService.updateChannel(
      parseInt(req.params.channelId),
      req.user.empId,
      req.body
    );
    res.json({ message: "Channel updated" });
  } catch (error) { next(error); }
};

export const deleteChannel = async (req, res, next) => {
  try {
    await discussService.deleteChannel(parseInt(req.params.channelId), req.user.empId);
    res.json({ message: "Channel deleted" });
  } catch (error) { next(error); }
};

/* =====================================================
   MEMBER CONTROLLERS
===================================================== */

export const joinChannel = async (req, res, next) => {
  try {
    await discussService.joinChannel(
      parseInt(req.params.channelId),
      req.user.empId,
      req.user.companyId
    );
    res.json({ message: "Joined channel" });
  } catch (error) { next(error); }
};

export const leaveChannel = async (req, res, next) => {
  try {
    await discussService.leaveChannel(parseInt(req.params.channelId), req.user.empId);
    res.json({ message: "Left channel" });
  } catch (error) { next(error); }
};

export const getMembers = async (req, res, next) => {
  try {
    const members = await discussService.getMembers(parseInt(req.params.channelId));
    res.json(members);
  } catch (error) { next(error); }
};

export const markRead = async (req, res, next) => {
  try {
    await discussService.markRead(parseInt(req.params.channelId), req.user.empId);
    res.json({ message: "Read cursor updated" });
  } catch (error) { next(error); }
};

/**
 * GET /channels/:channelId/invitable
 * Returns company employees who are not yet channel members
 */
export const getInvitableEmployees = async (req, res, next) => {
  try {
    const employees = await discussService.getInvitableEmployees(
      parseInt(req.params.channelId),
      req.user.companyId
    );
    res.json(employees);
  } catch (error) { next(error); }
};

/**
 * POST /channels/:channelId/invite
 * Body: { empIds: number[] }
 * Adds employees to channel (org-isolated) and sends real-time notification
 */
export const inviteMembers = async (req, res, next) => {
  try {
    const channelId = parseInt(req.params.channelId);
    const { empIds } = req.body;

    const addedEmployees = await discussService.inviteMembers(
      channelId,
      req.user.empId,
      req.user.companyId,
      (empIds || []).map(Number)
    );

    // Real-time: notify each invited employee via their personal room in the org namespace
    const io = getIO();
    if (io && addedEmployees.length > 0) {
      // Fetch minimal channel info to include in the notification
      const channelInfo = { channelId, inviterName: req.user.name || "A teammate" };

      addedEmployees.forEach(emp => {
        io.of(`/org/${req.user.companyId}`)
          .to(`user:${emp.emp_id}`)
          .emit("member:invited", {
            channelId,
            inviterName: channelInfo.inviterName,
          });
      });
    }

    res.json({
      message: `${addedEmployees.length} employee(s) added to channel`,
      added: addedEmployees,
    });
  } catch (error) { next(error); }
};

/* =====================================================
   MESSAGE CONTROLLERS
===================================================== */

export const sendMessage = async (req, res, next) => {
  try {
    const message = await discussService.sendMessage(
      parseInt(req.params.channelId),
      req.user.empId,
      req.body
    );
    res.status(201).json(message);
  } catch (error) { next(error); }
};

export const getMessages = async (req, res, next) => {
  try {
    const { limit, before } = req.query;
    const messages = await discussService.getMessages(
      parseInt(req.params.channelId),
      req.user.empId,
      { limit: limit ? parseInt(limit) : 50, before: before ? parseInt(before) : null }
    );
    res.json(messages);
  } catch (error) { next(error); }
};

export const editMessage = async (req, res, next) => {
  try {
    const message = await discussService.editMessage(
      parseInt(req.params.messageId),
      req.user.empId,
      req.body.content
    );
    res.json(message);
  } catch (error) { next(error); }
};

export const deleteMessage = async (req, res, next) => {
  try {
    await discussService.deleteMessage(
      parseInt(req.params.messageId),
      req.user.empId,
      req.user.role
    );
    res.json({ message: "Message deleted" });
  } catch (error) { next(error); }
};

export const getThread = async (req, res, next) => {
  try {
    const replies = await discussService.getThread(parseInt(req.params.messageId));
    res.json(replies);
  } catch (error) { next(error); }
};

/* =====================================================
   MENTION & SEARCH CONTROLLERS
===================================================== */

export const getMyMentions = async (req, res, next) => {
  try {
    const mentions = await discussService.getMyMentions(req.user.empId);
    res.json(mentions);
  } catch (error) { next(error); }
};

export const searchMessages = async (req, res, next) => {
  try {
    const { q, channelId } = req.query;
    const results = await discussService.searchMessages(
      req.user.companyId,
      req.user.empId,
      q,
      channelId ? parseInt(channelId) : null
    );
    res.json(results);
  } catch (error) { next(error); }
};

/* =====================================================
   PINNED MESSAGES CONTROLLERS
===================================================== */

export const getPins = async (req, res, next) => {
  try {
    const pins = await discussService.getPins(
      parseInt(req.params.channelId),
      req.user.empId
    );
    res.json(pins);
  } catch (error) { next(error); }
};

export const pinMessage = async (req, res, next) => {
  try {
    const { messageId } = req.body;
    if (!messageId) return res.status(400).json({ message: 'messageId required' });

    const pins = await discussService.pinMessage(
      parseInt(req.params.channelId),
      parseInt(messageId),
      req.user.empId
    );

    // Broadcast updated pin list to every member in this channel
    const io = getIO();
    if (io) {
      io.of(`/org/${req.user.companyId}`)
        .to(`channel:${req.params.channelId}`)
        .emit('pin:change', { channelId: parseInt(req.params.channelId), pins });
    }

    res.json(pins);
  } catch (error) { next(error); }
};

export const unpinMessage = async (req, res, next) => {
  try {
    const pins = await discussService.unpinMessage(
      parseInt(req.params.channelId),
      parseInt(req.params.messageId),
      req.user.empId
    );

    const io = getIO();
    if (io) {
      io.of(`/org/${req.user.companyId}`)
        .to(`channel:${req.params.channelId}`)
        .emit('pin:change', { channelId: parseInt(req.params.channelId), pins });
    }

    res.json(pins);
  } catch (error) { next(error); }
};

/* =====================================================
   CALL CONTROLLERS (LiveKit Audio Calls)
===================================================== */

/**
 * POST /channels/:channelId/call/token
 * Generates a LiveKit access token for the requesting user to join
 * the audio call room for a specific channel.
 * Returns { token, wsUrl, roomName }
 */
export const getCallToken = async (req, res, next) => {
  try {
    const channelId = parseInt(req.params.channelId);
    const { empId, companyId, name } = req.user;

    // Verify channel membership before issuing a token
    const channel = await discussService.getChannel(channelId, empId);
    if (!channel) {
      return res.status(403).json({ message: "Not a member of this channel" });
    }

    const roomName = livekitService.buildRoomName(companyId, channelId);
    const identity = `emp-${empId}`;
    const token = await livekitService.generateToken(roomName, identity, name || `Employee ${empId}`);
    const wsUrl = livekitService.getWsUrl();

    res.json({ token, wsUrl, roomName });
  } catch (error) { next(error); }
};

/**
 * GET /channels/:channelId/call/logs
 * Fetch persistent call logs for a channel, so call history survives page refresh.
 */
export const getCallLogs = async (req, res, next) => {
  try {
    const channelId = parseInt(req.params.channelId);
    const { empId } = req.user;

    // Verify channel membership
    const channel = await discussService.getChannel(channelId, empId);
    if (!channel) {
      return res.status(403).json({ message: "Not a member of this channel" });
    }

    const logs = await repo.getCallLogsByChannel(channelId);
    res.json(logs);
  } catch (error) { next(error); }
};

/**
 * GET /channels/:channelId/call/participants
 * Get current participants in an active audio call room.
 */
export const getCallParticipants = async (req, res, next) => {
  try {
    const channelId = parseInt(req.params.channelId);
    const { empId, companyId } = req.user;

    const channel = await discussService.getChannel(channelId, empId);
    if (!channel) {
      return res.status(403).json({ message: "Not a member of this channel" });
    }

    const roomName = livekitService.buildRoomName(companyId, channelId);

    try {
      const participants = await livekitService.listParticipants(roomName);
      res.json({ roomName, participants });
    } catch {
      // Room may not exist yet (no active call)
      res.json({ roomName, participants: [] });
    }
  } catch (error) { next(error); }
};

/**
 * GET /channels/:channelId/call/info
 * Get room information for an active audio call.
 */
export const getCallRoomInfo = async (req, res, next) => {
  try {
    const channelId = parseInt(req.params.channelId);
    const { empId, companyId } = req.user;

    const channel = await discussService.getChannel(channelId, empId);
    if (!channel) {
      return res.status(403).json({ message: "Not a member of this channel" });
    }

    const roomName = livekitService.buildRoomName(companyId, channelId);
    const room = await livekitService.getRoomInfo(roomName);

    if (!room) {
      return res.json({ active: false, roomName });
    }

    res.json({ active: true, roomName, room });
  } catch (error) { next(error); }
};

/**
 * POST /channels/:channelId/call/end
 * Force-end an audio call (admin / caller privilege).
 * Destroys the LiveKit room, disconnecting all participants.
 */
export const endCall = async (req, res, next) => {
  try {
    const channelId = parseInt(req.params.channelId);
    const { empId, companyId } = req.user;

    const channel = await discussService.getChannel(channelId, empId);
    if (!channel) {
      return res.status(403).json({ message: "Not a member of this channel" });
    }

    const roomName = livekitService.buildRoomName(companyId, channelId);

    try {
      await livekitService.endRoom(roomName);
    } catch {
      // Room may already be gone — that's fine
    }

    // Also persist the end in DB (the webhook will fire too, but this ensures
    // the DB is updated even if the webhook is delayed)
    try {
      await repo.endCallLog(channelId);
    } catch {
      // Already ended or no active call
    }

    res.json({ message: "Call ended", roomName });
  } catch (error) { next(error); }
};

/**
 * DELETE /channels/:channelId/call/participants/:identity
 * Remove a specific participant from an active audio call.
 */
export const removeCallParticipant = async (req, res, next) => {
  try {
    const channelId = parseInt(req.params.channelId);
    const { identity } = req.params;
    const { empId, companyId } = req.user;

    const channel = await discussService.getChannel(channelId, empId);
    if (!channel) {
      return res.status(403).json({ message: "Not a member of this channel" });
    }

    const roomName = livekitService.buildRoomName(companyId, channelId);
    await livekitService.removeParticipant(roomName, identity);

    res.json({ message: "Participant removed", identity, roomName });
  } catch (error) { next(error); }
};

/**
 * GET /channels/:channelId/call/:callId/participants
 * Get the recorded participant history for a specific (possibly ended) call.
 */
export const getCallParticipantHistory = async (req, res, next) => {
  try {
    const channelId = parseInt(req.params.channelId);
    const callId = parseInt(req.params.callId);
    const { empId } = req.user;

    const channel = await discussService.getChannel(channelId, empId);
    if (!channel) {
      return res.status(403).json({ message: "Not a member of this channel" });
    }

    const participants = await repo.getCallParticipants(callId);
    res.json(participants);
  } catch (error) { next(error); }
};
