import mongoose from "mongoose";

const timeSchema = new mongoose.Schema({
    time: { type: String, required: true },
    available: { type: Boolean, default: true },
});

const roomSchema = new mongoose.Schema({
    unid: {
        type:Number,
        required: true,
    },
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
    availability: {
        day:{
            mon: {
                time: [timeSchema],
            },
            tue: {
                time: [timeSchema],
            },
            wed: {
                time: [timeSchema],
            },
            thu: {
                time: [timeSchema],
            },
            fri: {
                time: [timeSchema],
            },
            sat: {
                time: [timeSchema],
            },
        },
    },
});

const room = mongoose.model('room', roomSchema);

export default room;