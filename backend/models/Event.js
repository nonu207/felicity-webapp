const mongoose = require('mongoose');

// Sub-schema for custom form fields (Normal events)
const formFieldSchema = new mongoose.Schema({
    fieldLabel: {
        type: String,
        required: true,
        trim: true,
    },
    fieldType: {
        type: String,
        enum: ['text', 'textarea', 'dropdown', 'checkbox', 'radio', 'file', 'email', 'phone', 'number'],
        required: true,
    },
    options: [{
        type: String,
        trim: true,
    }], // for dropdown, checkbox, radio
    isRequired: {
        type: Boolean,
        default: false,
    },
    min: {
        type: Number,
        default: null,
    },
    max: {
        type: Number,
        default: null,
    },
    order: {
        type: Number,
        default: 0,
    },
}, { _id: true });

// Sub-schema for merchandise item variants
const merchandiseItemSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true,
        trim: true,
    }, // e.g. "Black Hoodie - L"
    size: {
        type: String,
        trim: true,
    },
    color: {
        type: String,
        trim: true,
    },
    variant: {
        type: String,
        trim: true,
    },
    stockQuantity: {
        type: Number,
        required: true,
        min: 0,
        default: 0,
    },
    price: {
        type: Number,
        required: true,
        min: 0,
    },
}, { _id: true });

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
    eventType: {
        type: String,
        enum: ['Normal', 'Merchandise'],
        required: true,
    },
    status: {
        type: String,
        enum: ['Draft', 'Published', 'Ongoing', 'Closed', 'Completed'],
        default: 'Draft',
    },
    // organizerId refs the Organizer profile document (not User)
    organizerId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Organizer',
        required: true,
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
    eligibility: {
        type: String,
        enum: ['all', 'iiit-only', 'non-iiit-only'],
        default: 'all',
    },
    registrationLimit: {
        type: Number,
        min: 1,
    },
    registrationCount: {
        type: Number,
        default: 0,
        min: 0,
    },
    totalRevenue: {
        type: Number,
        default: 0,
        min: 0,
    },
    eventTags: [{
        type: String,
        trim: true,
    }],

    // --- Normal Event fields ---
    // Custom registration form; locked after first registration is received
    customForm: {
        fields: [formFieldSchema],
        isLocked: {
            type: Boolean,
            default: false,
        },
    },

    // --- Merchandise Event fields ---
    merchandiseItems: [merchandiseItemSchema],
    purchaseLimitPerParticipant: {
        type: Number,
        min: 1,
        default: 1,
    },

}, {
    timestamps: true,
});

// Text index for search on event name and tags
eventSchema.index({ eventName: 'text', eventTags: 'text' });

module.exports = mongoose.model('Event', eventSchema);