import * as discussService from "./discuss.service.js";
import * as repo from "./discuss.repository.js";
import { getIO } from "../../services/socket.service.js";
import { uploadToCloudinary } from "../../services/cloudinary.service.js";
import { AccessToken } from "livekit-server-sdk";

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
    // Upload the in-memory buffer to Cloudinary
    const { url } = await uploadToCloudinary(
      req.file.buffer,
      req.file.originalname,
      req.file.mimetype
    );
    res.json({
      url,
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
   DIRECT MESSAGE (DM) CONTROLLERS
===================================================== */

/**
 * GET /discuss/dms
 * List all DM conversations for the authenticated employee.
 */
export const getDmChannels = async (req, res, next) => {
  try {
    const { empId, companyId } = req.user;
    const dms = await discussService.getDmChannels(companyId, empId);
    res.json(dms);
  } catch (error) { next(error); }
};

/**
 * POST /discuss/dms
 * Get or create a DM channel with a given employee.
 * Body: { peerEmpId: number }
 * Returns: { channelId, peer }
 */
export const startDm = async (req, res, next) => {
  try {
    const { empId, companyId } = req.user;
    const peerEmpId = parseInt(req.body.peerEmpId);

    if (!peerEmpId || isNaN(peerEmpId)) {
      return res.status(400).json({ message: 'peerEmpId is required' });
    }

    const result = await discussService.getOrStartDm(companyId, empId, peerEmpId);
    res.json(result);
  } catch (error) {
    if (error.message === 'Cannot DM yourself') {
      return res.status(400).json({ message: error.message });
    }
    if (error.message === 'Peer employee not found in your organisation') {
      return res.status(404).json({ message: error.message });
    }
    next(error);
  }
};

/**
 * GET /discuss/dms/employees
 * Return all active employees in the company (excluding self) for the new-DM picker.
 */
export const getDmEmployees = async (req, res, next) => {
  try {
    const { empId, companyId } = req.user;
    const employees = await discussService.getCompanyEmployees(companyId, empId);
    res.json(employees);
  } catch (error) { next(error); }
};


/* =====================================================
   LIVEKIT CALL TOKEN CONTROLLER
===================================================== */

/**
 * POST /discuss/channels/:channelId/call-token
 * Generates a LiveKit JWT for the requesting employee.
 * If the caller is the first to join, logs the call and
 * broadcasts call:incoming to all channel members in real-time.
 */
export const getCallToken = async (req, res, next) => {
  try {
    const { empId, companyId, name } = req.user;
    const channelId = parseInt(req.params.channelId);

    // Auth: must be a channel member
    const member = await repo.isMember(channelId, empId);
    if (!member) return res.status(403).json({ message: "Not a channel member" });

    // Fetch channel info (for room name + notifications)
    const channel = await repo.getChannelById(channelId, empId);
    if (!channel) return res.status(404).json({ message: "Channel not found" });

    const roomName = `call-${companyId}-${channelId}`;
    const identity = `emp-${empId}`;

    // Build LiveKit access token
    const at = new AccessToken(
      process.env.LIVEKIT_API_KEY,
      process.env.LIVEKIT_API_SECRET,
      {
        identity,
        name: name || `Employee ${empId}`,
        ttl: "2h",
      }
    );
    at.addGrant({
      roomJoin: true,
      room: roomName,
      canPublish: true,
      canSubscribe: true,
      canPublishData: true,
      roomCreate: true,
    });

    const token = await at.toJwt();

    // Log the call (idempotent: only if no active call exists)
    const existingCall = await repo.getActiveCallByRoomName(roomName);
    let callId = existingCall?.call_id || null;

    if (!existingCall) {
      callId = await repo.createCallLog(
        channelId,
        empId,
        name || `Employee ${empId}`,
        channel.name || "Direct Message",
        companyId
      );

      // Broadcast incoming call notification to all channel members
      const io = getIO();
      if (io) {
        // Get all channel members to notify
        const members = await repo.getChannelMembers(channelId);
        members.forEach((m) => {
          if (m.emp_id !== empId) {
            io.of(`/org/${companyId}`)
              .to(`user:${m.emp_id}`)
              .emit("call:incoming", {
                channelId,
                callId,
                roomName,
                callerName: name || `Employee ${empId}`,
                callerEmpId: empId,
                channelName: channel.name || "Direct Message",
              });
          }
        });

        // Also broadcast to the channel room so anyone viewing it sees the active call
        io.of(`/org/${companyId}`)
          .to(`channel:${channelId}`)
          .emit("call:started", {
            channelId,
            callId,
            roomName,
            callerName: name || `Employee ${empId}`,
            callerEmpId: empId,
          });
      }
    }

    res.json({
      token,
      roomName,
      livekitUrl: process.env.LIVEKIT_URL,
      callId,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /discuss/channels/:channelId/call-active
 * Returns whether there is an ongoing call in this channel so late joiners
 * can re-join from UI.
 */
export const getActiveCall = async (req, res, next) => {
  try {
    const { empId } = req.user;
    const channelId = parseInt(req.params.channelId);

    const member = await repo.isMember(channelId, empId);
    if (!member) return res.status(403).json({ message: "Not a channel member" });

    const activeCall = await repo.getActiveCallByChannel(channelId);
    if (!activeCall) {
      return res.json({ active: false, call: null });
    }

    return res.json({
      active: true,
      call: {
        callId: activeCall.call_id,
        channelId: activeCall.channel_id,
        callerEmpId: activeCall.caller_emp_id,
        callerName: activeCall.caller_name,
        startedAt: activeCall.started_at,
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * POST /discuss/channels/:channelId/call-end
 * Called when the last person leaves the call to update DB state.
 */
export const endCall = async (req, res, next) => {
  try {
    const { empId, companyId } = req.user;
    const channelId = parseInt(req.params.channelId);

    const result = await repo.endCallLog(channelId);

    const io = getIO();
    if (io) {
      io.of(`/org/${companyId}`)
        .to(`channel:${channelId}`)
        .emit("call:ended", { channelId });
    }

    res.json(result || { message: "No active call to end" });
  } catch (error) {
    next(error);
  }
};


