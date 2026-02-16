const jwt = require('jsonwebtoken');
const User = require('../models/User');
const Participant = require('../models/Participant');
const Organizer = require('../models/Organizer');

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

    // Validation
    if (!firstName || !lastName || !email || !password || !participantType || !collegeName || !contactNumber) {
      return res.status(400).json({ message: 'Please provide all required fields' });
    }

    // IIIT email validation
    if (participantType === 'IIIT' && !email.endsWith('iiit.ac.in')) {
      return res.status(400).json({ message: 'IIIT participants must use their IIIT email (iiit.ac.in)' });
    }

    // Check if user already exists
    const userExists = await User.findOne({ email });
    if (userExists) {
      return res.status(400).json({ message: 'User already exists with this email' });
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
      participantType,
      collegeName,
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
    if (!email || !password) {
      return res.status(400).json({ message: 'Please provide email and password' });
    }

    // Check if user exists
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    // Check if user is active
    if (!user.isActive) {
      return res.status(401).json({
        message: 'Account is not active. Please wait for admin approval or contact support.'
      });
    }

    // Verify password using the model method
    const isPasswordValid = await user.comparePassword(password);
    if (!isPasswordValid) {
      return res.status(401).json({ message: 'Invalid credentials' });
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
    const { currentPassword, newPassword } = req.body;

    if (!currentPassword || !newPassword) {
      return res.status(400).json({ message: 'Please provide current and new password' });
    }

    if (newPassword.length < 6) {
      return res.status(400).json({ message: 'New password must be at least 6 characters' });
    }

    // Get user (req.user is set by authMiddleware)
    // Note: User model should be imported at top of file
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
  registerParticipant,
  registerOrganizer,
  loginUser,
  getMe,
  changePassword
};

