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
        required: false,
    },
    room: {
        type: String,
        required: false,
    }
});

const teachOcc = mongoose.model("teachOcc", teachOccSchema);
export default teachOcc;