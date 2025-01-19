import course from "../models/CourseSchema.js";


const createCourse = async (json) => {
    try {
        const { name, code, ID, credits, teachers } = json;

        // Check if the course already exists
        const result = await course.findOne({ID});
        if (result) {
            return {createCourse: false, error: "Course already exists with this ID" };
        }

        // Save the course
        const newCourse = new course({
            name,
            code,
            ID,
            credits,
            teachers,
        });

        await newCourse.save();
        return {createCourse:true, message: "Course saved" };
    } catch (err) {
        throw new Error(`Error: ${err.message}`);
    }
};

export { createCourse };