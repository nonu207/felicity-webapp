const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const User = require('../models/User');
const Participant = require('../models/Participant');
const Organizer = require('../models/Organizer');
require("dotenv").config();
const { sendPasswordResetEmail } = require('../utils/emailService');
const { createNotification } = require('./notificationController');

// Generate JWT Token
const generateToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET, {
    expiresIn: '30d'
  });
};

// @desc    Register a new participant
// @route   POST /api/auth/register/participant
// @access  Public
const registerParticipant = async (req, res) => {
  try {
    const {
      firstName,
      lastName,
      email,
      password,
      participantType,
      collegeName,
      contactNumber,
      interests
    } = req.body;

    // Validation — specific field-by-field messages
    if (!firstName?.trim()) return res.status(400).json({ message: 'First name is required' });
    if (!lastName?.trim())  return res.status(400).json({ message: 'Last name is required' });
    if (!email?.trim())     return res.status(400).json({ message: 'Email address is required' });
    if (!password)          return res.status(400).json({ message: 'Password is required' });
    if (!participantType)   return res.status(400).json({ message: 'Participant type is required' });
    if (!collegeName?.trim() && !email?.toLowerCase().endsWith('iiit.ac.in')) return res.status(400).json({ message: 'College / institution name is required' });
    if (!contactNumber?.trim()) return res.status(400).json({ message: 'Contact number is required' });

    // Email format validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({ message: 'Please enter a valid email address' });
    }

    // Password strength
    if (password.length < 6) {
      return res.status(400).json({ message: 'Password must be at least 6 characters long' });
    }

    // Phone format validation
    const phoneRegex = /^\+?[\d\s\-()]{7,15}$/;
    if (!phoneRegex.test(contactNumber)) {
      return res.status(400).json({ message: 'Please enter a valid contact number (7-15 digits)' });
    }

    // Auto-detect IIIT email: override type & college for @iiit.ac.in emails
    const isIIITemail = email.toLowerCase().endsWith('iiit.ac.in');
    const finalParticipantType = isIIITemail ? 'IIIT' : participantType;
    const finalCollegeName    = isIIITemail ? 'IIIT Hyderabad' : collegeName;

    // IIIT email validation
    if (finalParticipantType === 'IIIT' && !isIIITemail) {
      return res.status(400).json({ message: 'IIIT participants must use their IIIT email (iiit.ac.in)' });
    }

    // Check if user already exists
    const userExists = await User.findOne({ email: email.toLowerCase().trim() });
    if (userExists) {
      if (userExists.role !== 'participant') {
        return res.status(400).json({ message: `This email is already registered as ${userExists.role === 'admin' ? 'an admin' : 'an organizer'}. The same email cannot be used for multiple roles.` });
      }
      return res.status(400).json({ message: 'An account already exists with this email address. Please login instead or use a different email.' });
    }

    // Create User
    const user = await User.create({
      email,
      password,
      role: 'participant'
    });

    // Create Participant profile
    const participant = await Participant.create({
      userId: user._id,
      firstName,
      lastName,
      participantType: finalParticipantType,
      collegeName: finalCollegeName,
      contactNumber,
      interests: interests || [],
      profileComplete: true
    });

    res.status(201).json({
      success: true,
      data: {
        user: {
          id: user._id,
          email: user.email,
          role: user.role
        },
        participant: {
          id: participant._id,
          firstName: participant.firstName,
          lastName: participant.lastName,
          participantType: participant.participantType,
          collegeName: participant.collegeName
        },
        token: generateToken(user._id)
      }
    });
  } catch (error) {
    console.error('Error in registerParticipant:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// @desc    Block organizer self registration
// @route   POST /api/auth/register/organizer
// @access  Public
const registerOrganizer = async (req, res) => {
  return res.status(403).json({
    success: false,
    message: 'Organizer self-registration is disabled. Please contact admin.'
  });
};




const loginUser = async (req, res) => {
  try {
    const { email, password } = req.body;

    // Validation
    if (!email || !email.trim()) {
      return res.status(400).json({ message: 'Please enter your email address' });
    }
    if (!password) {
      return res.status(400).json({ message: 'Please enter your password' });
    }

    // Check if user exists (normalize email to lowercase to match stored value)
    const user = await User.findOne({ email: email.toLowerCase().trim() });
    if (!user) {
      return res.status(401).json({ message: 'No account found with this email address. Please check your email or register for a new account.' });
    }

    // Check if user is active
    if (!user.isActive) {
      return res.status(403).json({
        message: 'Your account has been deactivated by an administrator. Please contact support for assistance.'
      });
    }

    // Verify password using the model method
    const isPasswordValid = await user.comparePassword(password);
    if (!isPasswordValid) {
      return res.status(401).json({ message: 'Incorrect password. Please try again or use "Forgot password" to reset it.' });
    }

    // Get user profile based on role
    let profile = null;
    if (user.role === 'participant') {
      profile = await Participant.findOne({ userId: user._id });
    } else if (user.role === 'organizer') {
      profile = await Organizer.findOne({ userId: user._id });
    }

    res.status(200).json({
      success: true,
      data: {
        user: {
          id: user._id,
          email: user.email,
          role: user.role,
          isActive: user.isActive
        },
        profile,
        token: generateToken(user._id)
      }
    });
  } catch (error) {
    console.error('Error in loginUser:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// @desc    Get current user
// @route   GET /api/auth/me
// @access  Private
const getMe = async (req, res) => {
  try {
    const user = await User.findById(req.user._id).select('-password');

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Get user profile based on role
    let profile = null;
    if (user.role === 'participant') {
      profile = await Participant.findOne({ userId: user._id });
    } else if (user.role === 'organizer') {
      profile = await Organizer.findOne({ userId: user._id });
    }

    res.status(200).json({
      success: true,
      data: {
        user: {
          id: user._id,
          email: user.email,
          role: user.role,
          isActive: user.isActive
        },
        profile
      }
    });
  } catch (error) {
    console.error('Error in getMe:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// @desc    Change current user password
// @route   PATCH /api/auth/change-password
// @access  Private
const changePassword = async (req, res) => {
  try {
    // Organizers must use the admin-approval password reset flow
    if (req.user.role === 'organizer') {
      return res.status(403).json({ message: 'Organizers cannot change passwords directly. Please request a password reset from admin.' });
    }

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

// @desc    Request a password reset email
// @route   POST /api/auth/forgot-password
// @access  Public
const forgotPassword = async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) return res.status(400).json({ message: 'Please provide your email' });

    const user = await User.findOne({ email: email.toLowerCase().trim() });
    if (!user) {
      return res.status(404).json({ success: false, message: 'No account found with that email address.' });
    }

    // Generate a random token and store its hash in the DB
    const rawToken = crypto.randomBytes(32).toString('hex');
    const hashedToken = crypto.createHash('sha256').update(rawToken).digest('hex');

    user.resetPasswordToken = hashedToken;
    user.resetPasswordExpires = new Date(Date.now() + 60 * 60 * 1000); // 1 hour
    await user.save({ validateBeforeSave: false });

    try {
      await sendPasswordResetEmail(email, rawToken);
    } catch (emailError) {
      // Roll back the token if the email fails to send
      user.resetPasswordToken = null;
      user.resetPasswordExpires = null;
      await user.save({ validateBeforeSave: false });
      console.error('Email send failed:', emailError);
      return res.status(500).json({ message: 'Failed to send reset email. Please try again.' });
    }

    // In-app notification
    await createNotification({
      userId: user._id,
      type: 'password_reset_requested',
      title: 'Password Reset Requested',
      message: 'A password reset link has been sent to your email. It expires in 1 hour.',
    });

    res.status(200).json({ success: true, message: 'If an account is registered under that email, check your inbox for a reset link.' });
  } catch (error) {
    console.error('Error in forgotPassword:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// @desc    Reset password using token from email link
// @route   POST /api/auth/reset-password/:token
// @access  Public
const resetPassword = async (req, res) => {
  try {
    const { token } = req.params;
    const { newPassword } = req.body;

    if (!newPassword || newPassword.length < 6) {
      return res.status(400).json({ message: 'Password must be at least 6 characters' });
    }

    // Hash the token coming in from the URL and compare to stored hash
    const hashedToken = crypto.createHash('sha256').update(token).digest('hex');

    const user = await User.findOne({
      resetPasswordToken: hashedToken,
      resetPasswordExpires: { $gt: Date.now() } // must not be expired
    });

    if (!user) {
      return res.status(400).json({ message: 'Reset link is invalid or has expired.' });
    }

    // Set new password and clear reset fields
    user.password = newPassword;
    user.resetPasswordToken = null;
    user.resetPasswordExpires = null;
    await user.save();

    res.status(200).json({ success: true, message: 'Password reset successful. You can now log in.' });
  } catch (error) {
    console.error('Error in resetPassword:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

module.exports = {
  registerParticipant,
  registerOrganizer,
  loginUser,
  getMe,
  changePassword,
  forgotPassword,
  resetPassword
};
