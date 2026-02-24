const mongoose = require('mongoose');
const { randomUUID } = require('crypto');

// Stores answers to a custom form (Normal events)
const formResponseSchema = new mongoose.Schema({
    fieldLabel: {
        type: String,
        required: true,
    },
    answer: {
        type: mongoose.Schema.Types.Mixed, // string, array of strings, or file path
    },
}, { _id: false });

// Stores the specific merchandise item chosen (Merch events)
const merchandiseOrderSchema = new mongoose.Schema({
    itemId: {
        type: mongoose.Schema.Types.ObjectId, // ref to Event.merchandiseItems subdoc
        required: true,
    },
    itemName: {
        type: String,
        required: true,
    },
    size: String,
    color: String,
    variant: String,
    quantity: {
        type: Number,
        required: true,
        min: 1,
        default: 1,
    },
    priceAtPurchase: {
        type: Number,
        required: true,
        min: 0,
    },
}, { _id: false });

const registrationSchema = new mongoose.Schema({
    // Who registered
    participantId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Participant',
        required: true,
    },
    // Which event
    eventId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Event',
        required: true,
    },

    registrationType: {
        type: String,
        enum: ['Normal', 'Merchandise'],
        required: true,
    },

    // Unique human-readable ticket ID (e.g. "TKT-A1B2C3D4")
    // Only generated for free events at registration time, or on payment approval
    ticketId: {
        type: String,
    },

    // QR code content — typically a JSON string of ticketId + eventId + participantId
    // The actual image is generated on-the-fly by the controller using the `qrcode` package
    qrData: {
        type: String,
    },

    // Status of this registration
    status: {
        type: String,
        enum: ['Active', 'Cancelled', 'Rejected'],
        default: 'Active',
    },

    // --- Normal event: custom form answers ---
    formResponses: [formResponseSchema],

    // --- Merchandise event: order details ---
    merchandiseOrder: merchandiseOrderSchema,

    // Payment
    // 'Free'           : no fee required
    // 'Paid'           : fee paid and confirmed (manual or auto)
    // 'PendingApproval': payment proof uploaded, awaiting organizer approval (Tier A)
    // 'Rejected'       : organizer rejected the payment proof
    paymentStatus: {
        type: String,
        enum: ['Free', 'Paid', 'PendingApproval', 'Rejected'],
        default: 'Free',
    },

    // URL to uploaded payment proof image (used in Tier A: Merchandise Payment Approval)
    paymentProofUrl: {
        type: String,
        default: null,
    },

    // Attendance (populated by organizer via QR scanner — Tier A)
    attendanceMarked: {
        type: Boolean,
        default: false,
    },
    attendanceTimestamp: {
        type: Date,
        default: null,
    },

    // Audit log for manual attendance overrides
    attendanceOverride: {
        overriddenBy: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
            default: null,
        },
        reason: {
            type: String,
            default: null,
        },
    },

}, {
    timestamps: true,
});

// A participant can only register once per event
registrationSchema.index({ participantId: 1, eventId: 1 }, { unique: true });

// Fast lookup by ticketId (sparse so null ticketIds don't conflict)
registrationSchema.index({ ticketId: 1 }, { unique: true, sparse: true });

module.exports = mongoose.model('Registration', registrationSchema);
