const Event = require('../models/Event');
const Organizer = require('../models/Organizer');
const Participant = require('../models/Participant');
const Registration = require('../models/Registration');
const { createNotification } = require('./notificationController');
const { sendEventPublishedEmbed, sendEventClosedEmbed, sendEventCompletedEmbed, sendEventUpdatedEmbed } = require('../utils/discordService');

// Helper: get the Organizer doc for the logged-in user
const getOrganizerForUser = async (userId) => {
  return Organizer.findOne({ userId });
};

// ─── @desc  Create a new event (Draft)
// ─── @route POST /api/events
// ─── @access Organizer
const createEvent = async (req, res) => {
  try {
    const organizer = await getOrganizerForUser(req.user._id);
    if (!organizer) return res.status(404).json({ message: 'Organizer profile not found' });

    const {
      eventName, description, eventType, startDate, endDate,
      registrationDeadline, location, registrationFee, eligibility,
      registrationLimit, eventTags, customForm, merchandiseItems,
      purchaseLimitPerParticipant,
    } = req.body;

    if (!eventName?.trim()) return res.status(400).json({ message: 'Event name is required' });
    if (!eventType) return res.status(400).json({ message: 'Event type is required' });
    if (!startDate) return res.status(400).json({ message: 'Start date is required' });
    if (!endDate) return res.status(400).json({ message: 'End date is required' });
    if (!registrationDeadline) return res.status(400).json({ message: 'Registration deadline is required' });

    // Date validations
    const now = new Date();
    if (new Date(startDate) < now) {
      return res.status(400).json({ message: 'Start date cannot be in the past' });
    }
    if (new Date(endDate) < now) {
      return res.status(400).json({ message: 'End date cannot be in the past' });
    }
    if (new Date(registrationDeadline) < now) {
      return res.status(400).json({ message: 'Registration deadline cannot be in the past' });
    }
    if (new Date(endDate) <= new Date(startDate)) {
      return res.status(400).json({ message: 'End date must be after start date' });
    }
    if (new Date(registrationDeadline) > new Date(endDate)) {
      return res.status(400).json({ message: 'Registration deadline cannot be after the event end date' });
    }
    if (registrationLimit !== undefined && registrationLimit !== null && Number(registrationLimit) < 1) {
      return res.status(400).json({ message: 'Registration limit must be at least 1' });
    }
    if (registrationFee !== undefined && Number(registrationFee) < 0) {
      return res.status(400).json({ message: 'Registration fee cannot be negative' });
    }

    // Merchandise validations
    if (eventType === 'Merchandise' && merchandiseItems) {
      for (let i = 0; i < merchandiseItems.length; i++) {
        const item = merchandiseItems[i];
        if (!item.name?.trim()) return res.status(400).json({ message: `Merchandise item ${i + 1}: Name is required` });
        if (item.price == null || item.price < 0) return res.status(400).json({ message: `Merchandise item ${i + 1}: Price cannot be negative` });
        if (item.stockQuantity != null && item.stockQuantity < 0) return res.status(400).json({ message: `Merchandise item ${i + 1}: Stock cannot be negative` });
      }
    }

    const event = await Event.create({
      eventName, description, eventType, status: 'Draft',
      startDate, endDate, registrationDeadline,
      location, registrationFee: eventType === 'Merchandise' ? 0 : (registrationFee || 0),
      eligibility: eligibility || 'all',
      registrationLimit, eventTags: eventTags || [],
      organizerId: organizer._id,
      customForm: customForm || { fields: [] },
      merchandiseItems: eventType === 'Merchandise' ? (merchandiseItems || []) : undefined,
      purchaseLimitPerParticipant: eventType === 'Merchandise' ? (purchaseLimitPerParticipant || 1) : undefined,
    });

    res.status(201).json({ success: true, data: event });
  } catch (err) {
    console.error('createEvent:', err);
    if (err.name === 'ValidationError') {
      const messages = Object.values(err.errors).map(e => e.message);
      return res.status(400).json({ message: messages[0] || 'Validation failed' });
    }
    res.status(500).json({ message: 'Server error', error: err.message });
  }
};

// ─── @desc  Get all events created by the logged-in organizer
// ─── @route GET /api/events/organizer/my
// ─── @access Organizer
const getMyEvents = async (req, res) => {
  try {
    const organizer = await getOrganizerForUser(req.user._id);
    if (!organizer) return res.status(404).json({ message: 'Organizer profile not found' });

    const events = await Event.find({ organizerId: organizer._id }).sort({ createdAt: -1 });
    res.json({ success: true, count: events.length, data: events });
  } catch (err) {
    console.error('getMyEvents:', err);
    res.status(500).json({ message: 'Server error', error: err.message });
  }
};

// ─── @desc  Get single event by id
// ─── @route GET /api/events/:id
// ─── @access Public
const getEventById = async (req, res) => {
  try {
    const event = await Event.findById(req.params.id).populate('organizerId', 'organizerName organizerCategory contactEmail');
    if (!event) return res.status(404).json({ message: 'Event not found' });
    res.json({ success: true, data: event });
  } catch (err) {
    console.error('getEventById:', err);
    res.status(500).json({ message: 'Server error', error: err.message });
  }
};

// ─── @desc  Browse/search events (participants)
// ─── @route GET /api/events
// ─── @access Public
const getEvents = async (req, res) => {
  try {
    const { search, eventType, eligibility, dateFrom, dateTo, trending, organizerId, followed } = req.query;

    const filter = { status: { $in: ['Published', 'Ongoing'] } };

    if (eventType) filter.eventType = eventType;
    if (eligibility) filter.eligibility = eligibility;
    if (organizerId) filter.organizerId = organizerId;
    if (dateFrom || dateTo) {
      filter.startDate = {};
      if (dateFrom) filter.startDate.$gte = new Date(dateFrom);
      if (dateTo) filter.startDate.$lte = new Date(dateTo);
    }
    if (search) {
      // Build a fuzzy regex: insert optional wildcard (.?) between each character
      // so "hackthon" matches "hackathon", "evnt" matches "event", etc.
      const escaped = search.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const fuzzyPattern = escaped.split('').join('.*?');
      const fuzzyRegex = { $regex: fuzzyPattern, $options: 'i' };

      // Also do a plain partial match (substring)
      const partialRegex = { $regex: escaped, $options: 'i' };

      // Find organizers matching either fuzzy or partial
      const matchingOrganizers = await Organizer.find({
        $or: [
          { organizerName: fuzzyRegex },
          { organizerName: partialRegex },
        ]
      }).select('_id');
      const matchingOrgIds = matchingOrganizers.map(o => o._id);

      filter.$or = [
        { eventName: fuzzyRegex },
        { eventName: partialRegex },
        { eventTags: partialRegex },
      ];
      if (matchingOrgIds.length > 0) {
        filter.$or.push({ organizerId: { $in: matchingOrgIds } });
      }
    }

    // Followed-clubs filter: restrict to organizers the participant follows
    if (followed === 'true') {
      if (req.user && req.user.role === 'participant') {
        const participant = await Participant.findOne({ userId: req.user._id }).select('followedOrganizers');
        const followedIds = participant?.followedOrganizers || [];
        if (followedIds.length === 0) {
          // Following nobody — return empty list immediately
          return res.json({ success: true, count: 0, data: [] });
        }
        filter.organizerId = { $in: followedIds };
      }
      // If not authenticated or wrong role, just ignore the filter silently
    }

    let query = Event.find(filter).populate('organizerId', 'organizerName organizerCategory');

    if (trending === 'true') {
      // Top-5 events by registrationCount in last 24h
      const since = new Date(Date.now() - 24 * 60 * 60 * 1000);
      filter.updatedAt = { $gte: since };
      query = Event.find(filter)
        .populate('organizerId', 'organizerName organizerCategory')
        .sort({ registrationCount: -1 })
        .limit(5);
    } else {
      query = query.sort({ createdAt: -1 });
    }

    const events = await query;
    res.json({ success: true, count: events.length, data: events });
  } catch (err) {
    console.error('getEvents:', err);
    res.status(500).json({ message: 'Server error', error: err.message });
  }
};

// ─── @desc  Update event (rules depend on status)
// ─── @route PATCH /api/events/:id
// ─── @access Organizer (owner)
const updateEvent = async (req, res) => {
  try {
    const organizer = await getOrganizerForUser(req.user._id);
    if (!organizer) return res.status(404).json({ message: 'Organizer profile not found' });

    const event = await Event.findById(req.params.id);
    if (!event) return res.status(404).json({ message: 'Event not found' });
    if (String(event.organizerId) !== String(organizer._id))
      return res.status(403).json({ message: 'Not your event' });

    const { status } = event;
    const body = req.body;

    if (status === 'Ongoing' || status === 'Completed' || status === 'Closed') {
      return res.status(400).json({ message: `Cannot edit a ${status} event` });
    }

    if (status === 'Draft') {
      // Free edits on all fields
      const allowed = [
        'eventName', 'description', 'startDate', 'endDate', 'registrationDeadline',
        'location', 'registrationFee', 'eligibility', 'registrationLimit',
        'eventTags', 'customForm', 'merchandiseItems', 'purchaseLimitPerParticipant',
      ];
      // Block customForm edits if form is locked (after first registration)
      if (body.customForm && event.customForm?.isLocked) {
        return res.status(400).json({ message: 'Registration form is locked — it cannot be edited after the first registration is received' });
      }
      allowed.forEach(f => { if (body[f] !== undefined) event[f] = body[f]; });

      // Validate dates if provided
      const sd = event.startDate, ed = event.endDate, rd = event.registrationDeadline;
      if (sd && ed && new Date(ed) <= new Date(sd)) {
        return res.status(400).json({ message: 'End date must be after start date' });
      }
      if (sd && rd && ed && new Date(rd) > new Date(ed)) {
        return res.status(400).json({ message: 'Registration deadline cannot be after the event end date' });
      }
      // Validate merch items
      if (body.merchandiseItems && event.eventType === 'Merchandise') {
        for (let i = 0; i < event.merchandiseItems.length; i++) {
          const item = event.merchandiseItems[i];
          if (!item.name?.trim()) return res.status(400).json({ message: `Item ${i + 1}: Name is required` });
          if (item.price == null || item.price < 0) return res.status(400).json({ message: `Item ${i + 1}: Price cannot be negative` });
          if (item.stockQuantity != null && item.stockQuantity < 0) return res.status(400).json({ message: `Item ${i + 1}: Stock cannot be negative` });
        }
      }
    }

    // Track changes for Published event Discord notifications
    const changedFields = [];

    if (status === 'Published') {
      // Limited edits only
      if (body.description !== undefined && body.description !== event.description) {
        event.description = body.description;
        changedFields.push('Description');
      }
      if (body.registrationDeadline !== undefined) {
        const newDL = new Date(body.registrationDeadline);
        const curDL = new Date(event.registrationDeadline);
        if (newDL.getTime() > curDL.getTime()) {
          event.registrationDeadline = body.registrationDeadline;
          changedFields.push('Registration Deadline (extended)');
        } else if (newDL.getTime() < curDL.getTime())
          return res.status(400).json({ message: 'Can only extend the deadline, not shorten it' });
        // If equal, silently ignore — no change needed
      }
      if (body.registrationLimit !== undefined) {
        const newLimit = Number(body.registrationLimit);
        const curLimit = event.registrationLimit || 0;
        if (newLimit > curLimit) {
          event.registrationLimit = newLimit;
          changedFields.push(`Registration Limit (increased to ${newLimit})`);
        } else if (newLimit < curLimit)
          return res.status(400).json({ message: 'Can only increase the registration limit' });
        // If equal, silently ignore — no change needed
      }
    }

    await event.save();

    // Discord notification for Published event updates
    if (status === 'Published' && changedFields.length > 0) {
      setImmediate(async () => {
        try {
          const orgDoc = await Organizer.findById(organizer._id).select('discordWebhookUrl organizerName');
          if (orgDoc?.discordWebhookUrl) {
            sendEventUpdatedEmbed(orgDoc.discordWebhookUrl, event, changedFields, orgDoc.organizerName).catch(() => { });
          }
        } catch (_) { }
      });
    }

    res.json({ success: true, data: event });
  } catch (err) {
    console.error('updateEvent:', err);
    if (err.name === 'ValidationError') {
      const messages = Object.values(err.errors).map(e => e.message);
      return res.status(400).json({ message: messages[0] || 'Validation failed' });
    }
    res.status(500).json({ message: 'Server error', error: err.message });
  }
};

// ─── @desc  Publish a Draft event
// ─── @route PATCH /api/events/:id/publish
// ─── @access Organizer (owner)
const publishEvent = async (req, res) => {
  try {
    const organizer = await getOrganizerForUser(req.user._id);
    if (!organizer) return res.status(404).json({ message: 'Organizer profile not found' });
    const event = await Event.findById(req.params.id);
    if (!event) return res.status(404).json({ message: 'Event not found' });
    if (String(event.organizerId) !== String(organizer._id))
      return res.status(403).json({ message: 'Not your event' });
    if (event.status !== 'Draft')
      return res.status(400).json({ message: 'Only Draft events can be published' });

    // Validate required fields before publishing
    if (!event.startDate || !event.endDate || !event.registrationDeadline) {
      return res.status(400).json({ message: 'Start date, end date, and registration deadline are required to publish' });
    }
    if (new Date(event.endDate) <= new Date(event.startDate)) {
      return res.status(400).json({ message: 'End date must be after start date' });
    }
    if (new Date(event.registrationDeadline) > new Date(event.endDate)) {
      return res.status(400).json({ message: 'Registration deadline cannot be after the event end date' });
    }
    if (event.eventType === 'Merchandise') {
      if (!event.merchandiseItems || event.merchandiseItems.length === 0) {
        return res.status(400).json({ message: 'Merchandise events must have at least one item before publishing' });
      }
      for (let i = 0; i < event.merchandiseItems.length; i++) {
        const item = event.merchandiseItems[i];
        if (!item.name?.trim()) return res.status(400).json({ message: `Item ${i + 1}: Name is required` });
        if (!item.price || item.price <= 0) return res.status(400).json({ message: `Item ${i + 1}: Price must be greater than 0` });
        if (item.stockQuantity == null || item.stockQuantity < 0) return res.status(400).json({ message: `Item ${i + 1}: Stock quantity cannot be negative` });
      }
    }

    event.status = 'Published';
    await event.save();

    // Post to Discord if organizer has webhook configured
    try {
      const orgDoc = await Organizer.findById(organizer._id);
      if (orgDoc?.discordWebhookUrl) {
        await sendEventPublishedEmbed(orgDoc.discordWebhookUrl, event, orgDoc.organizerName);
      }
    } catch (discordErr) { console.error('Discord publish error:', discordErr.message); }

    // Notify all followers of this organizer about the new event
    setImmediate(async () => {
      try {
        const orgDoc = await Organizer.findById(organizer._id).select('followedBy organizerName');
        if (orgDoc?.followedBy?.length > 0) {
          // Get userId for each follower participant
          const followers = await Participant.find({ _id: { $in: orgDoc.followedBy } }).select('userId');
          const notifPromises = followers.map(f =>
            createNotification({
              userId: f.userId,
              type: 'event_published',
              title: `New Event: ${event.eventName}`,
              message: `${orgDoc.organizerName} just published a new event: ${event.eventName}. Check it out!`,
            })
          );
          await Promise.allSettled(notifPromises);
        }
      } catch (notifErr) {
        console.error('Event publish notification failed:', notifErr.message);
      }
    });

    res.json({ success: true, data: event });
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
};

// ─── @desc  Close registrations for a Published event
// ─── @route PATCH /api/events/:id/close
// ─── @access Organizer (owner)
const closeEvent = async (req, res) => {
  try {
    const organizer = await getOrganizerForUser(req.user._id);
    if (!organizer) return res.status(404).json({ message: 'Organizer profile not found' });
    const event = await Event.findById(req.params.id);
    if (!event) return res.status(404).json({ message: 'Event not found' });
    if (String(event.organizerId) !== String(organizer._id))
      return res.status(403).json({ message: 'Not your event' });
    if (!['Published', 'Ongoing'].includes(event.status))
      return res.status(400).json({ message: 'Event cannot be closed from its current status' });

    event.status = 'Closed';
    await event.save();

    // Discord notification
    setImmediate(async () => {
      try {
        const orgDoc = await Organizer.findById(organizer._id).select('discordWebhookUrl organizerName');
        if (orgDoc?.discordWebhookUrl) {
          sendEventClosedEmbed(orgDoc.discordWebhookUrl, event, orgDoc.organizerName).catch(() => { });
        }
      } catch (_) { }
    });

    res.json({ success: true, data: event });
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
};

// ─── @desc  Mark event as Completed
// ─── @route PATCH /api/events/:id/complete
// ─── @access Organizer (owner)
const completeEvent = async (req, res) => {
  try {
    const organizer = await getOrganizerForUser(req.user._id);
    if (!organizer) return res.status(404).json({ message: 'Organizer profile not found' });
    const event = await Event.findById(req.params.id);
    if (!event) return res.status(404).json({ message: 'Event not found' });
    if (String(event.organizerId) !== String(organizer._id))
      return res.status(403).json({ message: 'Not your event' });
    if (!['Ongoing', 'Closed'].includes(event.status))
      return res.status(400).json({ message: 'Only Ongoing or Closed events can be completed' });

    event.status = 'Completed';
    await event.save();

    // Discord notification
    setImmediate(async () => {
      try {
        const orgDoc = await Organizer.findById(organizer._id).select('discordWebhookUrl organizerName');
        if (orgDoc?.discordWebhookUrl) {
          sendEventCompletedEmbed(orgDoc.discordWebhookUrl, event, orgDoc.organizerName).catch(() => { });
        }
      } catch (_) { }
    });

    res.json({ success: true, data: event });
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
};

// ─── @desc  Delete a Draft event
// ─── @route DELETE /api/events/:id
// ─── @access Organizer (owner)
const deleteEvent = async (req, res) => {
  try {
    const organizer = await getOrganizerForUser(req.user._id);
    if (!organizer) return res.status(404).json({ message: 'Organizer profile not found' });
    const event = await Event.findById(req.params.id);
    if (!event) return res.status(404).json({ message: 'Event not found' });
    if (String(event.organizerId) !== String(organizer._id))
      return res.status(403).json({ message: 'Not your event' });
    if (event.status !== 'Draft')
      return res.status(400).json({ message: 'Only Draft events can be deleted' });

    await Event.findByIdAndDelete(req.params.id);
    res.json({ success: true, message: 'Event deleted' });
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
};

// ─── @desc  Get registrations for an event (organizer view)
// ─── @route GET /api/events/:id/registrations
// ─── @access Organizer (owner)
const getEventRegistrations = async (req, res) => {
  try {
    const organizer = await getOrganizerForUser(req.user._id);
    if (!organizer) return res.status(404).json({ message: 'Organizer profile not found' });
    const event = await Event.findById(req.params.id);
    if (!event) return res.status(404).json({ message: 'Event not found' });
    if (String(event.organizerId) !== String(organizer._id))
      return res.status(403).json({ message: 'Not your event' });

    // Return registrations with participant details populated
    const registrations = await Registration.find({ eventId: event._id })
      .populate({
        path: 'participantId',
        populate: { path: 'userId', select: 'email' },
        select: 'firstName lastName contactNumber participantType collegeName userId',
      })
      .sort({ createdAt: -1 });

    res.json({ success: true, count: registrations.length, data: registrations });
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
};

module.exports = {
  createEvent,
  getMyEvents,
  getEventById,
  getEvents,
  updateEvent,
  publishEvent,
  closeEvent,
  completeEvent,
  deleteEvent,
  getEventRegistrations,
};
