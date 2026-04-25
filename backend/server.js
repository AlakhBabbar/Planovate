/**
 * Planovate Compute Engine — Entry Point
 *
 * Express HTTP server + WebSocket server for real-time timetable suggestions.
 */

import "dotenv/config";
import express from "express";
import cors from "cors";
import { createServer } from "http";
import { WebSocketServer } from "ws";

import apiRoutes from "./routes/api.js";
import { handleConnection } from "./ws/socketHandler.js";

// Initialize Firebase (side-effect: connects to Firestore)
import "./config/firebase.js";

// ── Express ──────────────────────────────────────────────────────────────────
const app = express();
app.use(cors());
app.use(express.json());
app.use("/api", apiRoutes);

// ── HTTP + WebSocket ─────────────────────────────────────────────────────────
const server = createServer(app);
const wss = new WebSocketServer({ server });

wss.on("connection", (ws) => {
  handleConnection(ws);
});

// ── Start ────────────────────────────────────────────────────────────────────
const PORT = process.env.PORT || 3001;

server.listen(PORT, () => {
  console.log(`\n🔥 Planovate Compute Engine`);
  console.log(`   HTTP  → http://localhost:${PORT}/api`);
  console.log(`   WS    → ws://localhost:${PORT}`);
  console.log(`   Project: ${process.env.FIREBASE_PROJECT_ID}\n`);
  console.log("REST routes:");
  console.log("  GET  /api              → health check");
  console.log("  GET  /api/courses      → all courses");
  console.log("  GET  /api/teachers     → all teachers");
  console.log("  GET  /api/rooms        → all rooms");
  console.log("  GET  /api/curriculums  → all curriculums");
  console.log("  GET  /api/schedules    → all schedules\n");
  console.log("WebSocket messages:");
  console.log("  → open_timetable   { timetableId, meta }");
  console.log("  → cursor_move      { row, col }");
  console.log("  → close_timetable  { timetableId }");
  console.log("  ← suggestions      { neighbors: {up,down,left,right} }");
  console.log("  ← computing        { status }\n");
});
