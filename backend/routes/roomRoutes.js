import { updateRoom, createRoom, deleteRoom } from "../methods/room";
import express from "express";

const router = express.Router();

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

export default router;