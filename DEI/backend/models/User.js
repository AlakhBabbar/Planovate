// filepath: /c:/Users/anish/Desktop/DEI/backend/Models/User.js
const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  username: { type: String, required: true, unique: false },
  password: { type: String, required: true },
  role: { type: String, enum: ['admin', 'faculty', 'student'], required: false },
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true },
});

module.exports = mongoose.model('User', userSchema);