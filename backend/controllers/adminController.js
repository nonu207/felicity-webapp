const jwt = require('jsonwebtoken');
const bcrypt = require('bcrypt');
const crypto = require('crypto');
const User = require('../models/User');
const Participant = require('../models/Participant');
const Organizer = require('../models/Organizer');
const { sendNewPasswordEmail, sendOrganizerWelcomeEmail } = require('../utils/emailService');
const { createNotification } = require('./notificationController');

// Generate JWT Token
const generateToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET, {
    expiresIn: '30d'
  });
};

// @desc    Create admin (only if no admin exists)
// @route   POST /api/admin/create
// @access  Public (but checks if admin already exists)
const createAdmin = async (req, res) => {
  try {
    const { email, password } = req.body;

    // Validation
    if (!email || !password) {
      return res.status(400).json({ message: 'Please provide email and password' });
    }

    // Check if an admin already exists in the system
    const existingAdmin = await User.findOne({ role: 'admin' });
    if (existingAdmin) {
      return res.status(403).json({
        message: 'Admin already exists. Only one admin is allowed in the system.'
      });
    }

    // Check if email is already used
    const userExists = await User.findOne({ email });
    if (userExists) {
      return res.status(400).json({ message: `This email is already registered as ${userExists.role === 'admin' ? 'an admin' : userExists.role === 'organizer' ? 'an organizer' : 'a participant'}. The same email cannot be used for multiple roles.` });
    }

    // Create admin user
    const admin = await User.create({
      email,
      password,
      role: 'admin',
      isActive: true
    });

    res.status(201).json({
      success: true,
      message: 'Admin created successfully',
      data: {
        id: admin._id,
        email: admin.email,
        role: admin.role,
        token: generateToken(admin._id)
      }
    });
  } catch (error) {
    console.error('Error in createAdmin:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// @desc    Create a new organizer (Admin only) — credentials are auto-generated
// @route   POST /api/admin/organizer/create
// @access  Private (Admin only)
const createOrganizer = async (req, res) => {
  try {
    const { organizerName, organizerDescription, organizerCategory, contactEmail } = req.body;

    if (!organizerName || !organizerDescription || !organizerCategory || !contactEmail) {
      return res.status(400).json({ message: 'organizerName, organizerDescription, organizerCategory and contactEmail are required' });
    }

    // ── Auto-generate login email from club name ──────────────────────────────
    // e.g. "ACM Student Chapter" → "acm-student-chapter@felicity.com"
    const baseSlug = organizerName
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9\s-]/g, '')   // strip special chars
      .replace(/\s+/g, '-')            // spaces → hyphens
      .replace(/-+/g, '-');            // collapse consecutive hyphens

    // Handle collisions: try base slug, then base-1, base-2 …
    let loginEmail;
    let suffix = 0;
    while (true) {
      const candidate = suffix === 0
        ? `${baseSlug}@felicity.com`
        : `${baseSlug}-${suffix}@felicity.com`;
      const taken = await User.findOne({ email: candidate });
      if (!taken) { loginEmail = candidate; break; }
      suffix++;
    }

    // ── Auto-generate password ────────────────────────────────────────────────
    const rawPassword = crypto.randomBytes(9).toString('base64').slice(0, 12);

    // ── Persist ───────────────────────────────────────────────────────────────
    const user = await User.create({
      email: loginEmail,
      password: rawPassword,
      role: 'organizer',
      isActive: true,
    });

    const organizer = await Organizer.create({
      userId: user._id,
      organizerName,
      organizerDescription,
      organizerCategory,
      contactEmail,
    });

    // ── Email credentials to the contact email ────────────────────────────────
    try {
      await sendOrganizerWelcomeEmail(contactEmail, loginEmail, rawPassword, organizerName);
    } catch (emailErr) {
      console.error('Welcome email failed (account still created):', emailErr.message);
    }

    // In-app welcome notification
    await createNotification({
      userId: user._id,
      type: 'organizer_welcome',
      title: 'Welcome to Felicity!',
      message: `Your organizer account "${organizerName}" has been created. Check your contact email (${contactEmail}) for login credentials.`,
    });

    res.status(201).json({
      success: true,
      message: `Organizer account created. Credentials emailed to ${contactEmail}.`,
      data: {
        user: { id: user._id, email: user.email, role: user.role },
        organizer: { id: organizer._id, organizerName: organizer.organizerName, contactEmail: organizer.contactEmail },
      },
    });
  } catch (error) {
    console.error('Error in createOrganizer:', error);
    if (error.code === 11000) {
      return res.status(400).json({ message: 'That contact email is already in use by another organizer' });
    }
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// @desc    Approve/Reject organizer
// @route   PATCH /api/admin/organizer/:id/approve
// @access  Private (Admin only)
const approveOrganizer = async (req, res) => {
  try {
    const { id } = req.params;
    const { approve } = req.body; // true for approve, false for reject

    const organizer = await Organizer.findById(id);
    if (!organizer) {
      return res.status(404).json({ message: 'Organizer not found' });
    }

    // Update the user's isActive status
    const user = await User.findById(organizer.userId);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    user.isActive = approve;
    await user.save();

    res.status(200).json({
      success: true,
      message: approve ? 'Organizer approved successfully' : 'Organizer rejected',
      data: {
        organizerId: organizer._id,
        userId: user._id,
        isActive: user.isActive
      }
    });
  } catch (error) {
    console.error('Error in approveOrganizer:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// @desc    Get all organizers
// @route   GET /api/admin/organizers
// @access  Private (Admin only)
const getAllOrganizers = async (req, res) => {
  try {
    const organizers = await Organizer.find().populate('userId', 'email isActive');

    // Also find orphaned users (role=organizer but no Organizer profile doc)
    const orgUserIds = organizers.map(o => o.userId?._id || o.userId).filter(Boolean);
    const orphanedUsers = await User.find({
      role: 'organizer',
      _id: { $nin: orgUserIds },
    }).select('email isActive createdAt');

    res.status(200).json({
      success: true,
      count: organizers.length,
      data: organizers,
      orphanedUsers: orphanedUsers, // Users with role=organizer but no Organizer profile
    });
  } catch (error) {
    console.error('Error in getAllOrganizers:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// @desc    Get all participants
// @route   GET /api/admin/participants
// @access  Private (Admin only)
const getAllParticipants = async (req, res) => {
  try {
    const participants = await Participant.find().populate('userId', 'email isActive');

    res.status(200).json({
      success: true,
      count: participants.length,
      data: participants
    });
  } catch (error) {
    console.error('Error in getAllParticipants:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// @desc    Delete user (and associated profile)
// @route   DELETE /api/admin/user/:id
// @access  Private (Admin only)
const deleteUser = async (req, res) => {
  try {
    const { id } = req.params;

    const user = await User.findById(id);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Only allow deleting organizers
    if (user.role === 'admin') {
      return res.status(403).json({ message: 'Cannot delete admin user' });
    }
    if (user.role === 'participant') {
      return res.status(403).json({ message: 'Participants cannot be deleted. You can deactivate them instead.' });
    }

    // Delete associated organizer profile
    if (user.role === 'organizer') {
      await Organizer.deleteOne({ userId: id });
    }

    // Delete user
    await User.findByIdAndDelete(id);

    res.status(200).json({
      success: true,
      message: 'User deleted successfully'
    });
  } catch (error) {
    console.error('Error in deleteUser:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};
// @desc    Reset user password — auto-generates password and emails it (Admin only)
// @route   PATCH /api/admin/user/:id/reset-password
// @access  Private (Admin only)
const resetUserPassword = async (req, res) => {
  try {
    const { id } = req.params;
    const user = await User.findById(id);
    if (!user) return res.status(404).json({ message: 'User not found' });

    const newPassword = crypto.randomBytes(9).toString('base64').replace(/[^a-zA-Z0-9]/g, '').slice(0, 12)
      + crypto.randomInt(10, 99);

    let recipientName = '';
    let emailTo = user.email;

    if (user.role === 'organizer') {
      const organizer = await Organizer.findOne({ userId: user._id });
      if (!organizer || !organizer.contactEmail) {
        return res.status(400).json({ message: 'Organizer profile or contact email not found. Cannot send password.' });
      }
      recipientName = organizer.organizerName;
      emailTo = organizer.contactEmail;
    } else if (user.role === 'participant') {
      const participant = await Participant.findOne({ userId: user._id });
      if (participant) recipientName = participant.firstName;
    }

    user.password = newPassword;
    await user.save();
    await sendNewPasswordEmail(emailTo, newPassword, recipientName);

    // In-app notification
    await createNotification({
      userId: user._id,
      type: 'password_reset_approved',
      title: 'Password Reset',
      message: `Your password has been reset by the admin. A new password was sent to ${emailTo}.`,
    });

    res.status(200).json({ success: true, message: `Password reset successfully. New password has been sent to ${emailTo}.` });
  } catch (error) {
    console.error('Error in resetUserPassword:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// @desc    Get organizers with a pending password reset request
// @route   GET /api/admin/password-reset-requests
// @access  Admin
const getPendingPasswordResets = async (req, res) => {
  try {
    const users = await User.find({ role: 'organizer', passwordResetRequested: true })
      .select('_id email passwordResetReason passwordResetRequestedAt');
    const results = await Promise.all(users.map(async (u) => {
      const organizer = await Organizer.findOne({ userId: u._id }).select('organizerName organizerCategory contactEmail');
      return {
        userId: u._id,
        email: u.email,
        reason: u.passwordResetReason || '',
        requestedAt: u.passwordResetRequestedAt || u.updatedAt,
        organizer,
      };
    }));
    res.status(200).json({ success: true, data: results });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// @desc    Approve an organizer's password reset request
// @route   PATCH /api/admin/password-reset-requests/:userId/approve
// @access  Admin
const approvePasswordReset = async (req, res) => {
  try {
    const { comment } = req.body || {};
    const user = await User.findById(req.params.userId);
    if (!user || user.role !== 'organizer') return res.status(404).json({ message: 'Organizer not found' });

    const organizer = await Organizer.findOne({ userId: user._id });

    const newPassword = crypto.randomBytes(9).toString('base64').replace(/[^a-zA-Z0-9]/g, '').slice(0, 12)
      + crypto.randomInt(10, 99);

    user.password = newPassword;
    user.passwordResetRequested = false;
    user.passwordResetReason = null;
    user.passwordResetRequestedAt = null;
    await user.save();

    // Email new password to organizer's contact email
    const emailTo = organizer?.contactEmail;
    if (emailTo) {
      try {
        await sendNewPasswordEmail(emailTo, newPassword, organizer.organizerName || '');
      } catch (emailErr) {
        console.error('Failed to email new password:', emailErr.message);
      }
    }

    // In-app notification to organizer
    const notifMessage = comment
      ? `Your password reset request has been approved. Admin comment: ${comment}. A new password was sent to ${emailTo || 'your contact email'}.`
      : `Your password reset request has been approved. A new password was sent to ${emailTo || 'your contact email'}.`;

    await createNotification({
      userId: user._id,
      type: 'password_reset_approved',
      title: 'Password Reset Approved',
      message: notifMessage,
    });

    // Return new password to admin (admin shares it with organizer manually)
    res.status(200).json({
      success: true,
      message: 'Password reset successfully.',
      data: {
        organizerName: organizer?.organizerName || user.email,
        newPassword,
        loginEmail: user.email,
      },
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// @desc    Reject an organizer's password reset request
// @route   PATCH /api/admin/password-reset-requests/:userId/reject
// @access  Admin
const rejectPasswordReset = async (req, res) => {
  try {
    const { reason, comment } = req.body || {};
    const rejectMsg = comment || reason; // support both field names
    const user = await User.findById(req.params.userId);
    if (!user || user.role !== 'organizer') return res.status(404).json({ message: 'Organizer not found' });

    user.passwordResetRequested = false;
    user.passwordResetReason = null;
    user.passwordResetRequestedAt = null;
    await user.save();

    const organizer = await Organizer.findOne({ userId: user._id });

    // In-app notification
    await createNotification({
      userId: user._id,
      type: 'password_reset_rejected',
      title: 'Password Reset Rejected',
      message: rejectMsg
        ? `Your password reset request was rejected by the admin. Reason: ${rejectMsg}`
        : 'Your password reset request was rejected by the admin. Please contact the admin if you need further assistance.',
    });

    res.status(200).json({ success: true, message: `Password reset request for ${organizer?.organizerName || user.email} has been rejected.` });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};


// @desc    Toggle any user's active status
// @route   PATCH /api/admin/user/:id/toggle-active
// @access  Private (Admin only)
const toggleUserActive = async (req, res) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ message: 'User not found' });
    if (user.role === 'admin') return res.status(403).json({ message: 'Cannot deactivate admin account' });

    user.isActive = !user.isActive;
    await user.save();

    res.json({
      success: true,
      message: `User ${user.isActive ? 'activated' : 'deactivated'} successfully`,
      data: { userId: user._id, isActive: user.isActive }
    });
  } catch (error) {
    console.error('Error in toggleUserActive:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};


module.exports = {
  createAdmin,
  createOrganizer,
  approveOrganizer,
  getAllOrganizers,
  getAllParticipants,
  deleteUser,
  toggleUserActive,
  resetUserPassword,
  getPendingPasswordResets,
  approvePasswordReset,
  rejectPasswordReset,
};
