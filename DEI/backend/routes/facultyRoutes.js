// filepath: /c:/Users/anish/Desktop/DEI/backend/routes/facultyRoutes.js
const express = require('express');
const router = express.Router();
const { createFaculty, getAllFaculty, updateFaculty, deleteFaculty } = require('../controllers/facultyController');

router.post('/', createFaculty);
router.get('/', getAllFaculty);
router.put('/:id', updateFaculty);
router.delete('/:id', deleteFaculty);

module.exports = router;