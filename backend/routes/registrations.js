const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/authMiddleware');
const roleMiddleware = require('../middleware/roleMiddleware');
const { uploadPaymentProof } = require('../middleware/upload');
const {
  registerForEvent,
  getMyRegistrations,
  getTicket,
  cancelRegistration,
  checkRegistration,
  uploadPaymentProofCtrl,
  getOrdersForEvent,
  approvePayment,
  rejectPayment,
} = require('../controllers/registrationController');

const participantOnly = [protect, roleMiddleware(['participant'])];
const organizerOnly   = [protect, roleMiddleware(['organizer'])];
const authenticated   = [protect];

// Register for an event
router.post('/', ...participantOnly, registerForEvent);

// Get my registrations
router.get('/my', ...participantOnly, getMyRegistrations);

// Check if already registered for a specific event
router.get('/check/:eventId', ...participantOnly, checkRegistration);

// Get ticket by ticketId (owner or organizer)
router.get('/ticket/:ticketId', ...authenticated, getTicket);

// Cancel a registration
router.patch('/:id/cancel', ...participantOnly, cancelRegistration);

// Upload payment proof (participant)
router.post('/:id/payment-proof', ...participantOnly, uploadPaymentProof, uploadPaymentProofCtrl);

// Get all orders for an event (organizer)
router.get('/event/:eventId/orders', ...organizerOnly, getOrdersForEvent);

// Approve payment (organizer)
router.patch('/:id/approve-payment', ...organizerOnly, approvePayment);

// Reject payment (organizer)
router.patch('/:id/reject-payment', ...organizerOnly, rejectPayment);

module.exports = router;
