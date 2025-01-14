import mongoose from "mongoose";

const roomOccSchema = new mongoose.Schema({
    room: {
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
    course: {
        type: String,
        required: true,
    },
    class: {
        type: String,
        required: true,
    },
    teacher: {
        type: String,
        required: true,
    }
});

const RoomOcc = mongoose.model("RoomOcc", roomOccSchema);
export default RoomOcc;