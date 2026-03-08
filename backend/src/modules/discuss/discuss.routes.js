import { Router } from "express";
import multer from "multer";
import path from "path";
import { fileURLToPath } from "url";
import * as discussController from "./discuss.controller.js";
import { authenticateEmployee } from "../../middlewares/auth.middleware.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const router = Router();

// All discuss routes require authentication
router.use(authenticateEmployee);

/* =====================================================
   FILE UPLOAD (multer disk storage)
===================================================== */

const ALLOWED_MIME = [
  // Images
  'image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/svg+xml',
  // Audio / Video
  'audio/webm', 'audio/ogg', 'audio/mpeg', 'audio/wav', 'audio/mp4',
  'video/mp4', 'video/webm',
  // Documents
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'text/plain', 'text/csv',
];

const diskStorage = multer.diskStorage({
  destination: path.join(__dirname, '../../../../uploads/discuss'),
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname);
    cb(null, `${Date.now()}-${Math.random().toString(36).slice(2)}${ext}`);
  },
});

const upload = multer({
  storage: diskStorage,
  limits: { fileSize: 25 * 1024 * 1024 }, // 25 MB
  fileFilter: (_req, file, cb) => {
    if (ALLOWED_MIME.includes(file.mimetype)) cb(null, true);
    else cb(new Error(`File type not allowed: ${file.mimetype}`));
  },
});

// Upload attachment and get back { url, type, name, size }
router.post('/upload', upload.single('file'), discussController.uploadAttachment);

/* =====================================================
   CHANNEL ROUTES
===================================================== */

// List my channels (with unread counts)
router.get("/channels", discussController.getMyChannels);

// Browse all company PUBLIC channels (for joining)
router.get("/channels/browse", discussController.browseChannels);

// Create a new channel
router.post("/channels", discussController.createChannel);

// Get single channel info
router.get("/channels/:channelId", discussController.getChannel);

// Update a channel
router.patch("/channels/:channelId", discussController.updateChannel);

// Delete a channel
router.delete("/channels/:channelId", discussController.deleteChannel);

/* =====================================================
   MEMBER ROUTES
===================================================== */

// Join a channel (PUBLIC channels only)
router.post("/channels/:channelId/join", discussController.joinChannel);

// Leave a channel
router.post("/channels/:channelId/leave", discussController.leaveChannel);

// Get channel members
router.get("/channels/:channelId/members", discussController.getMembers);

// Mark channel as read
router.post("/channels/:channelId/read", discussController.markRead);

// Get employees who can be invited (same org, not yet members)
router.get("/channels/:channelId/invitable", discussController.getInvitableEmployees);

// Invite employees to a channel (org-isolated)
router.post("/channels/:channelId/invite", discussController.inviteMembers);

/* =====================================================
   MESSAGE ROUTES
===================================================== */

// Send message to channel
router.post("/channels/:channelId/messages", discussController.sendMessage);

// Get messages (paginated, cursor-based)
router.get("/channels/:channelId/messages", discussController.getMessages);

// Edit a message
router.patch("/messages/:messageId", discussController.editMessage);

// Delete a message
router.delete("/messages/:messageId", discussController.deleteMessage);

// Get thread replies for a message
router.get("/messages/:messageId/thread", discussController.getThread);

/* =====================================================
   PINNED MESSAGE ROUTES
===================================================== */

// Get all pinned messages for a channel
router.get("/channels/:channelId/pins", discussController.getPins);

// Pin a message  (body: { messageId })
router.post("/channels/:channelId/pins", discussController.pinMessage);

// Unpin a specific message
router.delete("/channels/:channelId/pins/:messageId", discussController.unpinMessage);

/* =====================================================
   CALL ROUTES (LiveKit Audio Calls)
===================================================== */

// Get a LiveKit token to join the channel's audio call room
router.post("/channels/:channelId/call/token", discussController.getCallToken);

// Get persistent call logs for a channel
router.get("/channels/:channelId/call/logs", discussController.getCallLogs);

// Get room info for an active audio call
router.get("/channels/:channelId/call/info", discussController.getCallRoomInfo);

// Get current live participants in an active call room
router.get("/channels/:channelId/call/participants", discussController.getCallParticipants);

// Force-end an audio call (destroys the LiveKit room)
router.post("/channels/:channelId/call/end", discussController.endCall);

// Remove a specific participant from an active call
router.delete("/channels/:channelId/call/participants/:identity", discussController.removeCallParticipant);

// Get recorded participant history for a specific (possibly ended) call
router.get("/channels/:channelId/call/:callId/participants", discussController.getCallParticipantHistory);

/* =====================================================
   MENTION & SEARCH ROUTES
===================================================== */

// Get messages where I was mentioned
router.get("/mentions", discussController.getMyMentions);

// Search messages
router.get("/search", discussController.searchMessages);

export default router;
