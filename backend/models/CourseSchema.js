import mongoose from "mongoose";

const courseSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true,
    },
    code: {
        type: String,
        required: true,
    },
    ID: {
        type: String,
        required: true,
    },
    credits: {
        type: String,
        required: true,
    },
    teachers:{
        type: [String],
        required: true,
    },
    faculty:{
        type: String,
        required: true,
    },
    semester:{
        type: String,
        required: true,
    },
    department:{
        type: String,
        required: true,
    },
    unid:{
        type: Number,
        required: true,
    },
});

const course = mongoose.model("course", courseSchema);
export default course;