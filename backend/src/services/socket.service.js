import { Server } from "socket.io";
import jwt from "jsonwebtoken";
import * as discussService from "../modules/discuss/discuss.service.js";
import * as repo from "../modules/discuss/discuss.repository.js";

/**
 * Real-time WebSocket layer for the Discuss (Team Chat) feature.
 *
 * Architecture:
 *  - Each authenticated employee joins a personal room: `user:<empId>`
 *  - When viewing a channel, clients emit `channel:join` → joins room `channel:<channelId>`
 *  - Messages are broadcast to the channel room for instant delivery
 *  - Mentions trigger a targeted event to the mentioned user's personal room
 *  - Typing indicators are ephemeral (no DB persistence)
 *
 * Security:
 *  - JWT verified on connection handshake (same token as REST API)
 *  - Channel membership is validated before any write operation
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
 * Attach Socket.IO to the existing HTTP server
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
     AUTH MIDDLEWARE — verify JWT on handshake
  --------------------------------------------------- */
  io.use((socket, next) => {
    const token = socket.handshake.auth?.token || socket.handshake.headers?.authorization?.split(" ")[1];

    if (!token) return next(new Error("AUTH_REQUIRED"));

    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      socket.user = {
        empId: decoded.empId,
        companyId: decoded.companyId,
        role: decoded.role,
      };
      next();
    } catch {
      next(new Error("AUTH_INVALID"));
    }
  });

  /* ---------------------------------------------------
     CONNECTION HANDLER
  --------------------------------------------------- */
  io.on("connection", (socket) => {
    const { empId, companyId } = socket.user;

    // Join personal room for directed messages (mentions, DMs)
    socket.join(`user:${empId}`);

    // Join company room (for broadcast company-wide events)
    socket.join(`company:${companyId}`);

    console.log(`🔌 WS connected: emp=${empId} company=${companyId}`);

    /* ---------------------------------------------------
       CHANNEL PRESENCE
    --------------------------------------------------- */

    socket.on("channel:join", async (channelId) => {
      try {
        const member = await repo.isMember(channelId, empId);
        if (!member) return socket.emit("error", { message: "Not a member" });

        socket.join(`channel:${channelId}`);
        // Update read cursor when joining a channel view
        await repo.updateLastRead(channelId, empId);

        // Notify others in the channel
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

    socket.on("message:send", async ({ channelId, content, parentMessageId }, ack) => {
      try {
        // Rate limit check
        if (!checkRateLimit(socket.id)) {
          return ack?.({ error: "Rate limit exceeded. Slow down." });
        }

        const message = await discussService.sendMessage(channelId, empId, {
          content,
          parentMessageId: parentMessageId || null,
        });

        // Broadcast to everyone in the channel (including sender for consistency)
        io.to(`channel:${channelId}`).emit("message:new", message);

        // Send mention notifications to mentioned employees' personal rooms
        if (message.mentions?.length > 0) {
          for (const mention of message.mentions) {
            if (mention.type === "EMPLOYEE" && mention.refId !== empId) {
              io.to(`user:${mention.refId}`).emit("mention:new", {
                messageId: message.message_id,
                channelId,
                senderName: message.sender_name,
                content: message.content.slice(0, 100),
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
        io.to(`channel:${updated.channel_id}`).emit("message:edited", updated);
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
        io.to(`channel:${msg.channel_id}`).emit("message:deleted", { messageId, channelId: msg.channel_id });
        ack?.({ ok: true });
      } catch (err) {
        ack?.({ error: err.message });
      }
    });

    /* ---------------------------------------------------
       TYPING INDICATOR (ephemeral, no DB)
    --------------------------------------------------- */

    socket.on("typing:start", ({ channelId }) => {
      socket.to(`channel:${channelId}`).emit("typing:start", { channelId, empId });
    });

    socket.on("typing:stop", ({ channelId }) => {
      socket.to(`channel:${channelId}`).emit("typing:stop", { channelId, empId });
    });

    /* ---------------------------------------------------
       DISCONNECT
    --------------------------------------------------- */

    socket.on("disconnect", () => {
      rateLimitMap.delete(socket.id);
      console.log(`🔌 WS disconnected: emp=${empId}`);
    });
  });

  return io;
};

/**
 * Get the Socket.IO instance (for use in other modules)
 */
export const getIO = () => io;
