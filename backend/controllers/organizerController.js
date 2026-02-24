const Organizer = require('../models/Organizer');
const User = require('../models/User');
const { isValidWebhookUrl, sendTestEmbed } = require('../utils/discordService');

// ─── @desc  Get logged-in organizer's profile
// ─── @route GET /api/organizer/profile
// ─── @access Organizer
const getProfile = async (req, res) => {
  try {
    const organizer = await Organizer.findOne({ userId: req.user._id });
    if (!organizer) {
      return res.status(404).json({ message: 'Organizer profile not found' });
    }
    res.json({ success: true, organizer });
  } catch (err) {
    console.error('getProfile:', err);
    res.status(500).json({ message: 'Server error', error: err.message });
  }
};

// ─── @desc  Update logged-in organizer's profile
// ─── @route PATCH /api/organizer/profile
// ─── @access Organizer
const updateProfile = async (req, res) => {
  try {
    const organizer = await Organizer.findOne({ userId: req.user._id });
    if (!organizer) {
      return res.status(404).json({ message: 'Organizer profile not found' });
    }

    // Validate Discord webhook URL if provided
    if (req.body.discordWebhookUrl && req.body.discordWebhookUrl.trim()) {
      if (!isValidWebhookUrl(req.body.discordWebhookUrl)) {
        return res.status(400).json({ message: 'Invalid Discord webhook URL. It must start with https://discord.com/api/webhooks/' });
      }
    }

    const allowed = ['organizerName', 'organizerCategory', 'organizerDescription', 'contactEmail', 'contactNumber', 'discordWebhookUrl'];
    let changed = false;
    allowed.forEach((field) => {
      if (req.body[field] !== undefined) { organizer[field] = req.body[field]; changed = true; }
    });

    if (!changed) return res.status(400).json({ message: 'No valid fields provided to update' });

    await organizer.save();
    res.json({ success: true, organizer });
  } catch (err) {
    console.error('updateProfile:', err);
    if (err.code === 11000) return res.status(400).json({ message: 'That contact email is already in use by another organizer' });
    res.status(500).json({ message: 'Server error', error: err.message });
  }
};

// ─── @desc  Request a password reset (admin will approve and email new password)
// ─── @route POST /api/organizer/request-password-reset
// ─── @access Organizer
const requestPasswordReset = async (req, res) => {
  try {
    const { reason } = req.body || {};
    if (!reason || !reason.trim()) {
      return res.status(400).json({ message: 'Please provide a reason for the password reset request.' });
    }
    const user = await User.findById(req.user._id);
    if (!user) return res.status(404).json({ message: 'User not found' });
    if (user.passwordResetRequested) {
      return res.status(400).json({ message: 'You already have a pending password reset request.' });
    }
    user.passwordResetRequested = true;
    user.passwordResetReason = reason.trim();
    user.passwordResetRequestedAt = new Date();
    await user.save({ validateBeforeSave: false });
    res.json({ success: true, message: 'Password reset request submitted. The admin will review your request shortly.' });
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
};

// ─── @desc  Test Discord webhook
// ─── @route POST /api/organizer/test-webhook
// ─── @access Organizer
const testWebhook = async (req, res) => {
  try {
    const organizer = await Organizer.findOne({ userId: req.user._id });
    if (!organizer) return res.status(404).json({ message: 'Organizer profile not found' });

    const url = req.body.webhookUrl || organizer.discordWebhookUrl;
    if (!url) {
      return res.status(400).json({ message: 'No Discord webhook URL configured. Add one in your profile first.' });
    }
    if (!isValidWebhookUrl(url)) {
      return res.status(400).json({ message: 'Invalid Discord webhook URL format.' });
    }

    const success = await sendTestEmbed(url, organizer.organizerName);
    if (success) {
      res.json({ success: true, message: 'Test message sent! Check your Discord channel.' });
    } else {
      res.status(400).json({ message: 'Failed to send test message. Please verify the webhook URL is correct and the webhook is not deleted.' });
    }
  } catch (err) {
    console.error('testWebhook:', err);
    res.status(500).json({ message: 'Server error', error: err.message });
  }
};

module.exports = { getProfile, updateProfile, requestPasswordReset, testWebhook };
