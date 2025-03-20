import { updateRoom, createRoom, deleteRoom, getRoom, fetchRooms, fetchFaculty } from "../methods/room.js";
import { clashRoom } from "../methods/clashRoom.js";
import express from "express";

const router = express.Router();

router.get("/", async (req, res) => {
    getRoom(req).then((result) => {
        res.json(result);
    }).catch((message) => {
        res.status(500).json({error: message});
    });
});

router.get("/fetchRooms", async (req, res) => {
    try {
        const faculty = req.query.faculty;  // ✅ Extract faculty directly

        if (!faculty) {
            return res.status(400).json({ error: "Faculty is required" });
        }

        const result = await fetchRooms(faculty);  // ✅ Pass faculty instead of req.query
        res.json(result);
    } catch (error) {
        console.error("Fetch Rooms Error:", error);
        res.status(500).json({ error: error.message });
    }
});



router.get("/faculty", async (req, res) => {
    fetchFaculty(req).then((result) => {
        res.json(result);
    }).catch((message) => {
        res.status(500).json({error: message});
    });
});

router.post("/", async (req, res) => {
    createRoom(req.body).then((message) => {
        res.json(message);
    }).catch((message) => {
        res.status(500).json({error: message});
    });
});

router.put("/:unid", async (req, res) => {
    updateRoom(req.body).then((message) => {
        res.json(message);
    }).catch((message) => {
        res.status(500).json({error: message});
    });
});

router.delete("/:unid", async (req, res) => {
    deleteRoom(req.params).then((message) => {
        res.json(message);
    }).catch((message) => {
        res.status(500).json({error: message});
    });
});

router.post("/clash", async (req, res) => {
    clashRoom(req.body).then((message) => {
        res.json(message);
    }).catch((message) => {
        res.status(500).json({error: message});
    });
});

export default router;