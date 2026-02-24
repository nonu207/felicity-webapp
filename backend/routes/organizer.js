const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/authMiddleware');
const roleMiddleware = require('../middleware/roleMiddleware');
const { getProfile, updateProfile, requestPasswordReset, testWebhook } = require('../controllers/organizerController');

// All routes require a valid JWT + organizer role
router.get('/profile', protect, roleMiddleware(['organizer']), getProfile);
router.patch('/profile', protect, roleMiddleware(['organizer']), updateProfile);
router.post('/request-password-reset', protect, roleMiddleware(['organizer']), requestPasswordReset);
router.post('/test-webhook', protect, roleMiddleware(['organizer']), testWebhook);

module.exports = router;
