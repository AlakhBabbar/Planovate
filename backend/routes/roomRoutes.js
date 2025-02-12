import { updateRoom, createRoom, deleteRoom, getRoom } from "../methods/room.js";
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

router.post("/", async (req, res) => {
    createRoom(req.body).then((message) => {
        res.json(message);
    }).catch((message) => {
        res.status(500).json({error: message});
    });
});

router.put("/:ID", async (req, res) => {
    updateRoom(req.body).then((message) => {
        res.json(message);
    }).catch((message) => {
        res.status(500).json({error: message});
    });
});

router.delete("/:ID", async (req, res) => {
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