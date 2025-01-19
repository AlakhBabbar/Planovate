import course from "../models/CourseSchema.js";

const deleteCourse = async (json) => {
    try {
        const { ID } = json;

        // Check if the course exists
        const result = await course.findOne({ID});
        if (!result) {
            return {deleteCourse: false, error: "Course does not exist with this ID" };
        }

        // Delete the course
        await course.deleteOne({ID});
        return {deleteCourse:true, message: "Course deleted" };
    } catch (err) {
        throw new Error(`Error: ${err.message}`);
    }
};

export { deleteCourse };