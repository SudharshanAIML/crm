import { Router } from "express";
import { googleLogin } from "./googleAuth.controller.js";
import * as emailController from "../emails/email.controller.js";

const router = Router();

/**
 * POST /auth/google
 * Google OAuth login (ID token verification)
 */
router.post("/google", googleLogin);

/**
 * GET /auth/google/callback
 * OAuth callback for Gmail authorization
 */
router.get("/google/callback", emailController.handleCallback);

export default router;
