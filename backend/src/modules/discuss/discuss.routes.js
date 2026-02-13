import { Router } from "express";
import * as discussController from "./discuss.controller.js";
import { authenticateEmployee } from "../../middlewares/auth.middleware.js";

const router = Router();

// All discuss routes require authentication
router.use(authenticateEmployee);

/* =====================================================
   CHANNEL ROUTES
===================================================== */

// List my channels (with unread counts)
router.get("/channels", discussController.getMyChannels);

// Browse all company channels (for joining)
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

// Join a channel
router.post("/channels/:channelId/join", discussController.joinChannel);

// Leave a channel
router.post("/channels/:channelId/leave", discussController.leaveChannel);

// Get channel members
router.get("/channels/:channelId/members", discussController.getMembers);

// Mark channel as read
router.post("/channels/:channelId/read", discussController.markRead);

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
   MENTION & SEARCH ROUTES
===================================================== */

// Get messages where I was mentioned
router.get("/mentions", discussController.getMyMentions);

// Search messages
router.get("/search", discussController.searchMessages);

export default router;
