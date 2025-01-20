import mongoose from "mongoose";  

const teacherSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true,
    },
    ID: {
        type: String,
        required: true,
    },
    faculty: {
        type: String,
        required: true,
    },
    department: {
        type: String,
        required: true,
    },
    unid:{
        type: Number,
        required: true,
    },
});

const teacher = mongoose.model("teacher", teacherSchema);
export default teacher;