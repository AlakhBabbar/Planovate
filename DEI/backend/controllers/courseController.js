// filepath: /c:/Users/anish/Desktop/DEI/backend/controllers/courseController.js
const Course = require('../models/Course');

exports.getAllCourses = async (req, res) => {
    try {
        const courses = await Course.find();
        res.json(courses);
    } catch (error) {
        res.status(500).json({ message: 'Error fetching courses', error });
    }
};

exports.addCourse = async (req, res) => {
    try {
        const { course_id, course_name, credits } = req.body;
        const newCourse = new Course({ course_id, course_name, credits });
        await newCourse.save();
        res.status(201).json(newCourse);
    } catch (error) {
        res.status(500).json({ message: 'Error adding course', error });
    }
};

exports.deleteCourse = async (req, res) => {
    try {
        const { id } = req.params;
        await Course.findByIdAndDelete(id);
        res.json({ message: 'Course deleted' });
    } catch (error) {
        res.status(500).json({ message: 'Error deleting course', error });
    }
};