const mongoose = require('mongoose');

const notificationSchema = new mongoose.Schema({
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
        index: true,
    },
    type: {
        type: String,
        enum: [
            'password_reset_approved',
            'password_reset_rejected',
            'password_reset_requested',
            'event_published',
            'registration_confirmed',
            'registration_cancelled',
            'payment_approved',
            'payment_rejected',
            'account_approved',
            'account_deactivated',
            'organizer_welcome',
            'forum_message',
            'forum_reply',
            'general',
        ],
        default: 'general',
    },
    title: {
        type: String,
        required: true,
        trim: true,
    },
    message: {
        type: String,
        required: true,
        trim: true,
    },
    read: {
        type: Boolean,
        default: false,
    },
}, {
    timestamps: true,
});

// Index for fast "unread for user" queries
notificationSchema.index({ userId: 1, read: 1, createdAt: -1 });

module.exports = mongoose.model('Notification', notificationSchema);
