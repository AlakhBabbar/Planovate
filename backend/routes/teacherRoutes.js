import express from "express";
import { clashTeacher } from "../methods/clashTeacher.js";
import { getTeachers, createTeacher, updateTeacher, deleteTeacher, getFaculty, getDepartment, fetchTeachers } from "../methods/teacher.js";

const router = express.Router();

router.get("/faculty", async (req, res) => {
    getFaculty().then((result) => {
        res.json(result);
    }).catch((message) => {
        res.status(500).json({error: message});
    });
});

router.get("/department", async (req, res) => {
    getDepartment(req).then((result) => {
        res.json(result);
    }).catch((message) => {
        res.status(500).json({error: message});
    });
});

router.get("/fetchTeacher", async (req, res) => {
    fetchTeachers(req).then((result) => {
        res.json(result);
    }).catch((message) => {
        res.status(500).json({error: message});
    });
});


router.get("/", async (req, res) => {
    getTeachers(req).then((result) => {
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

router.delete("/:unid", async (req, res) => {
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