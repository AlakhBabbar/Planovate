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
        type: Number,
        required: true,
    },
    teachers:{
        type: [String],
        required: true,
    }
});

const course = mongoose.model("course", courseSchema);
export default course;