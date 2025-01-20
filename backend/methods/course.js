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

const updateCourse = async (json) => {
    try {
        const { ID, name, code, credits, teachers } = json;

        // Check if the course exists
        const result = await course.findOne({ID});
        if (!result) {
            return {updateCourse: false, error: "Course does not exist with this ID" };
        }

        // Update the course
        await course.updateOne({ID}, { name, code, credits, teachers });
        return {updateCourse:true, message: "Course updated" };
    } catch (err) {
        throw new Error(`Error: ${err.message}`);
    }
};


export { createCourse, deleteCourse, updateCourse };