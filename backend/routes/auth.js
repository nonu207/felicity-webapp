const express = require('express');
const router = express.Router();
const User = require('../models/User');
const jwt = require('jsonwebtoken');


router.get('/test', (req, res) => {
  res.json({ message: 'Auth routes are working!' });
});

// Signup route
router.post('/signup', async (req, res) => {
  try {
    const { email, password, role } = req.body;
    
    // Validate input
    if (!email || !password || !role) {
      return res.status(400).json({ 
        message: 'Please provide email, password, and role' 
      });

      if(!email.end)
    }
    
    // Check if user already exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ 
        message: 'User with this email already exists' 
      });
    }
    
    // Create new user
    const user = new User({
      email,
      password,
      role
    });
    
    await user.save();
    
    // Create JWT token
    const token = jwt.sign(
      { userId: user._id, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );
    
    // Send response
    res.status(201).json({
      message: 'User created successfully',
      token,
      user: {
        id: user._id,
        email: user.email,
        role: user.role
      }
    });
    
  } catch (error) {
    console.error('Signup error:', error);
    res.status(500).json({ 
      message: 'Server error during signup', 
      error: error.message 
    });
  }
});

// Login route (placeholder)
router.post('/login', async (req, res) => {
  res.json({ message: 'Login route - to be implemented' });
});

module.exports = router;