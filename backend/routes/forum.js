const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/authMiddleware');
const {
    getMessages,
    postMessage,
    deleteMessage,
    togglePin,
    voteMessage,
    checkAccess,
} = require('../controllers/forumController');

// All forum routes require authentication
router.use(protect);

// Check forum access
router.get('/:eventId/access', checkAccess);

// Get messages (threaded tree)
router.get('/:eventId/messages', getMessages);

// Post a new message
router.post('/:eventId/messages', postMessage);

// Delete a message (soft delete)
router.delete('/:eventId/messages/:messageId', deleteMessage);

// Pin/unpin a message
router.patch('/:eventId/messages/:messageId/pin', togglePin);

// Vote on a message (upvote/downvote)
router.post('/:eventId/messages/:messageId/vote', voteMessage);

module.exports = router;
