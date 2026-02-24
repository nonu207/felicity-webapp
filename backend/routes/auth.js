const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/authMiddleware');
const { verifyCaptcha } = require('../middleware/captcha');
const {
  registerParticipant,
  registerOrganizer,
  loginUser,
  getMe,
  changePassword,
  forgotPassword,
  resetPassword
} = require('../controllers/authController');

// Public routes
router.post('/register/participant', verifyCaptcha, registerParticipant);
router.post('/register/organizer', verifyCaptcha, registerOrganizer);
router.post('/login', verifyCaptcha, loginUser);
router.post('/forgot-password', forgotPassword);
router.post('/reset-password/:token', resetPassword);

// Protected routes
router.get('/me', protect, getMe);
router.patch('/change-password', protect, changePassword);

module.exports = router;

