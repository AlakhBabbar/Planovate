// filepath: /c:/Users/anish/Desktop/DEI/backend/models/Timetable.js
const mongoose = require('mongoose');

const timetableSchema = new mongoose.Schema({
  day: { type: String, required: true },
  time: { type: String, required: true },
  course_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Course', required: true },
  faculty_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Faculty', required: true },
  room_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Room', required: true },
});

module.exports = mongoose.model('Timetable', timetableSchema);