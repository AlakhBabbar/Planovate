// filepath: /c:/Users/anish/Desktop/DEI/backend/routes/courseRoutes.js
const express = require('express');
const router = express.Router();
const { getAllCourses, addCourse, deleteCourse } = require('../controllers/courseController');

router.get('/', getAllCourses);
router.post('/', addCourse);
router.delete('/:id', deleteCourse);

module.exports = router;