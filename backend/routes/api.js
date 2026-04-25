/**
 * REST API routes
 */

import express from "express";
import { getAllCourses } from "../services/courseService.js";
import { getAllTeachers } from "../services/teacherService.js";
import { getAllRooms } from "../services/roomService.js";
import { getAllCurriculums } from "../services/curriculumService.js";
import { getAllSchedules } from "../services/scheduleService.js";

const router = express.Router();

// Health check
router.get("/", (req, res) => {
  res.json({
    status: "ok",
    message: "Planovate Compute Engine API 🔥",
    project: process.env.FIREBASE_PROJECT_ID,
  });
});

// Fetch all courses
router.get("/courses", async (req, res) => {
  try {
    const courses = await getAllCourses();
    res.json({ count: courses.length, courses });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Fetch all teachers
router.get("/teachers", async (req, res) => {
  try {
    const teachers = await getAllTeachers();
    res.json({ count: teachers.length, teachers });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Fetch all rooms
router.get("/rooms", async (req, res) => {
  try {
    const rooms = await getAllRooms();
    res.json({ count: rooms.length, rooms });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Fetch all curriculums
router.get("/curriculums", async (req, res) => {
  try {
    const curriculums = await getAllCurriculums();
    res.json({ count: curriculums.length, curriculums });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Fetch all schedules
router.get("/schedules", async (req, res) => {
  try {
    const schedules = await getAllSchedules();
    res.json({ count: schedules.length, schedules });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
