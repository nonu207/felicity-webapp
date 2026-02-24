const mongoose = require('mongoose');
const bcrypt = require('bcrypt');

// User schema - ONLY authentication
const userSchema = new mongoose.Schema({
  email: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
    trim: true
  },
  password: {
    type: String,
    required: true,
    minlength: 6
  },
  role: {
    type: String,
    enum: ['participant', 'organizer', 'admin'],
    required: true
  },
  isActive: {
    type: Boolean,
    default: true
  },
  // Set when a password-reset email is sent; cleared on use
  resetPasswordToken: {
    type: String,
    default: null
  },
  resetPasswordExpires: {
    type: Date,
    default: null
  },
  passwordResetRequested: {
    type: Boolean,
    default: false
  },
  passwordResetReason: {
    type: String,
    default: null
  },
  passwordResetRequestedAt: {
    type: Date,
    default: null
  }
}, {
  timestamps: true
});

// Hash password before saving
userSchema.pre('save', async function () {
  if (!this.isModified('password')) {
    return;
  }

  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
});

// Method to compare passwords
userSchema.methods.comparePassword = async function (candidatePassword) {
  return await bcrypt.compare(candidatePassword, this.password);
};

module.exports = mongoose.model('User', userSchema);