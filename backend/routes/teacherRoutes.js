import express from "express";
import { clashTeacher } from "../methods/clashTeacher.js";
import { getTeachers, createTeacher, updateTeacher, deleteTeacher } from "../methods/teacher.js";

const router = express.Router();

router.get("/", async (req, res) => {
    getTeachers().then((result) => {
        res.json(result);
    }).catch((message) => {
        res.status(500).json({error: message});
    });
});

router.post("/", async (req, res) => {
    createTeacher(req.body).then((message) => {
        res.json(message);
    }).catch((message) => {
        res.status(500).json({error: message});
    });
});

router.put("/:ID", async (req, res) => {
    updateTeacher(req.body).then((message) => {
        res.json(message);
    }).catch((message) => {
        res.status(500).json({error: message});
    });
});

router.delete("/:ID", async (req, res) => {
    deleteTeacher(req.params).then((message) => {
        res.json(message);
    }).catch((message) => {
        res.status(500).json({error: message});
    });
});

router.post("/clash", async (req, res) => {
    clashTeacher(req.body).then((message) => {
        res.json(message);
    }).catch((message) => {
        res.status(500).json({error: message});
    });
});

export default router;