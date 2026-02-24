const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/authMiddleware');
const roleMiddleware = require('../middleware/roleMiddleware');
const {
  scanAttendance,
  manualOverride,
  getAttendanceDashboard,
  exportAttendanceCSV,
} = require('../controllers/attendanceController');

const organizerOnly = [protect, roleMiddleware(['organizer'])];

// Scan QR / ticketId
router.post('/:eventId/scan', ...organizerOnly, scanAttendance);

// Manual override (mark/unmark with audit log)
router.post('/:eventId/manual', ...organizerOnly, manualOverride);

// Live attendance dashboard
router.get('/:eventId/dashboard', ...organizerOnly, getAttendanceDashboard);

// Export CSV
router.get('/:eventId/export-csv', ...organizerOnly, exportAttendanceCSV);

module.exports = router;
