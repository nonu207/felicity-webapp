const mongoose = require('mongoose');

const participantSchema = new mongoose.Schema({
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
        unique: true,
    },
    firstName: {
        type: String,
        required: true,
        trim: true
    },
    lastName: {
        type: String,
        required: true,
        trim: true
    },
    participantType: {
        type: String,
        enum: ['IIIT', 'NON_IIIT'],
        required: true
    },
    collegeName: {
        type: String,
        required: true,
        trim: true
    },
    contactNumber: {
        type: String,
        required: true
    },

    // Areas of interest — multi-select during onboarding, editable from Profile
    interests: [{
        type: String,
        trim: true
    }],

    // Organizers the participant follows — used for Browse Events "Followed Clubs" filter
    followedOrganizers: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Organizer'
    }],

    // Set to true after participant completes or skips the onboarding screen
    onboardingComplete: {
        type: Boolean,
        default: false
    },

    profileComplete: {
        type: Boolean,
        default: false
    }

}, {
    timestamps: true
});

module.exports = mongoose.model('Participant', participantSchema);