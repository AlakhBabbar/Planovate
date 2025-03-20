import course from "../models/CourseSchema.js";

const createCourse = async (json) => {
    try {
        const { unid, name, code, ID, credits, teachers, faculty, semester, department } = json;

        // Validate required fields
        if (!ID || !name || !code || !credits || !teachers || !faculty || !semester || !department) {
            return { success: false, error: "Missing required fields!" };
        }

        // Check if the course already exists
        const existingCourse = await course.findOne({ ID,department });
        if (existingCourse) {
            return { success: false, error: "Course already exists with this ID" };
        }

        // Generate a unique unid if not provided
        const courseCount = await course.countDocuments();
        const newUnid = unid || courseCount + 1; // Ensure unid is unique

        // Save the course
        const newCourse = new course({
            unid: newUnid,
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
        return { success: true, message: "Course saved" };
    } catch (err) {
        console.error("Error in createCourse:", err); // Debugging log
        return { success: false, error: err.message };
    }
};



const deleteCourse = async (json) => {
    try {
        const { unid } = json;

        // Check if the course exists
        const result = await course.findOne({unid});
        if (!result) {
            return {deleteCourse: false, error: "Course does not exist with this ID" };
        }

        // Delete the course
        await course.deleteOne({unid});
        return {success:true, message: "Course deleted" };
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
            return {updateCourse: false, error: "Course does not exist with this UNID" };
        }

        // Update the course
        await course.updateOne({unid}, { ID, name, code, credits, teachers, faculty, semester, department });
        return {success:true, message: "Course updated" };
    } catch (err) {
        throw new Error(`Error: ${err.message}`);
    }
};

const fetchCourses = async (req, res)=>{
    try {
        const {faculty, semester, department} = req.query;

        let filter = {};

        if (faculty) filter.faculty = faculty;
        if (semester) filter.semester = semester;
        if (department) filter.department = department;

        const courses = await course.find(filter, { _id: 0, unid: 1, ID: 1, name: 1 , code: 1, credits: 1, teachers: 1});
        return courses;
    } catch (err) {
        throw new Error(`Error: ${err.message}`);
    }
};

const getCourse = async (req, res)=>{
    try {
        const {semester} = req.query;

        let filter = {};

        // if (faculty) filter.faculty = faculty;
        if (semester) filter.semester = semester;
        // if (department) filter.department = department;


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


export { createCourse, deleteCourse, updateCourse, getCourse, getSemester, getCredits, fetchCourses };