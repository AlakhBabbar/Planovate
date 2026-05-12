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

// MongoDB connection
import { connectDB } from "./db/db.js";
connectDB();

// MongoDB Routes
import courseRoutes from "./routes/courseRoutes.js";
import teacherRoutes from "./routes/teacherRoutes.js";
import roomRoutes from "./routes/roomRoutes.js";
import curriculumRoutes from "./routes/curriculumRoutes.js";
import timetableRoutes from "./routes/timetableRoutes.js";
import scheduleRoutes from "./routes/scheduleRoutes.js";
import tempScheduleRoutes from "./routes/tempscheduleRoutes.js";
import settingRoutes from "./routes/settingRoutes.js";
import authRoutes from "./routes/authRoutes.js";



// ── Express ──────────────────────────────────────────────────────────────────
const app = express();
app.use(cors());
app.use(express.json());



// MongoDB REST API Routes
app.use("/api/courses", courseRoutes);
app.use("/api/teachers", teacherRoutes);
app.use("/api/rooms", roomRoutes);
app.use("/api/curriculums", curriculumRoutes);
app.use("/api/timetables", timetableRoutes);
app.use("/api/schedules", scheduleRoutes);
app.use("/api/tempschedules", tempScheduleRoutes);
app.use("/api/settings", settingRoutes);
app.use("/api/auth", authRoutes);
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
