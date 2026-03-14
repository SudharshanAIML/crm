import { Router } from "express";
import { authenticateEmployee } from "../../middlewares/auth.middleware.js";
import * as supportChatController from "./supportChat.controller.js";

const router = Router();

router.use(authenticateEmployee);

router.get("/health", supportChatController.health);
router.get("/sessions", supportChatController.listSessions);
router.post("/sessions", supportChatController.createSession);
router.get("/sessions/:sessionToken", supportChatController.getSession);
router.get("/sessions/:sessionToken/history", supportChatController.getHistory);
router.post("/sessions/:sessionToken/chat", supportChatController.sendMessage);
router.patch("/sessions/:sessionToken", supportChatController.renameSession);
router.delete("/sessions/:sessionToken", supportChatController.deleteSession);

export default router;
