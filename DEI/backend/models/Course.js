const mongoose = require('mongoose');

const courseSchema = new mongoose.Schema({
    course_id: { type: String, required: true, unique: true },
    course_name: { type: String, required: true },
    credits: { type: Number, required: true },
});

module.exports = mongoose.model('Course', courseSchema);
