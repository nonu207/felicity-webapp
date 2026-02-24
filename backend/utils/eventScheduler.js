/**
 * Event Status Scheduler
 * Periodically transitions event statuses based on dates:
 *   Published → Ongoing   when startDate has passed
 *   Published/Ongoing → Completed   when endDate has passed
 */

const Event = require('../models/Event');
const Organizer = require('../models/Organizer');
const { sendEventCompletedEmbed } = require('./discordService');

// Run one sweep of status transitions
const runEventStatusUpdate = async () => {
    const now = new Date();

    try {
        // Published → Ongoing (startDate passed, endDate not yet)
        await Event.updateMany(
            { status: 'Published', startDate: { $lte: now }, endDate: { $gt: now } },
            { $set: { status: 'Ongoing' } }
        );

        // Published/Ongoing → Completed (endDate passed)
        const toComplete = await Event.find({
            status: { $in: ['Published', 'Ongoing'] },
            endDate: { $lte: now },
        }).select('_id eventName organizerId registrationCount eventType');

        if (toComplete.length > 0) {
            const ids = toComplete.map(e => e._id);
            await Event.updateMany({ _id: { $in: ids } }, { $set: { status: 'Completed' } });

            // Send Discord notifications for completed events
            for (const event of toComplete) {
                try {
                    const orgDoc = await Organizer.findById(event.organizerId).select('discordWebhookUrl organizerName');
                    if (orgDoc?.discordWebhookUrl) {
                        sendEventCompletedEmbed(orgDoc.discordWebhookUrl, event, orgDoc.organizerName).catch(() => { });
                    }
                } catch (_) { }
            }
        }
    } catch (err) {
        console.error('Event status update error:', err.message);
    }
};

// Start the scheduler (runs immediately, then every intervalMs)
const startEventScheduler = (intervalMs = 60_000) => {
    runEventStatusUpdate();
    setInterval(runEventStatusUpdate, intervalMs);
};

module.exports = { runEventStatusUpdate, startEventScheduler };
