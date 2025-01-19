// filepath: /c:/Users/anish/Desktop/DEI/backend/controllers/timetableController.js
const Timetable = require('../models/Timetable');

exports.createTimetableEntry = async (req, res) => {
  try {
    const timetable = new Timetable(req.body);
    await timetable.save();
    res.status(201).json(timetable);
  } catch (error) {
    res.status(500).json({ message: 'Error creating timetable entry' });
  }
};

exports.getAllTimetableEntries = async (req, res) => {
  try {
    const timetable = await Timetable.find()
      .populate('course_id', 'course_name')
      .populate('faculty_id', 'Faculty_Name')
      .populate('room_id', 'room');
    res.json(timetable);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching timetable' });
  }
};

exports.updateTimetableEntry = async (req, res) => {
  try {
    const timetable = await Timetable.findByIdAndUpdate(req.params.id, req.body, { new: true });
    res.json(timetable);
  } catch (error) {
    res.status(500).json({ message: 'Error updating timetable entry' });
  }
};

exports.deleteTimetableEntry = async (req, res) => {
  try {
    await Timetable.findByIdAndDelete(req.params.id);
    res.json({ message: 'Timetable entry deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Error deleting timetable entry' });
  }
};