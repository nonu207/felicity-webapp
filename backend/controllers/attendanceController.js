/**
 * Attendance Controller
 * ──────────────────────────────────────────────────────────────────────
 * QR-based attendance tracking for organizers.
 *
 *  POST /api/attendance/:eventId/scan          – scan a QR / ticket ID
 *  POST /api/attendance/:eventId/manual        – manual override
 *  GET  /api/attendance/:eventId/dashboard      – live attendance stats
 *  GET  /api/attendance/:eventId/export-csv     – CSV export
 *  PATCH /api/attendance/:eventId/unmark/:regId – undo attendance
 */

const Registration = require('../models/Registration');
const Event = require('../models/Event');
const Organizer = require('../models/Organizer');
const Participant = require('../models/Participant');

// ── Helper: verify the organizer owns the event ──────────────────────────────
const verifyOwnership = async (userId, eventId) => {
  const organizer = await Organizer.findOne({ userId });
  if (!organizer) return { error: 'Organizer profile not found', status: 404 };

  const event = await Event.findById(eventId);
  if (!event) return { error: 'Event not found', status: 404 };

  if (String(event.organizerId) !== String(organizer._id))
    return { error: 'Not your event', status: 403 };

  if (!['Published', 'Ongoing', 'Closed', 'Completed'].includes(event.status))
    return { error: 'Attendance cannot be tracked for Draft events', status: 400 };

  return { organizer, event };
};

// ─────────────────────────────────────────────────────────────────────────────
// @desc   Scan QR code / ticket ID to mark attendance
// @route  POST /api/attendance/:eventId/scan
// @body   { qrData } — JSON string from QR or plain ticketId
// @access Organizer (event owner)
// ─────────────────────────────────────────────────────────────────────────────
const scanAttendance = async (req, res) => {
  try {
    const check = await verifyOwnership(req.user._id, req.params.eventId);
    if (check.error) return res.status(check.status).json({ message: check.error });

    const { event } = check;
    let { qrData } = req.body;
    if (!qrData || !qrData.trim()) {
      return res.status(400).json({ message: 'qrData is required (QR content or ticket ID)' });
    }

    qrData = qrData.trim();

    // Accept either raw ticketId string or the JSON payload from the QR code
    let ticketId = qrData;
    try {
      const parsed = JSON.parse(qrData);
      if (parsed.ticketId) ticketId = parsed.ticketId;
      // Optionally validate eventId from QR matches this event
      if (parsed.eventId && String(parsed.eventId) !== String(event._id)) {
        return res.status(400).json({
          message: 'This QR code belongs to a different event',
          scanResult: 'wrong_event',
        });
      }
    } catch (_) {
      // not JSON — treat as plain ticketId
    }

    // Look up the registration
    const registration = await Registration.findOne({
      ticketId,
      eventId: event._id,
      status: 'Active',
    }).populate({
      path: 'participantId',
      populate: { path: 'userId', select: 'email' },
      select: 'firstName lastName contactNumber participantType userId',
    });

    if (!registration) {
      return res.status(404).json({
        message: 'No active registration found for this ticket / event',
        scanResult: 'not_found',
      });
    }

    // Check payment status — don't allow attendance for unpaid registrations
    if (['PendingApproval', 'Rejected'].includes(registration.paymentStatus)) {
      return res.status(400).json({
        message: `Cannot mark attendance — payment status is ${registration.paymentStatus}`,
        scanResult: 'payment_pending',
      });
    }

    // Duplicate check
    if (registration.attendanceMarked) {
      return res.status(409).json({
        message: `Already scanned at ${registration.attendanceTimestamp.toLocaleString()}`,
        scanResult: 'duplicate',
        registration: formatRegForResponse(registration),
      });
    }

    // Mark attendance
    registration.attendanceMarked = true;
    registration.attendanceTimestamp = new Date();
    await registration.save();

    res.json({
      success: true,
      scanResult: 'success',
      message: `Attendance marked for ${registration.participantId?.firstName || ''} ${registration.participantId?.lastName || ''}`,
      registration: formatRegForResponse(registration),
    });
  } catch (err) {
    console.error('scanAttendance:', err);
    res.status(500).json({ message: 'Server error', error: err.message });
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// @desc   Manual attendance override with audit log
// @route  POST /api/attendance/:eventId/manual
// @body   { registrationId, action, reason }
//         action: 'mark' or 'unmark'
// @access Organizer (event owner)
// ─────────────────────────────────────────────────────────────────────────────
const manualOverride = async (req, res) => {
  try {
    const check = await verifyOwnership(req.user._id, req.params.eventId);
    if (check.error) return res.status(check.status).json({ message: check.error });

    const { registrationId, action, reason } = req.body;
    if (!registrationId) return res.status(400).json({ message: 'registrationId is required' });
    if (!['mark', 'unmark'].includes(action)) return res.status(400).json({ message: 'action must be "mark" or "unmark"' });
    if (!reason || !reason.trim()) return res.status(400).json({ message: 'reason is required for manual override' });

    const registration = await Registration.findOne({
      _id: registrationId,
      eventId: req.params.eventId,
      status: 'Active',
    }).populate({
      path: 'participantId',
      populate: { path: 'userId', select: 'email' },
      select: 'firstName lastName contactNumber participantType userId',
    });

    if (!registration) {
      return res.status(404).json({ message: 'Registration not found for this event' });
    }

    if (action === 'mark') {
      registration.attendanceMarked = true;
      registration.attendanceTimestamp = new Date();
    } else {
      registration.attendanceMarked = false;
      registration.attendanceTimestamp = null;
    }

    // Audit log
    registration.attendanceOverride = {
      overriddenBy: req.user._id,
      reason: reason.trim(),
    };

    await registration.save();

    res.json({
      success: true,
      message: `Attendance ${action === 'mark' ? 'marked' : 'unmarked'} (manual override)`,
      registration: formatRegForResponse(registration),
    });
  } catch (err) {
    console.error('manualOverride:', err);
    res.status(500).json({ message: 'Server error', error: err.message });
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// @desc   Live attendance dashboard data
// @route  GET /api/attendance/:eventId/dashboard
// @access Organizer (event owner)
// ─────────────────────────────────────────────────────────────────────────────
const getAttendanceDashboard = async (req, res) => {
  try {
    const check = await verifyOwnership(req.user._id, req.params.eventId);
    if (check.error) return res.status(check.status).json({ message: check.error });

    const { event } = check;

    const registrations = await Registration.find({
      eventId: event._id,
      status: 'Active',
    }).populate({
      path: 'participantId',
      populate: { path: 'userId', select: 'email' },
      select: 'firstName lastName contactNumber participantType collegeName userId',
    }).sort({ attendanceMarked: -1, attendanceTimestamp: -1, createdAt: 1 }).lean();

    const scanned = registrations.filter(r => r.attendanceMarked);
    const notScanned = registrations.filter(r => !r.attendanceMarked);

    res.json({
      success: true,
      event: {
        _id: event._id,
        eventName: event.eventName,
        status: event.status,
        startDate: event.startDate,
        endDate: event.endDate,
      },
      summary: {
        totalRegistrations: registrations.length,
        scannedCount: scanned.length,
        notScannedCount: notScanned.length,
        attendanceRate: registrations.length > 0
          ? Math.round((scanned.length / registrations.length) * 100)
          : 0,
      },
      scanned: scanned.map(formatRegForResponse),
      notScanned: notScanned.map(formatRegForResponse),
    });
  } catch (err) {
    console.error('getAttendanceDashboard:', err);
    res.status(500).json({ message: 'Server error', error: err.message });
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// @desc   Export attendance report as CSV
// @route  GET /api/attendance/:eventId/export-csv
// @access Organizer (event owner)
// ─────────────────────────────────────────────────────────────────────────────
const exportAttendanceCSV = async (req, res) => {
  try {
    const check = await verifyOwnership(req.user._id, req.params.eventId);
    if (check.error) return res.status(check.status).json({ message: check.error });

    const { event } = check;

    const registrations = await Registration.find({
      eventId: event._id,
      status: 'Active',
    }).populate({
      path: 'participantId',
      populate: { path: 'userId', select: 'email' },
      select: 'firstName lastName contactNumber participantType collegeName userId',
    }).populate({
      path: 'attendanceOverride.overriddenBy',
      select: 'email',
    }).sort({ createdAt: 1 }).lean();

    // CSV header
    const headers = [
      'Ticket ID',
      'First Name',
      'Last Name',
      'Email',
      'Contact',
      'College',
      'Type',
      'Registration Date',
      'Payment Status',
      'Attendance Marked',
      'Attendance Time',
      'Manual Override',
      'Override Reason',
      'Override By',
    ];

    const escapeCSV = (val) => {
      if (val == null) return '';
      const s = String(val);
      if (s.includes(',') || s.includes('"') || s.includes('\n')) {
        return '"' + s.replace(/"/g, '""') + '"';
      }
      return s;
    };

    const rows = registrations.map(r => {
      const p = r.participantId || {};
      return [
        r.ticketId,
        p.firstName || '',
        p.lastName || '',
        p.userId?.email || '',
        p.contactNumber || '',
        p.collegeName || '',
        p.participantType || '',
        r.createdAt ? new Date(r.createdAt).toISOString() : '',
        r.paymentStatus,
        r.attendanceMarked ? 'Yes' : 'No',
        r.attendanceTimestamp ? new Date(r.attendanceTimestamp).toISOString() : '',
        r.attendanceOverride?.overriddenBy ? 'Yes' : 'No',
        r.attendanceOverride?.reason || '',
        r.attendanceOverride?.overriddenBy?.email || '',
      ].map(escapeCSV).join(',');
    });

    const csv = [headers.join(','), ...rows].join('\n');
    const filename = `attendance_${event.eventName.replace(/[^a-zA-Z0-9]/g, '_')}_${new Date().toISOString().slice(0, 10)}.csv`;

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.send(csv);
  } catch (err) {
    console.error('exportAttendanceCSV:', err);
    res.status(500).json({ message: 'Server error', error: err.message });
  }
};

// ── Helper: format registration for API response ──────────────────────────────
function formatRegForResponse(r) {
  const p = r.participantId || {};
  return {
    _id: r._id,
    ticketId: r.ticketId,
    paymentStatus: r.paymentStatus,
    registrationType: r.registrationType,
    attendanceMarked: r.attendanceMarked,
    attendanceTimestamp: r.attendanceTimestamp,
    createdAt: r.createdAt,
    attendanceOverride: r.attendanceOverride?.overriddenBy ? {
      reason: r.attendanceOverride.reason,
      overriddenBy: r.attendanceOverride.overriddenBy?.email || r.attendanceOverride.overriddenBy,
    } : null,
    participant: {
      _id: p._id,
      firstName: p.firstName || '',
      lastName: p.lastName || '',
      email: p.userId?.email || '',
      contactNumber: p.contactNumber || '',
      participantType: p.participantType || '',
      collegeName: p.collegeName || '',
    },
  };
}

module.exports = {
  scanAttendance,
  manualOverride,
  getAttendanceDashboard,
  exportAttendanceCSV,
};
