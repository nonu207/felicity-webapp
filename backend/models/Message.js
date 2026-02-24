const mongoose = require('mongoose');

const voteSchema = new mongoose.Schema({
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
    },
    value: {
        type: Number,
        enum: [1, -1],
        required: true,
    },
}, { _id: false });

const messageSchema = new mongoose.Schema({
    eventId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Event',
        required: true,
        index: true,
    },
    authorId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
    },
    authorName: {
        type: String,
        required: true,
        trim: true,
    },
    authorRole: {
        type: String,
        enum: ['participant', 'organizer', 'admin'],
        required: true,
    },
    content: {
        type: String,
        required: true,
        trim: true,
        maxlength: 2000,
    },
    // For threading: null means top-level message
    parentId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Message',
        default: null,
    },
    // Depth in the thread tree (0 = top-level)
    depth: {
        type: Number,
        default: 0,
        min: 0,
    },
    // Announcement flag — only organizers can set this
    isAnnouncement: {
        type: Boolean,
        default: false,
    },
    // Pinned by organizer
    isPinned: {
        type: Boolean,
        default: false,
    },
    // Soft delete by moderator
    isDeleted: {
        type: Boolean,
        default: false,
    },
    deletedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        default: null,
    },
    // Votes (upvote / downvote)
    votes: [voteSchema],
    score: {
        type: Number,
        default: 0,
    },
    // Count of direct replies (denormalized for performance)
    replyCount: {
        type: Number,
        default: 0,
        min: 0,
    },
}, {
    timestamps: true,
});

// Compound index for efficient queries
messageSchema.index({ eventId: 1, parentId: 1, createdAt: -1 });
messageSchema.index({ eventId: 1, isPinned: -1, createdAt: -1 });
messageSchema.index({ eventId: 1, parentId: 1, score: -1 });

module.exports = mongoose.model('Message', messageSchema);
