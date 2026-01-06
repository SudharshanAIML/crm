import express from "express";
import { db } from "../config/db.js";

const router = express.Router();

router.get("/health", async (req, res) => {
  try {
    await db.query("SELECT 1");
    console.log("this is from db-healthcheck");

    res.json({
      status: "ok",
      database: "connected",
    });
  } catch (error) {
    console.error("this is from db-healthcheck");

    res.status(500).json({
      status: "error",
      database: error.message,
    });
  }
});

export default router;
