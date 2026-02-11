const mongoose = require('mongoose');

const eventSchema = new mongoose.Schema({
    eventName: {
        type: String,
        required: true,
        trim: true,
    },
    description: {
        type: String,
        trim: true,
    },
    startDate: {
        type: Date,
        required: true,
    },
    endDate: {
        type: Date,
        required: true,
    },
    registrationDeadline: {
        type: Date,
        required: true,
    },
    location: {
        type: String,
        trim: true,
    },
    registrationFee: {
        type: Number,
        default: 0,
        min: 0,
    },
    organizerId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
    },
    eventType: {
        type: String,
        enum: ['Normal', 'Merchandise'],
        required: true,
    },
    eventTags: [{
        type: String,
        trim: true,
    }],
    eligibility: {
        type: String,
        trim: true,
    },
    registrationLimit: {
        type: Number,
        min: 1,
    },
    createdAt: {
        type: Date,
        default: Date.now,
    },
    updatedAt: {
        type: Date,
        default: Date.now,
    },
});

module.exports = mongoose.model('Event', eventSchema);