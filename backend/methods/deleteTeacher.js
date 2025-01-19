import teacher from "../models/TeacherSchema.js";

const deleteTeacher = async (json) => {
    try {
        const { ID } = json;

        // Check if the teacher exists
        const result = await teacher.findOne({ID});
        if (!result) {
            return {deleteTeacher: false, error: "Teacher does not exist with this ID" };
        }

        // Delete the teacher
        await teacher.deleteOne({ID});
        return {deleteTeacher:true, message: "Teacher deleted" };
    } catch (err) {
        throw new Error(`Error: ${err.message}`);
    }
};

export { deleteTeacher };