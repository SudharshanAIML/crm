import { Server } from "socket.io";
import jwt from "jsonwebtoken";
import * as discussService from "../modules/discuss/discuss.service.js";
import * as repo from "../modules/discuss/discuss.repository.js";

/**
 * Real-time WebSocket layer for the Discuss (Team Chat) feature.
 *
 * Architecture (v2 — Organization-Namespace Isolation):
 *  - Each organization gets its own Socket.IO namespace: /org/<companyId>
 *  - JWT companyId MUST match the namespace path — cross-org connections are
 *    refused at the middleware level (AUTH_FORBIDDEN)
 *  - Within each org namespace:
 *      · Personal room:  user:<empId>   — for mentions, DMs, invite notifications
 *      · Channel room:   channel:<id>   — for channel messages & presence
 *      · Company room:   company:<id>   — for org-wide broadcasts
 *  - This architecture makes cross-org socket event leakage architecturally impossible
 *
 * Security:
 *  - JWT verified on connection handshake (same secret as REST API)
 *  - Namespace companyId validated against JWT companyId
 *  - Channel membership validated in DB before any channel write
 *  - Rate-limited: max 30 messages per 10 seconds per socket
 */

/** @type {Server|null} */
let io = null;

/* =====================================================
   RATE LIMITER (in-memory, per socket)
===================================================== */
const MESSAGE_RATE_WINDOW = 10_000; // 10 seconds
const MESSAGE_RATE_MAX = 30;

const rateLimitMap = new Map(); // socketId → { count, resetAt }

const checkRateLimit = (socketId) => {
  const now = Date.now();
  let entry = rateLimitMap.get(socketId);

  if (!entry || now > entry.resetAt) {
    entry = { count: 0, resetAt: now + MESSAGE_RATE_WINDOW };
    rateLimitMap.set(socketId, entry);
  }

  entry.count++;
  return entry.count <= MESSAGE_RATE_MAX;
};

/* =====================================================
   INITIALISE SOCKET.IO
===================================================== */

/**
 * Attach Socket.IO to the existing HTTP server.
 * Uses dynamic per-organization namespaces for strong isolation.
 * @param {import('http').Server} httpServer
 */
export const initSocketIO = (httpServer) => {
  io = new Server(httpServer, {
    cors: {
      origin: process.env.CORS_ORIGIN || "*",
      methods: ["GET", "POST"],
      credentials: true,
    },
    pingInterval: 25000,
    pingTimeout: 20000,
    maxHttpBufferSize: 1e6, // 1 MB max payload
  });

  /* ---------------------------------------------------
     DYNAMIC ORG NAMESPACES  (/org/:companyId)
     
     io.of(regex) matches any namespace of the form /org/123.
     Each matched namespace is a fully isolated event space.
  --------------------------------------------------- */
  const orgNamespace = io.of(/^\/org\/\d+$/);

  /* ---------------------------------------------------
     AUTH MIDDLEWARE — runs per namespace connection
     Verifies JWT and ensures companyId in namespace
     path matches companyId embedded in the JWT token.
  --------------------------------------------------- */
  orgNamespace.use((socket, next) => {
    const token =
      socket.handshake.auth?.token ||
      socket.handshake.headers?.authorization?.split(" ")[1];

    if (!token) return next(new Error("AUTH_REQUIRED"));

    let decoded;
    try {
      decoded = jwt.verify(token, process.env.JWT_SECRET);
    } catch {
      return next(new Error("AUTH_INVALID"));
    }

    // Extract companyId from the namespace path: /org/42 → 42
    const nspCompanyId = parseInt(socket.nsp.name.split("/org/")[1], 10);

    // Critical: token's companyId must match the namespace's companyId
    if (decoded.companyId !== nspCompanyId) {
      return next(new Error("AUTH_FORBIDDEN"));
    }

    socket.user = {
      empId: decoded.empId,
      companyId: decoded.companyId,
      role: decoded.role,
      name: decoded.name || "",
    };

    next();
  });

  /* ---------------------------------------------------
     CONNECTION HANDLER (per org namespace)
  --------------------------------------------------- */
  orgNamespace.on("connection", (socket) => {
    const { empId, companyId } = socket.user;

    // Personal room for directed events (mentions, invites)
    socket.join(`user:${empId}`);

    // Company-wide broadcast room
    socket.join(`company:${companyId}`);

    console.log(`🔌 WS [org:${companyId}] connected: emp=${empId}`);

    /* ---------------------------------------------------
       CHANNEL PRESENCE
    --------------------------------------------------- */

    socket.on("channel:join", async (channelId) => {
      try {
        const member = await repo.isMember(channelId, empId);
        if (!member) return socket.emit("error", { message: "Not a member" });

        socket.join(`channel:${channelId}`);
        await repo.updateLastRead(channelId, empId);

        socket.to(`channel:${channelId}`).emit("channel:user_joined", { channelId, empId });
      } catch (err) {
        socket.emit("error", { message: err.message });
      }
    });

    socket.on("channel:leave", (channelId) => {
      socket.leave(`channel:${channelId}`);
      socket.to(`channel:${channelId}`).emit("channel:user_left", { channelId, empId });
    });

    /* ---------------------------------------------------
       MESSAGING
    --------------------------------------------------- */

    socket.on("message:send", async ({ channelId, content, parentMessageId, attachmentUrl, attachmentType, attachmentName, attachmentSize }, ack) => {
      try {
        if (!checkRateLimit(socket.id)) {
          return ack?.({ error: "Rate limit exceeded. Slow down." });
        }

        const message = await discussService.sendMessage(channelId, empId, {
          content,
          parentMessageId: parentMessageId || null,
          attachmentUrl: attachmentUrl || null,
          attachmentType: attachmentType || null,
          attachmentName: attachmentName || null,
          attachmentSize: attachmentSize || null,
        });

        // Broadcast to everyone in the channel room (org-scoped namespace)
        socket.nsp.to(`channel:${channelId}`).emit("message:new", message);

        // Mention notifications → personal rooms within same org namespace
        if (message.mentions?.length > 0) {
          for (const mention of message.mentions) {
            if (mention.type === "EMPLOYEE" && mention.refId !== empId) {
              socket.nsp.to(`user:${mention.refId}`).emit("mention:new", {
                messageId: message.message_id,
                channelId,
                senderName: message.sender_name,
                content: message.content?.slice(0, 100) || '[attachment]',
              });
            }
          }
        }

        ack?.({ ok: true, messageId: message.message_id });
      } catch (err) {
        ack?.({ error: err.message });
      }
    });

    socket.on("message:edit", async ({ messageId, content }, ack) => {
      try {
        const updated = await discussService.editMessage(messageId, empId, content);
        socket.nsp.to(`channel:${updated.channel_id}`).emit("message:edited", updated);
        ack?.({ ok: true });
      } catch (err) {
        ack?.({ error: err.message });
      }
    });

    socket.on("message:delete", async ({ messageId }, ack) => {
      try {
        const msg = await repo.getMessageById(messageId);
        if (!msg) return ack?.({ error: "Message not found" });

        await discussService.deleteMessage(messageId, empId, socket.user.role);
        socket.nsp
          .to(`channel:${msg.channel_id}`)
          .emit("message:deleted", { messageId, channelId: msg.channel_id });
        ack?.({ ok: true });
      } catch (err) {
        ack?.({ error: err.message });
      }
    });

    /* ---------------------------------------------------
       EMOJI REACTIONS (toggle: add if absent, remove if present)
       Rate-limited via the shared MESSAGE_RATE_LIMIT bucket.
       Broadcasts message:reaction to all channel members with
       the fresh aggregated reactions array for that message.
    --------------------------------------------------- */

    socket.on("message:react", async ({ messageId, emoji }, ack) => {
      try {
        if (!checkRateLimit(socket.id)) {
          return ack?.({ error: "Rate limit exceeded. Slow down." });
        }

        // Fetch message first — needed for channel_id (broadcast target) and validation
        const msg = await repo.getMessageById(messageId);
        if (!msg) return ack?.({ error: "Message not found" });

        const reactions = await discussService.toggleReaction(messageId, empId, emoji);

        socket.nsp.to(`channel:${msg.channel_id}`).emit("message:reaction", {
          messageId,
          channelId: msg.channel_id,
          reactions,
        });

        ack?.({ ok: true });
      } catch (err) {
        ack?.({ error: err.message });
      }
    });

    /* ---------------------------------------------------
       TYPING INDICATOR (ephemeral, no DB)
       — uses per-socket timer map to auto-clear on disconnect
    --------------------------------------------------- */

    /** @type {Map<number, ReturnType<typeof setTimeout>>} */
    const typingTimers = new Map(); // channelId → timer

    const clearTyping = (channelId) => {
      const timer = typingTimers.get(channelId);
      if (timer) {
        clearTimeout(timer);
        typingTimers.delete(channelId);
      }
      socket.to(`channel:${channelId}`).emit("typing:stop", { channelId, empId });
    };

    socket.on("typing:start", ({ channelId }) => {
      // Clear any existing timer for this channel
      if (typingTimers.has(channelId)) clearTimeout(typingTimers.get(channelId));

      socket.to(`channel:${channelId}`).emit("typing:start", { channelId, empId });

      // Auto-clear after 4s if client doesn't send typing:stop
      typingTimers.set(
        channelId,
        setTimeout(() => clearTyping(channelId), 4000)
      );
    });

    socket.on("typing:stop", ({ channelId }) => {
      clearTyping(channelId);
    });

    /* ---------------------------------------------------
       DIRECT MESSAGES — real-time new-DM notification
       
       Fired by the frontend after POST /discuss/dms resolves.
       If the DM thread was just created (isNew flag from REST response),
       the client emits dm:opened so the peer's sidebar refreshes immediately.
       
       No DB writes here — the REST POST already created the channel.
       This is purely a push notification to the peer.
    --------------------------------------------------- */

    socket.on("dm:opened", async ({ channelId, peerEmpId }) => {
      try {
        // Security: verify the sender is actually a member of this DM channel
        const member = await repo.isMember(channelId, empId);
        if (!member) return;

        // Push the new DM channel to the peer's personal room so their sidebar refreshes
        socket.nsp.to(`user:${peerEmpId}`).emit("dm:new", {
          channelId,
          fromEmpId: empId,
          fromName: socket.user.name,
        });
      } catch (err) {
        // Non-critical — peer will see the DM on next page load
        console.error("dm:opened notification failed:", err.message);
      }
    });

    /* ---------------------------------------------------
       DISCONNECT
    --------------------------------------------------- */

    socket.on("disconnect", () => {
      // Clean up rate limit entry
      rateLimitMap.delete(socket.id);

      // Clear all active typing timers
      typingTimers.forEach((_, channelId) => clearTyping(channelId));
      typingTimers.clear();

      console.log(`🔌 WS [org:${companyId}] disconnected: emp=${empId}`);
    });
  });

  return io;
};

/**
 * Get the Socket.IO server instance.
 * Use .of(`/org/${companyId}`) to target a specific org namespace.
 */
export const getIO = () => io;
