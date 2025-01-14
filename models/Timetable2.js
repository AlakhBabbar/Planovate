import mongoose from "mongoose";

const timetableSchema = new mongoose.Schema({
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

const Timetable2 = mongoose.model("Timetable2", timetableSchema);
export default Timetable2;