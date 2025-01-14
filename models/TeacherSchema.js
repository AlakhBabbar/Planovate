import mongoose from "mongoose";  

const teacherSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true,
    },
    department: {
        type: Number,
        required: true,
    },
    course: {
        type: Array,
        required: true,
    }
});

const Teacher = mongoose.model("Teacher", teacherSchema);
export default Teacher;