import mongoose from "mongoose";

const timetableSchema = new mongoose.Schema({
    class: {
        type: String,
        required: true,
    },
    branch: {
        type: String,
        required: true,
    },
    day: {
        type: String,
        required: true,
    },
    time: {
        type: String,
        required: true,
    },
    batch: {
        type: String,
        required: false,
    },
    teacher: {
        type: String,
        required: true,
    },
    room: {
        type: String,
        required: true,
    },
    course: {
        type: String,
        required: true,
    }
});

export default mongoose.model("Timetable", timetableSchema);