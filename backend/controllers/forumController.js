const Message = require('../models/Message');
const Event = require('../models/Event');
const Registration = require('../models/Registration');
const Organizer = require('../models/Organizer');
const Participant = require('../models/Participant');
const Notification = require('../models/Notification');

// Helper: get display name for the current user
const getAuthorName = async (user) => {
    if (user.role === 'participant') {
        const p = await Participant.findOne({ userId: user._id });
        return p ? `${p.firstName} ${p.lastName}` : 'Participant';
    }
    if (user.role === 'organizer') {
        const o = await Organizer.findOne({ userId: user._id });
        return o ? o.organizerName : 'Organizer';
    }
    return 'Admin';
};

// Helper: check if user is the organizer of the event
const isEventOrganizer = async (userId, eventId) => {
    const org = await Organizer.findOne({ userId });
    if (!org) return false;
    const event = await Event.findById(eventId);
    return event && event.organizerId.toString() === org._id.toString();
};

// Helper: check if user is registered for the event
const isRegistered = async (userId, eventId) => {
    const participant = await Participant.findOne({ userId });
    if (!participant) return false;
    const reg = await Registration.findOne({
        participantId: participant._id,
        eventId,
        status: { $ne: 'Cancelled' },
    });
    return !!reg;
};

// Helper: check if user can access the forum
const canAccessForum = async (user, eventId) => {
    if (user.role === 'admin') return true;
    if (user.role === 'organizer') return await isEventOrganizer(user._id, eventId);
    if (user.role === 'participant') return await isRegistered(user._id, eventId);
    return false;
};

// ─────────────────────────────────────────────
// @desc    Get threaded messages for an event forum
// @route   GET /api/forum/:eventId/messages
// @access  Private (registered participants, event organizer, admin)
// ─────────────────────────────────────────────
const getMessages = async (req, res) => {
    try {
        const { eventId } = req.params;
        const { sort = 'best' } = req.query; // 'best', 'new', 'old'

        const hasAccess = await canAccessForum(req.user, eventId);
        if (!hasAccess) {
            return res.status(403).json({ message: 'You must be registered for this event to access the forum' });
        }

        // Fetch ALL messages for this event
        const allMessages = await Message.find({ eventId }).lean();

        // Mask deleted messages
        const cleaned = allMessages.map(m => {
            if (m.isDeleted) {
                return { ...m, content: '[deleted]', votes: [] };
            }
            return m;
        });

        // Build tree structure
        const map = {};
        const roots = [];

        cleaned.forEach(m => {
            map[m._id.toString()] = { ...m, children: [] };
        });

        cleaned.forEach(m => {
            const node = map[m._id.toString()];
            if (m.parentId && map[m.parentId.toString()]) {
                map[m.parentId.toString()].children.push(node);
            } else {
                roots.push(node);
            }
        });

        // Sort function
        const sortFn = (a, b) => {
            if (a.isPinned && !b.isPinned) return -1;
            if (!a.isPinned && b.isPinned) return 1;
            if (a.isAnnouncement && !b.isAnnouncement) return -1;
            if (!a.isAnnouncement && b.isAnnouncement) return 1;
            if (sort === 'new') return new Date(b.createdAt) - new Date(a.createdAt);
            if (sort === 'old') return new Date(a.createdAt) - new Date(b.createdAt);
            if (b.score !== a.score) return b.score - a.score;
            return new Date(b.createdAt) - new Date(a.createdAt);
        };

        const sortTree = (nodes) => {
            nodes.sort(sortFn);
            nodes.forEach(n => { if (n.children.length > 0) sortTree(n.children); });
        };
        sortTree(roots);

        res.status(200).json({ success: true, data: roots, total: allMessages.length });
    } catch (error) {
        console.error('Error in getMessages:', error);
        res.status(500).json({ message: 'Server error', error: error.message });
    }
};

// ─────────────────────────────────────────────
// @desc    Post a new message in the forum
// @route   POST /api/forum/:eventId/messages
// @access  Private
// ─────────────────────────────────────────────
const postMessage = async (req, res) => {
    try {
        const { eventId } = req.params;
        const { content, parentId, isAnnouncement } = req.body;

        if (!content || !content.trim()) {
            return res.status(400).json({ message: 'Message content is required' });
        }

        const hasAccess = await canAccessForum(req.user, eventId);
        if (!hasAccess) {
            return res.status(403).json({ message: 'You must be registered for this event to post messages' });
        }

        const announcement = isAnnouncement && ['organizer', 'admin'].includes(req.user.role) ? true : false;
        const authorName = await getAuthorName(req.user);

        let depth = 0;
        if (parentId) {
            const parent = await Message.findById(parentId);
            if (!parent || parent.eventId.toString() !== eventId) {
                return res.status(404).json({ message: 'Parent message not found' });
            }
            depth = (parent.depth || 0) + 1;
        }

        const message = await Message.create({
            eventId,
            authorId: req.user._id,
            authorName,
            authorRole: req.user.role,
            content: content.trim(),
            parentId: parentId || null,
            depth,
            isAnnouncement: announcement,
            votes: [{ userId: req.user._id, value: 1 }],
            score: 1,
        });

        if (parentId) {
            await Message.findByIdAndUpdate(parentId, { $inc: { replyCount: 1 } });
        }

        if (announcement) {
            const event = await Event.findById(eventId);
            const registrations = await Registration.find({ eventId, status: { $ne: 'Cancelled' } }).populate('participantId');
            const notifications = registrations
                .filter(r => r.participantId?.userId?.toString() !== req.user._id.toString())
                .map(r => ({
                    userId: r.participantId.userId,
                    type: 'general',
                    title: '\uD83D\uDCE2 Announcement: ' + (event?.eventName || 'Event'),
                    message: content.trim().substring(0, 200),
                    read: false,
                }));
            if (notifications.length > 0) await Notification.insertMany(notifications);
        }

        const io = req.app.get('io');
        if (io) io.to('forum:' + eventId).emit('new_message', message.toObject());

        // Send notifications (non-blocking)
        setImmediate(async () => {
            try {
                const event = announcement
                    ? null // announcement block already fetches event above
                    : await Event.findById(eventId).select('eventName organizerId');
                const eventName = event?.eventName || 'an event';

                // 1. Reply → notify the parent message author
                if (parentId) {
                    const parentMsg = await Message.findById(parentId).select('authorId');
                    if (parentMsg && parentMsg.authorId.toString() !== req.user._id.toString()) {
                        await Notification.create({
                            userId: parentMsg.authorId,
                            type: 'forum_reply',
                            title: `💬 ${authorName} replied to your message`,
                            message: `In the forum for "${eventName}": ${content.trim().substring(0, 150)}`,
                        });
                    }
                }

                // 2. Non-announcement message → notify event organizer
                if (!announcement && event?.organizerId) {
                    const orgDoc = await Organizer.findById(event.organizerId).select('userId');
                    if (orgDoc && orgDoc.userId.toString() !== req.user._id.toString()) {
                        await Notification.create({
                            userId: orgDoc.userId,
                            type: 'forum_message',
                            title: `🗨️ New forum message in "${eventName}"`,
                            message: `${authorName}: ${content.trim().substring(0, 150)}`,
                        });
                    }
                }
            } catch (notifErr) {
                console.error('Forum notification error:', notifErr.message);
            }
        });

        res.status(201).json({ success: true, data: message });
    } catch (error) {
        console.error('Error in postMessage:', error);
        res.status(500).json({ message: 'Server error', error: error.message });
    }
};

// ─────────────────────────────────────────────
// @desc    Vote on a message (upvote / downvote / remove)
// @route   POST /api/forum/:eventId/messages/:messageId/vote
// @access  Private
// ─────────────────────────────────────────────
const voteMessage = async (req, res) => {
    try {
        const { eventId, messageId } = req.params;
        const { value } = req.body;

        if (![1, -1, 0].includes(value)) {
            return res.status(400).json({ message: 'Vote value must be 1, -1, or 0' });
        }

        const hasAccess = await canAccessForum(req.user, eventId);
        if (!hasAccess) return res.status(403).json({ message: 'Not authorized' });

        const message = await Message.findOne({ _id: messageId, eventId });
        if (!message || message.isDeleted) return res.status(404).json({ message: 'Message not found' });

        const existingIdx = message.votes.findIndex(v => v.userId.toString() === req.user._id.toString());

        if (value === 0) {
            if (existingIdx >= 0) message.votes.splice(existingIdx, 1);
        } else if (existingIdx >= 0) {
            message.votes[existingIdx].value = value;
        } else {
            message.votes.push({ userId: req.user._id, value });
        }

        message.score = message.votes.reduce((sum, v) => sum + v.value, 0);
        await message.save();

        const io = req.app.get('io');
        if (io) io.to('forum:' + eventId).emit('message_voted', { messageId, eventId, score: message.score, votes: message.votes });

        res.status(200).json({ success: true, data: { score: message.score, votes: message.votes } });
    } catch (error) {
        console.error('Error in voteMessage:', error);
        res.status(500).json({ message: 'Server error', error: error.message });
    }
};

// ─────────────────────────────────────────────
// @desc    Delete a message (soft delete)
// @route   DELETE /api/forum/:eventId/messages/:messageId
// @access  Private (event organizer, admin, or message author)
// ─────────────────────────────────────────────
const deleteMessage = async (req, res) => {
    try {
        const { eventId, messageId } = req.params;
        const message = await Message.findOne({ _id: messageId, eventId });
        if (!message) return res.status(404).json({ message: 'Message not found' });

        const isOrg = await isEventOrganizer(req.user._id, eventId);
        const isAuthor = message.authorId.toString() === req.user._id.toString();
        const isAdmin = req.user.role === 'admin';

        if (!isOrg && !isAuthor && !isAdmin) {
            return res.status(403).json({ message: 'Not authorized to delete this message' });
        }

        message.isDeleted = true;
        message.deletedBy = req.user._id;
        await message.save();

        const io = req.app.get('io');
        if (io) io.to('forum:' + eventId).emit('message_deleted', { messageId, eventId });

        res.status(200).json({ success: true, message: 'Message deleted' });
    } catch (error) {
        console.error('Error in deleteMessage:', error);
        res.status(500).json({ message: 'Server error', error: error.message });
    }
};

// ─────────────────────────────────────────────
// @desc    Pin/unpin a message
// @route   PATCH /api/forum/:eventId/messages/:messageId/pin
// @access  Private (event organizer, admin)
// ─────────────────────────────────────────────
const togglePin = async (req, res) => {
    try {
        const { eventId, messageId } = req.params;
        const isOrg = await isEventOrganizer(req.user._id, eventId);
        const isAdmin = req.user.role === 'admin';
        if (!isOrg && !isAdmin) return res.status(403).json({ message: 'Only organizers can pin messages' });

        const message = await Message.findOne({ _id: messageId, eventId });
        if (!message) return res.status(404).json({ message: 'Message not found' });

        message.isPinned = !message.isPinned;
        await message.save();

        const io = req.app.get('io');
        if (io) io.to('forum:' + eventId).emit('message_pinned', { messageId, eventId, isPinned: message.isPinned });

        res.status(200).json({ success: true, data: message });
    } catch (error) {
        console.error('Error in togglePin:', error);
        res.status(500).json({ message: 'Server error', error: error.message });
    }
};

// ─────────────────────────────────────────────
// @desc    Check if user has forum access
// @route   GET /api/forum/:eventId/access
// @access  Private
// ─────────────────────────────────────────────
const checkAccess = async (req, res) => {
    try {
        const { eventId } = req.params;
        const hasAccess = await canAccessForum(req.user, eventId);
        const isOrg = req.user.role === 'organizer' ? await isEventOrganizer(req.user._id, eventId) : false;
        res.status(200).json({ success: true, hasAccess, isModerator: isOrg || req.user.role === 'admin' });
    } catch (error) {
        res.status(500).json({ message: 'Server error', error: error.message });
    }
};

module.exports = {
    getMessages,
    postMessage,
    voteMessage,
    deleteMessage,
    togglePin,
    checkAccess,
};
