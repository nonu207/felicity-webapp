const express = require('express');
const router = express.Router();
const { protect, optionalProtect } = require('../middleware/authMiddleware');
const roleMiddleware = require('../middleware/roleMiddleware');
const {
  createEvent,
  getMyEvents,
  getEventById,
  getEvents,
  updateEvent,
  publishEvent,
  closeEvent,
  completeEvent,
  deleteEvent,
  getEventRegistrations,
} = require('../controllers/eventController');

// Public — optionalProtect decodes the token when present so followed-clubs filter works
router.get('/', optionalProtect, getEvents);

// Organizer-only static routes — must be BEFORE /:id to avoid "organizer" being parsed as an id
router.get('/organizer/my', protect, roleMiddleware(['organizer']), getMyEvents);
router.post('/', protect, roleMiddleware(['organizer']), createEvent);

// Dynamic :id routes
router.get('/:id', getEventById);
router.patch('/:id', protect, roleMiddleware(['organizer']), updateEvent);
router.patch('/:id/publish', protect, roleMiddleware(['organizer']), publishEvent);
router.patch('/:id/close', protect, roleMiddleware(['organizer']), closeEvent);
router.patch('/:id/complete', protect, roleMiddleware(['organizer']), completeEvent);
router.delete('/:id', protect, roleMiddleware(['organizer']), deleteEvent);
router.get('/:id/registrations', protect, roleMiddleware(['organizer']), getEventRegistrations);

module.exports = router;
