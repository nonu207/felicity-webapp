const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/authMiddleware');
const roleMiddleware = require('../middleware/roleMiddleware');
const {
  createAdmin,
  approveOrganizer,
  getAllOrganizers,
  getAllParticipants,
  deleteUser,
  createOrganizer
} = require('../controllers/adminController');

// Public route - create admin (only if none exists)
router.post('/create', createAdmin);

const { resetUserPassword } = require('../controllers/adminController');
router.patch('/user/:id/reset-password', protect, roleMiddleware(['admin']), resetUserPassword);

// Protected admin routes
router.post('/organizer/create', protect, roleMiddleware(['admin']), createOrganizer);
router.patch('/organizer/:id/approve', protect, roleMiddleware(['admin']), approveOrganizer);
router.get('/organizers', protect, roleMiddleware(['admin']), getAllOrganizers);
router.get('/participants', protect, roleMiddleware(['admin']), getAllParticipants);
router.delete('/user/:id', protect, roleMiddleware(['admin']), deleteUser);

module.exports = router;