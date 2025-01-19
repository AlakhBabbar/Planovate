// filepath: /c:/Users/anish/Desktop/DEI/backend/routes/timetableRoutes.js
const express = require('express');
const router = express.Router();
const { createTimetableEntry, getAllTimetableEntries, updateTimetableEntry, deleteTimetableEntry } = require('../controllers/timetableController');

router.post('/', createTimetableEntry);
router.get('/', getAllTimetableEntries);
router.put('/:id', updateTimetableEntry);
router.delete('/:id', deleteTimetableEntry);

module.exports = router;