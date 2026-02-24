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
  toggleUserActive,
  createOrganizer,
  resetUserPassword,
  getPendingPasswordResets,
  approvePasswordReset,
  rejectPasswordReset,
} = require('../controllers/adminController');

// Public — create initial admin
router.post('/create', createAdmin);

// All routes below require admin JWT
router.use(protect, roleMiddleware(['admin']));

router.get('/organizers', getAllOrganizers);
router.get('/participants', getAllParticipants);
router.patch('/organizer/:id/approve', approveOrganizer);
router.delete('/user/:id', deleteUser);
router.patch('/user/:id/toggle-active', toggleUserActive);
router.post('/organizer/create', createOrganizer);
router.patch('/user/:id/reset-password', resetUserPassword);
router.get('/password-reset-requests', getPendingPasswordResets);
router.patch('/password-reset-requests/:userId/approve', approvePasswordReset);
router.patch('/password-reset-requests/:userId/reject', rejectPasswordReset);

module.exports = router;