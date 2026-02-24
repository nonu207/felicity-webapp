const mongoose = require('mongoose');

const organizerSchema = new mongoose.Schema({
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
        unique: true
    },
    organizerName: {
        type: String,
        required: true,
        trim: true
    },
    organizerDescription: {
        type: String,
        required: true,
        trim: true
    },
    organizerCategory: {
        type: String,
        required: true,
        trim: true
    },
    contactEmail: {
        type: String,
        required: true,
        lowercase: true,
    },
    // Participants who follow this organizer
    // Stored as an array of Participant _id references
    followedBy: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Participant'
    }],

    // Discord webhook URL for auto-posting new events (spec §10.5)
    discordWebhookUrl: {
        type: String,
        trim: true,
        default: null
    },

    // Whether the account is archived/removed by admin
    isArchived: {
        type: Boolean,
        default: false
    }

}, {
    timestamps: true
});

module.exports = mongoose.model('Organizer', organizerSchema);