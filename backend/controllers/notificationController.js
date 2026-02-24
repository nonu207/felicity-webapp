const Notification = require('../models/Notification');

// ─────────────────────────────────────────────
// @desc    Get notifications for the logged-in user
// @route   GET /api/notifications
// @access  Private
// ─────────────────────────────────────────────
const getNotifications = async (req, res) => {
    try {
        const page = Math.max(1, parseInt(req.query.page) || 1);
        const limit = Math.min(50, Math.max(1, parseInt(req.query.limit) || 20));
        const skip = (page - 1) * limit;

        const [notifications, total, unreadCount] = await Promise.all([
            Notification.find({ userId: req.user._id })
                .sort({ createdAt: -1 })
                .skip(skip)
                .limit(limit)
                .lean(),
            Notification.countDocuments({ userId: req.user._id }),
            Notification.countDocuments({ userId: req.user._id, read: false }),
        ]);

        res.status(200).json({
            success: true,
            data: notifications,
            unreadCount,
            pagination: { page, limit, total, pages: Math.ceil(total / limit) },
        });
    } catch (error) {
        console.error('Error in getNotifications:', error);
        res.status(500).json({ message: 'Server error', error: error.message });
    }
};

// ─────────────────────────────────────────────
// @desc    Get unread count only (lightweight)
// @route   GET /api/notifications/unread-count
// @access  Private
// ─────────────────────────────────────────────
const getUnreadCount = async (req, res) => {
    try {
        const count = await Notification.countDocuments({ userId: req.user._id, read: false });
        res.status(200).json({ success: true, unreadCount: count });
    } catch (error) {
        res.status(500).json({ message: 'Server error', error: error.message });
    }
};

// ─────────────────────────────────────────────
// @desc    Mark a single notification as read
// @route   PATCH /api/notifications/:id/read
// @access  Private
// ─────────────────────────────────────────────
const markAsRead = async (req, res) => {
    try {
        const notif = await Notification.findOneAndUpdate(
            { _id: req.params.id, userId: req.user._id },
            { read: true },
            { new: true }
        );
        if (!notif) return res.status(404).json({ message: 'Notification not found' });
        res.status(200).json({ success: true, data: notif });
    } catch (error) {
        res.status(500).json({ message: 'Server error', error: error.message });
    }
};

// ─────────────────────────────────────────────
// @desc    Mark ALL notifications as read
// @route   PATCH /api/notifications/read-all
// @access  Private
// ─────────────────────────────────────────────
const markAllAsRead = async (req, res) => {
    try {
        await Notification.updateMany(
            { userId: req.user._id, read: false },
            { read: true }
        );
        res.status(200).json({ success: true, message: 'All notifications marked as read' });
    } catch (error) {
        res.status(500).json({ message: 'Server error', error: error.message });
    }
};

// ─────────────────────────────────────────────
// Helper: create a notification (used internally by other controllers)
// ─────────────────────────────────────────────
const createNotification = async ({ userId, type, title, message }) => {
    try {
        return await Notification.create({ userId, type, title, message });
    } catch (err) {
        console.error('Failed to create notification:', err.message);
    }
};

module.exports = {
    getNotifications,
    getUnreadCount,
    markAsRead,
    markAllAsRead,
    createNotification,
};
