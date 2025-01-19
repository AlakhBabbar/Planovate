// filepath: /c:/Users/anish/Desktop/DEI/backend/controllers/facultyController.js
const Faculty = require('../models/Faculty');

exports.createFaculty = async (req, res) => {
  try {
    const { faculty_id, name, email, department } = req.body;
    const faculty = new Faculty({ faculty_id, department, Faculty_Name: name, Faculty_Email: email });
    await faculty.save();
    res.status(201).json(faculty);
  } catch (error) {
    res.status(500).json({ message: 'Error creating faculty', error });
  }
};

exports.getAllFaculty = async (req, res) => {
  try {
    const faculty = await Faculty.find();
    res.json(faculty);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching faculty', error });
  }
};

exports.updateFaculty = async (req, res) => {
  try {
    const { id } = req.params;
    const { faculty_id, department } = req.body;
    const faculty = await Faculty.findByIdAndUpdate(id, { faculty_id, department }, { new: true });
    res.json(faculty);
  } catch (error) {
    res.status(500).json({ message: 'Error updating faculty', error });
  }
};

exports.deleteFaculty = async (req, res) => {
  try {
    const { id } = req.params;
    await Faculty.findByIdAndDelete(id);
    res.json({ message: 'Faculty deleted' });
  } catch (error) {
    res.status(500).json({ message: 'Error deleting faculty', error });
  }
};