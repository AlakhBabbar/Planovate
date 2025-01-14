import mongoose from "mongoose";

const teachOccSchema = new mongoose.Schema({
    teacher: {
        type: String,
        required: true,
    },
    class: {
        type: String,
        required: true,
    },
    branch: {
        type: String,
        required: true,
    },
    batch: {
        type: String,
        required: false,
    },
    day: {
        type: String,
        required: true,
    },
    time: {
        type: String,
        required: true,
    },
    course: {
        type: String,
        required: true,
    },
    room: {
        type: String,
        required: true,
    }
});

const TeachOcc = mongoose.model("TeachOcc", teachOccSchema);
export default TeachOcc;