// filepath: /c:/Users/anish/Desktop/DEI/backend/models/Faculty.js
const mongoose = require('mongoose');

const facultySchema = new mongoose.Schema({
  faculty_id: { type: String, required: true, unique: true },
  department: { type: String, required: true },
  Faculty_Name: { type: String, required: true },
  Faculty_Email: { type: String, required: true, unique: true },
});

module.exports = mongoose.model('Faculty', facultySchema);