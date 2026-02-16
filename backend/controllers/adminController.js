const jwt = require('jsonwebtoken');
const bcrypt = require('bcrypt');
const User = require('../models/User');
const Participant = require('../models/Participant');
const Organizer = require('../models/Organizer');

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
      return res.status(400).json({ message: 'Email already registered' });
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

// @desc    Create a new organizer (Admin only)
// @route   POST /api/admin/organizer/create
// @access  Private (Admin only)
const createOrganizer = async (req, res) => {
  try {
    const {
      email,
      password,
      organizerName,
      organizerDescription,
      organizerCategory,
      contactEmail
    } = req.body;

    // Validation
    if (!email || !password || !organizerName || !organizerDescription || !organizerCategory || !contactEmail) {
      return res.status(400).json({ message: 'Please provide all required fields' });
    }

    // Check if user email already exists
    const userExists = await User.findOne({ email });
    if (userExists) {
      return res.status(400).json({ message: 'User already exists with this email' });
    }

    // Check if organizer contact email already exists (unique constraint)
    const organizerExists = await Organizer.findOne({ contactEmail });
    if (organizerExists) {
      return res.status(400).json({ message: 'Organizer with this contact email already exists' });
    }

    // Create User
    const user = await User.create({
      email,
      password,
      role: 'organizer',
      isActive: true // Admin created, so active by default
    });

    // Create Organizer profile
    const organizer = await Organizer.create({
      userId: user._id,
      organizerName,
      organizerDescription,
      organizerCategory,
      contactEmail
    });

    res.status(201).json({
      success: true,
      message: 'Organizer created successfully',
      data: {
        user: {
          id: user._id,
          email: user.email,
          role: user.role
        },
        organizer: {
          id: organizer._id,
          organizerName: organizer.organizerName,
          contactEmail: organizer.contactEmail
        }
      }
    });
  } catch (error) {
    console.error('Error in createOrganizer:', error);
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

    res.status(200).json({
      success: true,
      count: organizers.length,
      data: organizers
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

    // Don't allow deleting admin
    if (user.role === 'admin') {
      return res.status(403).json({ message: 'Cannot delete admin user' });
    }

    // Delete associated profile
    if (user.role === 'participant') {
      await Participant.deleteOne({ userId: id });
    } else if (user.role === 'organizer') {
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
// @desc    Reset user password (Admin only)
// @route   PATCH /api/admin/user/:id/reset-password
// @access  Private (Admin only)
const resetUserPassword = async (req, res) => {
  try {
    const { id } = req.params;
    const { newPassword } = req.body;

    if (!newPassword || newPassword.length < 6) {
      return res.status(400).json({ message: 'Password must be at least 6 characters' });
    }

    const user = await User.findById(id);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Update password (pre-save hook will hash it)
    user.password = newPassword;
    await user.save();

    res.status(200).json({
      success: true,
      message: 'Password reset successfully'
    });
  } catch (error) {
    console.error('Error in resetUserPassword:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};
// @desc    Change current user password
// @route   PATCH /api/auth/change-password
// @access  Private
const changePassword = async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;

    if (!currentPassword || !newPassword) {
      return res.status(400).json({ message: 'Please provide current and new password' });
    }

    if (newPassword.length < 6) {
      return res.status(400).json({ message: 'New password must be at least 6 characters' });
    }

    // Get user (req.user is set by authMiddleware)
    const user = await User.findById(req.user._id);

    // Verify current password
    const isMatch = await user.comparePassword(currentPassword);
    if (!isMatch) {
      return res.status(401).json({ message: 'Invalid current password' });
    }

    // Update password
    user.password = newPassword;
    await user.save();

    res.status(200).json({
      success: true,
      message: 'Password updated successfully'
    });
  } catch (error) {
    console.error('Error in changePassword:', error);
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
  resetUserPassword, 
  changePassword
};
