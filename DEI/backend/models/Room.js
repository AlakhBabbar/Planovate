// filepath: /c:/Users/anish/Desktop/DEI/backend/models/Room.js
const mongoose = require('mongoose');

const roomSchema = new mongoose.Schema({
  room: { type: String, required: true },
  building: { type: String, required: true },
  capacity: { type: Number, required: true },
});

module.exports = mongoose.model('Room', roomSchema);