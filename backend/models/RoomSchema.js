import mongoose from "mongoose";

const timeSchema = new mongoose.Schema({
    time: { type: String, required: true },
    available: { type: Boolean, default: true },
});

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
    },
    availabilty: {
        day:{
            mon: {
                type: Boolean,
                required: true,
            },
            tue: {
                type: Boolean,
                required: true,
            },
            wed: {
                type: Boolean,
                required: true,
            },
            thu: {
                type: Boolean,
                required: true,
            },
            fri: {
                type: Boolean,
                required: true,
            },
            sat: {
                type: Boolean,
                required: true,
            },
        },
        time: [timeSchema],
    },
});

const room = mongoose.model('room', roomSchema);

export default room;