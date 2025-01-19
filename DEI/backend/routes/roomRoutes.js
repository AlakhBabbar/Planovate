// filepath: /c:/Users/anish/Desktop/DEI/backend/routes/roomRoutes.js
const express = require('express');
const router = express.Router();
const { getAllRooms, addRoom, deleteRoom } = require('../controllers/roomController');

router.get('/', getAllRooms);
router.post('/', addRoom);
router.delete('/:id', deleteRoom);

module.exports = router;