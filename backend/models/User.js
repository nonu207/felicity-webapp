const mongoose = require('mongoose');
const bcrypt = require('bcrypt');

// Define user schema
const userSchema = new mongoose.Schema({
  firstName: {
    type: String,
    trim: true, 
  }, 
  lastName: {
    type: String,
    trim: true, 
  }, 
  paricipantType: {
    type: String,
    enum: ['IIIT-participant','Non-IIIT-participant' ], 
    required: true, 
  }, 
  email:{
    type: String,
    required: true,
    unique: true,
    lowercase: true,
    trim: true,
  }, 
  organizationName:{
    type: String,
    trim: true, 
  }, 
  password: {
    type: String,
    required: true,
    minlength: 6,
  },
  contactNumber: {
    type: String,
    trim: true,
  }
}); 
const organizerSchema = new mongoose.Schema({
  organizerName: {
    type: String,
    trim: true, 
    required: true,
  }, 
  description:{
    type: String,
    trim: true, 
    required: true,
  }, 
  category: {
    type: String,
    required: true,
}, 
Contactemail: {
  type: String, 
  trim: true, 
  lowercase: true, 
  required: true,
}, 
});

// Hash password before saving
userSchema.pre('save', async function(next) {
  if (!this.isModified('password')) {
    return next();
  }
  
  try {
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
    next();
  } catch (error) {
    next(error);
  }
}); 


module.exports = mongoose.model('User', userSchema);