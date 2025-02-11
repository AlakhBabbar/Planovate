import express from "express";
import { createCourse, updateCourse, deleteCourse, getCourse, getSemester, getCredits } from "../methods/course.js";

const router = express.Router();

router.get("/", async (req, res) => {
    getCourse(req).then((result) => {
        res.json(result);
    }).catch((message) => {
        res.status(500).json({error: message});
    });
});

router.get("/semester", async (req, res) => {
    getSemester(req).then((result) => {
        res.json(result);
    }).catch((message) => {
        res.status(500).json({error: message});
    });
});

router.get("/credits", async (req, res) => {
    getCredits(req).then((result) => {
        res.json(result);
    }).catch((message) => {
        res.status(500).json({error: message});
    });
});

router.post("/", async (req, res) => {
    createCourse(req.body).then((message) => {
        res.json(message);
    }).catch((message) => {
        res.status(500).json({error: message});
    });
});

router.put("/:ID", async (req, res) => {
    updateCourse(req.body).then((message) => {
        res.json(message);
    }).catch((message) => {
        res.status(500).json({error: message});
    });
});

router.delete("/:ID", async (req, res) => {
    deleteCourse(req.params).then((message) => {
        res.json(message);
    }).catch((message) => {
        res.status(500).json({error: message});
    });
});

export default router;