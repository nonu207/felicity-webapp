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
    if (participantType === 'IIIT' && !email.endsWith('@iiit.ac.in')) {
      return res.status(400).json({ message: 'IIIT participants must use their IIIT email (@iiit.ac.in)' });
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

const loginUser = async (req, res) => {
    try{
         const {email, password} = req.body; 
         const user = await User.findOne({email}); 
        
         if(user && (await bcrypt.compare(password, user.password))){
            res.status(200).json({
                id: user._id, 
                name: user.name, 
                email: user.email, 
                role: user.role,
                token: generateToken(user._id), 
            }); 
         }
         else{
            res.status(401).json({message: 'invalid credentials'}); 
         }
    }
    catch{
        res.status(500).json({ message: 'Server error', error: error.message });
    }
}; 
module.exports = {
    registerParticipant, loginUser,
}; 
  