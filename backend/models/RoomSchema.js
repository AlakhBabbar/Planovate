import mongoose from "mongoose";

const roomSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true,
    },
    ID: {
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

const room = mongoose.model('room', roomSchema);

export default room;