import express from "express";
import connectDB from "./db/db.js";
import cors from "cors";
import {clash} from "./methods/clash.js";
import {deleteRoom} from "./methods/deleteRoom.js";
import {deleteTeacher} from "./methods/deleteTeacher.js";
import {createRoom } from "./methods/room.js";
import {createTeacher } from "./methods/teacher.js";
import {createCourse} from "./methods/course.js";
import {deleteCourse} from "./methods/deleteCourse.js";

const app = express();
const port = 5000;
connectDB();
app.use(cors());
app.use(express.json());

// Endpoint to check for clashes
app.post("/check-clash", async (req, res) => {
        clash(req.body).then((message)=>{
            res.json(message);
        }).catch((message)=>{
            res.status(500).json({error: message});
        });
});

app.listen(port, () => {
  console.log(`Listening on port ${port}`);
});
