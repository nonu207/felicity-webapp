const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/authMiddleware');
const roleMiddleware = require('../middleware/roleMiddleware');
const {
    completeOnboarding,
    getProfile,
    updateProfile,
    followOrganizer,
    unfollowOrganizer,
    getAllOrganizers,
    getOrganizerDetail
} = require('../controllers/participantController');

const participantOnly = [protect, roleMiddleware(['participant'])];

// Onboarding — called right after signup
router.patch('/onboarding', ...participantOnly, completeOnboarding);

// Profile
router.get('/profile', ...participantOnly, getProfile);
router.patch('/profile', ...participantOnly, updateProfile);

// Follow / Unfollow organizers
router.post('/follow/:organizerId', ...participantOnly, followOrganizer);
router.delete('/follow/:organizerId', ...participantOnly, unfollowOrganizer);

// Clubs / Organizers listing (Participant view)
router.get('/organizers', protect, getAllOrganizers);
router.get('/organizers/:id', protect, getOrganizerDetail);

module.exports = router;
