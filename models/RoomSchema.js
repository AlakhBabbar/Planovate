import mongoose from "mongoose";

const roomSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true,
    },
    capacity: {
        type: Number,
        required: true,
    },
    faculty: {
        type: String,
        required: true,
    }
});

const Room = mongoose.model('Room', roomSchema);

export default Room;