const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/authMiddleware');
const {
  registerParticipant,
  registerOrganizer,
  loginUser,
  loginUser,
  getMe,
  changePassword
} = require('../controllers/authController');

// Public routes
router.post('/register/participant', registerParticipant);
router.post('/register/organizer', registerOrganizer);
router.post('/login', loginUser);

// Protected routes
router.get('/me', protect, getMe);
router.patch('/change-password', protect, changePassword);

module.exports = router;

