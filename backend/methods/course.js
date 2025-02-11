import course from "../models/CourseSchema.js";

const createCourse = async (json) => {
    try {
        const {unid, name, code, ID, credits, teachers,faculty, semester, department } = json;

        // Check if the course already exists
        const result = await course.findOne({ID});
        if (result) {
            return {success : false, error: "Course already exists with this ID" };
        }

        // Save the course
        const newCourse = new course({
            unid,
            name,
            code,
            ID,
            credits,
            teachers,
            faculty,
            semester,
            department,
        });

        await newCourse.save();
        return {success :true, message: "Course saved" };
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
        const { unid, ID, name, code, credits, teachers,faculty, semester, department } = json;

        // Check if the course exists
        const result = await course.findOne({unid});
        if (!result) {
            return {updateCourse: false, error: "Course does not exist with this ID" };
        }

        // Update the course
        await course.updateOne({unid}, { ID, name, code, credits, teachers, faculty, semester, department });
        return {updateCourse:true, message: "Course updated" };
    } catch (err) {
        throw new Error(`Error: ${err.message}`);
    }
};

const getCourse = async (req, res)=>{
    try {
        const {faculty, semester, department} = req.query;

        let filter = {};

        if (faculty) filter.faculty = faculty;
        if (semester) filter.semester = semester;
        if (department) filter.department = department;


        const courses = await course.distinct("ID", filter);
        return courses;
    } catch (err) {
        throw new Error(`Error: ${err.message}`);
        }
};

const getSemester = async (req, res)=>{
    try {
        const {faculty, department} = req.query;

        let filter = {};

        if (faculty) filter.faculty = faculty;
        if (department) filter.department = department;

        const semesters = await course.distinct("semester", filter);
        return semesters;
    } catch (err) {
        throw new Error(`Error: ${err.message}`);
    }
};

const getCredits = async (req, res)=>{
    try {
        const {ID} = req.query;

        const credits = await course.distinct("credits", {ID});
        return credits;
    } catch (err) {
        throw new Error(`Error: ${err.message}`);
    }
};


export { createCourse, deleteCourse, updateCourse, getCourse, getSemester, getCredits };