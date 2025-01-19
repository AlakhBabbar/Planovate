import teacher from "../models/TeacherSchema.js";

const createTeacher = async (json) => {
    try {
        const { name, ID, faculty, department } = json;

        // Check if the teacher already exists
        const result = await teacher.findOne({ID});
        if (result) {
            return {createTeacher:false, error: "Teacher already exists with this ID" };
        }

        // Save the teacher
        const newTeacher = new teacher({
            name,
            ID,
            faculty,
            department,
        });

        await newTeacher.save();
        return {createTeacher:true, message: "Teacher saved" };
    } catch (err) {
        throw new Error(`Error: ${err.message}`);
    }
};

export { createTeacher };