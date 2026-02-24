const { randomUUID } = require('crypto');
const QRCode = require('qrcode');
const Registration = require('../models/Registration');
const Event = require('../models/Event');
const Participant = require('../models/Participant');
const User = require('../models/User');
const Organizer = require('../models/Organizer');
const { sendRegistrationConfirmationEmail } = require('../utils/emailService');
const { createNotification } = require('./notificationController');
const { sendRegistrationMilestoneEmbed } = require('../utils/discordService');

// ─────────────────────────────────────────────────────────────────────────────
// Internal helpers
// ─────────────────────────────────────────────────────────────────────────────

const getParticipant = (userId) => Participant.findOne({ userId });

// ─────────────────────────────────────────────────────────────────────────────
// @desc   Register the logged-in participant for an event
// @route  POST /api/registrations
// @body   { eventId, formResponses?, merchandiseOrder? }
// @access Participant
// ─────────────────────────────────────────────────────────────────────────────
const registerForEvent = async (req, res) => {
  try {
    const participant = await getParticipant(req.user._id);
    if (!participant) return res.status(404).json({ message: 'Participant profile not found' });

    const { eventId, formResponses = [], merchandiseOrder } = req.body;
    if (!eventId) return res.status(400).json({ message: 'eventId is required' });

    // ── 1. Fetch event ────────────────────────────────────────────────────────
    const event = await Event.findById(eventId);
    if (!event) return res.status(404).json({ message: 'Event not found' });

    // ── 2. Status check ───────────────────────────────────────────────────────
    if (!['Published', 'Ongoing'].includes(event.status)) {
      return res.status(400).json({ message: 'Registrations are not open for this event' });
    }

    // ── 3. Registration deadline ──────────────────────────────────────────────
    if (new Date() > new Date(event.registrationDeadline)) {
      return res.status(400).json({ message: 'Registration deadline has passed' });
    }

    // ── 4. Eligibility ────────────────────────────────────────────────────────
    if (event.eligibility === 'iiit-only' && participant.participantType !== 'IIIT') {
      return res.status(403).json({ message: 'This event is open to IIIT participants only' });
    }
    if (event.eligibility === 'non-iiit-only' && participant.participantType !== 'NON_IIIT') {
      return res.status(403).json({ message: 'This event is open to non-IIIT participants only' });
    }

    // ── 5. Registration limit ─────────────────────────────────────────────────
    if (event.registrationLimit && event.registrationCount >= event.registrationLimit) {
      return res.status(400).json({ message: 'This event has reached its registration limit' });
    }

    // ── 6. Duplicate registration ─────────────────────────────────────────────
    const existing = await Registration.findOne({ participantId: participant._id, eventId: event._id });
    if (existing) return res.status(400).json({ message: 'You have already registered for this event' });

    // ── 7. Type-specific validation ───────────────────────────────────────────
    // Validate all custom-form fields (required check + type validation for all fields with values)
    const allFields = event.customForm?.fields || [];
    for (const field of allFields) {
      const response = (formResponses || []).find(r => r.fieldLabel === field.fieldLabel);
      const hasAnswer = response && response.answer !== undefined && response.answer !== '' &&
        !(Array.isArray(response.answer) && response.answer.length === 0);

      // Required-field presence check
      if (field.isRequired && !hasAnswer) {
        return res.status(400).json({ message: `Required field missing: "${field.fieldLabel}"` });
      }

      // Type-specific validation (runs for ANY field that has a value, required or not)
      if (hasAnswer && response) {
        const val = String(response.answer).trim();
        if (field.fieldType === 'email') {
          const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
          if (!emailRegex.test(val)) {
            return res.status(400).json({ message: `Invalid email address for "${field.fieldLabel}"` });
          }
        }
        if (field.fieldType === 'phone') {
          const phoneRegex = /^\+?[\d\s\-()]{7,15}$/;
          if (!phoneRegex.test(val)) {
            return res.status(400).json({ message: `Invalid phone number for "${field.fieldLabel}". Use 7-15 digits.` });
          }
        }
        if (field.fieldType === 'number') {
          if (isNaN(Number(val))) {
            return res.status(400).json({ message: `"${field.fieldLabel}" requires a valid number` });
          }
          const numVal = Number(val);
          if (field.min !== undefined && field.min !== null && numVal < field.min) {
            return res.status(400).json({ message: `"${field.fieldLabel}" must be at least ${field.min}` });
          }
          if (field.max !== undefined && field.max !== null && numVal > field.max) {
            return res.status(400).json({ message: `"${field.fieldLabel}" must be at most ${field.max}` });
          }
        }
      }
    }

    if (event.eventType === 'Merchandise') {
      if (!merchandiseOrder) {
        return res.status(400).json({ message: 'merchandiseOrder is required for Merchandise events' });
      }
      const { itemId, quantity = 1 } = merchandiseOrder;
      if (!itemId) return res.status(400).json({ message: 'merchandiseOrder.itemId is required' });

      const item = event.merchandiseItems.id(itemId);
      if (!item) return res.status(404).json({ message: 'Merchandise item not found in this event' });

      if (quantity < 1) return res.status(400).json({ message: 'Quantity must be at least 1' });
      if (quantity > (event.purchaseLimitPerParticipant || 1)) {
        return res.status(400).json({
          message: `You can purchase at most ${event.purchaseLimitPerParticipant} unit(s) of this item`,
        });
      }
      if (item.stockQuantity < quantity) {
        return res.status(400).json({
          message: `Not enough stock. Only ${item.stockQuantity} unit(s) remaining`,
        });
      }
    }

    // ── 8. Determine payment status ──────────────────────────────────────────
    let isPaid;
    if (event.eventType === 'Merchandise') {
      // For merch events, use the item price to determine payment requirement
      const selectedItem = event.merchandiseItems.id(merchandiseOrder.itemId);
      isPaid = (selectedItem?.price || 0) > 0;
    } else {
      isPaid = event.registrationFee > 0;
    }
    const paymentStatus = isPaid ? 'PendingApproval' : 'Free';

    // ── 8b. Build ticket ID and QR data ───────────────────────────────────────
    // For paid events (PendingApproval), no ticketId or QR yet — generated on approval.
    let ticketId = undefined;
    let qrData = undefined;
    if (!isPaid) {
      ticketId = `TKT-${randomUUID().replace(/-/g, '').slice(0, 8).toUpperCase()}`;
      const qrPayload = JSON.stringify({ ticketId, eventId: event._id, participantId: participant._id });
      qrData = await QRCode.toDataURL(qrPayload);
    }

    // ── 9. Build registration payload ─────────────────────────────────────────
    const regPayload = {
      participantId: participant._id,
      eventId: event._id,
      registrationType: event.eventType,
      paymentStatus,
    };
    // Only set ticketId/qrData if generated (omit entirely for paid events so sparse index works)
    if (ticketId) regPayload.ticketId = ticketId;
    if (qrData) regPayload.qrData = qrData;

    // Save form responses if custom form has fields (all event types)
    if (event.customForm?.fields?.length > 0 && formResponses) {
      regPayload.formResponses = formResponses;
    }

    if (event.eventType === 'Merchandise') {
      const { itemId, quantity = 1 } = merchandiseOrder;
      const item = event.merchandiseItems.id(itemId);
      regPayload.merchandiseOrder = {
        itemId,
        itemName: item.name,
        size: item.size,
        color: item.color,
        variant: item.variant,
        quantity,
        priceAtPurchase: item.price,
      };
    }

    // ── 10. Persist — atomically decrement stock (Merch + Free) + increment count ─
    // For PendingApproval merch orders, stock is NOT decremented here.
    // It will be decremented atomically when the organizer approves the payment.
    if (event.eventType === 'Merchandise' && !isPaid) {
      const { itemId, quantity = 1 } = merchandiseOrder;
      // Atomic stock decrement with a guard so it never goes below 0
      const updated = await Event.findOneAndUpdate(
        {
          _id: event._id,
          'merchandiseItems._id': itemId,
          'merchandiseItems.stockQuantity': { $gte: quantity },
        },
        { $inc: { 'merchandiseItems.$.stockQuantity': -quantity } },
        { new: true }
      );
      if (!updated) {
        return res.status(400).json({ message: 'Stock was just claimed by another order. Please try again.' });
      }
    }

    const registration = await Registration.create(regPayload);

    // Increment event registration count
    await Event.findByIdAndUpdate(event._id, { $inc: { registrationCount: 1 } });

    // Discord milestone notifications (fire-and-forget)
    const MILESTONES = [10, 25, 50, 100, 250, 500, 1000];
    const newCount = (event.registrationCount || 0) + 1;
    if (MILESTONES.includes(newCount)) {
      setImmediate(async () => {
        try {
          const orgDoc = await Organizer.findById(event.organizerId).select('discordWebhookUrl organizerName');
          if (orgDoc?.discordWebhookUrl) {
            sendRegistrationMilestoneEmbed(orgDoc.discordWebhookUrl, event, newCount, orgDoc.organizerName).catch(() => {});
          }
        } catch (_) {}
      });
    }

    // Lock custom form after first registration (Normal events)
    // Lock custom form after first registration (if form has fields)
    if (event.customForm?.fields?.length > 0 && !event.customForm.isLocked) {
      await Event.findByIdAndUpdate(event._id, { 'customForm.isLocked': true });
    }

    // ── 11. In-app notification + confirmation email (non-blocking) ──────────
    // Create in-app notification
    const isPending = registration.paymentStatus === 'PendingApproval';
    const paymentNote = isPending
      ? ' Your payment is pending organizer approval. You will receive your ticket once approved.'
      : '';
    const ticketNote = registration.ticketId
      ? ` Your ticket ID is ${registration.ticketId}.`
      : '';
    await createNotification({
      userId: req.user._id,
      type: 'registration_confirmed',
      title: `Registered for ${event.eventName}`,
      message: `You have successfully registered for ${event.eventName}.${ticketNote}${paymentNote}`,
    });

    // Only send confirmation email with QR for free events (paid events get email on approval)
    if (!isPending) {
      setImmediate(async () => {
        try {
          const userDoc = await User.findById(req.user._id).select('email');
          if (userDoc?.email) {
            await sendRegistrationConfirmationEmail(
              userDoc.email,
              participant.firstName,
              {
                eventName: event.eventName,
                eventType: event.eventType,
                startDate: event.startDate,
                endDate: event.endDate,
                location: event.location,
                registrationFee: event.registrationFee,
              },
              registration.ticketId,
              registration.qrData,
              registration.paymentStatus,
            );
          }
        } catch (emailErr) {
          console.error('Registration confirmation email failed (registration still saved):', emailErr.message);
        }
      });
    }

    res.status(201).json({
      success: true,
      message: 'Registration successful',
      data: {
        registrationId: registration._id,
        ticketId: registration.ticketId || null,
        qrData: registration.qrData || null,
        eventName: event.eventName,
        eventType: event.eventType,
        startDate: event.startDate,
        location: event.location,
        paymentStatus: registration.paymentStatus,
        registrationFee: event.registrationFee,
      },
    });
  } catch (err) {
    console.error('registerForEvent:', err);
    if (err.code === 11000) {
      return res.status(400).json({ message: 'You have already registered for this event' });
    }
    res.status(500).json({ message: 'Server error', error: err.message });
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// @desc   Get all registrations for the logged-in participant
// @route  GET /api/registrations/my
// @access Participant
// ─────────────────────────────────────────────────────────────────────────────
const getMyRegistrations = async (req, res) => {
  try {
    const participant = await getParticipant(req.user._id);
    if (!participant) return res.status(404).json({ message: 'Participant profile not found' });

    const registrations = await Registration.find({ participantId: participant._id })
      .populate('eventId', 'eventName eventType startDate endDate location registrationFee organizerId status')
      .sort({ createdAt: -1 });

    res.json({ success: true, count: registrations.length, data: registrations });
  } catch (err) {
    console.error('getMyRegistrations:', err);
    res.status(500).json({ message: 'Server error', error: err.message });
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// @desc   Get a single ticket by ticketId (for QR display / verification)
// @route  GET /api/registrations/ticket/:ticketId
// @access Participant (own ticket) or Organizer
// ─────────────────────────────────────────────────────────────────────────────
const getTicket = async (req, res) => {
  try {
    const registration = await Registration.findOne({ ticketId: req.params.ticketId })
      .populate('eventId', 'eventName eventType startDate endDate location organizerId')
      .populate('participantId', 'firstName lastName contactNumber participantType');

    if (!registration) return res.status(404).json({ message: 'Ticket not found' });

    // Only the ticket owner or the event organizer should see it
    const participant = await getParticipant(req.user._id);
    const isOwner = participant && String(registration.participantId._id) === String(participant._id);
    const isOrganizer = req.user.role === 'organizer';
    if (!isOwner && !isOrganizer) {
      return res.status(403).json({ message: 'Access denied' });
    }

    res.json({ success: true, data: registration });
  } catch (err) {
    console.error('getTicket:', err);
    res.status(500).json({ message: 'Server error', error: err.message });
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// @desc   Cancel a registration (participant can cancel their own)
// @route  PATCH /api/registrations/:id/cancel
// @access Participant (owner only)
// ─────────────────────────────────────────────────────────────────────────────
const cancelRegistration = async (req, res) => {
  try {
    const participant = await getParticipant(req.user._id);
    if (!participant) return res.status(404).json({ message: 'Participant profile not found' });

    const registration = await Registration.findById(req.params.id);
    if (!registration) return res.status(404).json({ message: 'Registration not found' });
    if (String(registration.participantId) !== String(participant._id)) {
      return res.status(403).json({ message: 'You can only cancel your own registrations' });
    }
    if (registration.status === 'Cancelled') {
      return res.status(400).json({ message: 'Registration is already cancelled' });
    }

    // Only allow cancellation before the event starts
    const event = await Event.findById(registration.eventId);
    if (event && new Date() >= new Date(event.startDate)) {
      return res.status(400).json({ message: 'Cannot cancel after the event has started' });
    }

    registration.status = 'Cancelled';
    await registration.save();

    // Restore event counts/stock
    await Event.findByIdAndUpdate(registration.eventId, { $inc: { registrationCount: -1 } });

    if (registration.registrationType === 'Merchandise' && registration.merchandiseOrder) {
      // Only restore stock if it was actually decremented (Paid or Free orders)
      // PendingApproval orders never had stock decremented
      if (['Paid', 'Free'].includes(registration.paymentStatus)) {
        await Event.findOneAndUpdate(
          { _id: registration.eventId, 'merchandiseItems._id': registration.merchandiseOrder.itemId },
          { $inc: { 'merchandiseItems.$.stockQuantity': registration.merchandiseOrder.quantity } }
        );
      }
    }

    // Decrement totalRevenue if the cancelled registration was Paid
    if (registration.paymentStatus === 'Paid') {
      let orderRevenue = 0;
      if (registration.registrationType === 'Merchandise' && registration.merchandiseOrder) {
        orderRevenue = (registration.merchandiseOrder.priceAtPurchase || 0) * (registration.merchandiseOrder.quantity || 1);
      } else {
        orderRevenue = event?.registrationFee || 0;
      }
      if (orderRevenue > 0) {
        await Event.findByIdAndUpdate(registration.eventId, { $inc: { totalRevenue: -orderRevenue } });
      }
    }

    // In-app notification for cancellation
    await createNotification({
      userId: req.user._id,
      type: 'registration_cancelled',
      title: 'Registration Cancelled',
      message: `Your registration for ${event?.eventName || 'an event'} has been cancelled.`,
    });

    res.json({ success: true, message: 'Registration cancelled successfully' });
  } catch (err) {
    console.error('cancelRegistration:', err);
    res.status(500).json({ message: 'Server error', error: err.message });
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// @desc   Check if the logged-in participant is registered for an event
// @route  GET /api/registrations/check/:eventId
// @access Participant
// ─────────────────────────────────────────────────────────────────────────────
const checkRegistration = async (req, res) => {
  try {
    const participant = await getParticipant(req.user._id);
    if (!participant) return res.status(404).json({ message: 'Participant profile not found' });

    const registration = await Registration.findOne({
      participantId: participant._id,
      eventId: req.params.eventId,
      status: 'Active',
    });

    res.json({ success: true, registered: !!registration, data: registration || null });
  } catch (err) {
    console.error('checkRegistration:', err);
    res.status(500).json({ message: 'Server error', error: err.message });
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// @desc   Upload payment proof for a registration
// @route  POST /api/registrations/:id/payment-proof
// @access Participant (owner only)
// ─────────────────────────────────────────────────────────────────────────────
const uploadPaymentProofCtrl = async (req, res) => {
  try {
    const participant = await getParticipant(req.user._id);
    if (!participant) return res.status(404).json({ message: 'Participant profile not found' });

    const registration = await Registration.findById(req.params.id);
    if (!registration) return res.status(404).json({ message: 'Registration not found' });
    if (String(registration.participantId) !== String(participant._id)) {
      return res.status(403).json({ message: 'You can only upload proof for your own registrations' });
    }
    if (!['PendingApproval', 'Rejected'].includes(registration.paymentStatus)) {
      return res.status(400).json({ message: 'Payment proof upload is not applicable for this registration' });
    }

    if (!req.file) {
      return res.status(400).json({ message: 'No image file uploaded. Please upload a JPEG, PNG, or WebP image.' });
    }

    // Store relative URL so it can be served statically
    registration.paymentProofUrl = `/uploads/payment-proofs/${req.file.filename}`;
    registration.paymentStatus = 'PendingApproval';
    await registration.save();

    res.json({
      success: true,
      message: 'Payment proof uploaded successfully',
      data: { paymentProofUrl: registration.paymentProofUrl, paymentStatus: registration.paymentStatus },
    });
  } catch (err) {
    console.error('uploadPaymentProof:', err);
    res.status(500).json({ message: 'Server error', error: err.message });
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// @desc   Get all orders for an event (for organizer review)
// @route  GET /api/registrations/event/:eventId/orders
// @access Organizer (event owner)
// ─────────────────────────────────────────────────────────────────────────────
const getOrdersForEvent = async (req, res) => {
  try {
    const Organizer = require('../models/Organizer');
    const organizer = await Organizer.findOne({ userId: req.user._id });
    if (!organizer) return res.status(404).json({ message: 'Organizer profile not found' });

    const event = await Event.findById(req.params.eventId);
    if (!event) return res.status(404).json({ message: 'Event not found' });
    if (String(event.organizerId) !== String(organizer._id)) {
      return res.status(403).json({ message: 'You can only view orders for your own events' });
    }

    const registrations = await Registration.find({ eventId: event._id })
      .populate('participantId', 'firstName lastName contactNumber participantType')
      .sort({ createdAt: -1 });

    res.json({ success: true, count: registrations.length, data: registrations });
  } catch (err) {
    console.error('getOrdersForEvent:', err);
    res.status(500).json({ message: 'Server error', error: err.message });
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// @desc   Approve a payment — decrement stock, generate QR, send email
// @route  PATCH /api/registrations/:id/approve-payment
// @access Organizer (event owner)
// ─────────────────────────────────────────────────────────────────────────────
const approvePayment = async (req, res) => {
  try {
    const Organizer = require('../models/Organizer');
    const organizer = await Organizer.findOne({ userId: req.user._id });
    if (!organizer) return res.status(404).json({ message: 'Organizer profile not found' });

    const registration = await Registration.findById(req.params.id);
    if (!registration) return res.status(404).json({ message: 'Registration not found' });

    const event = await Event.findById(registration.eventId);
    if (!event) return res.status(404).json({ message: 'Event not found' });
    if (String(event.organizerId) !== String(organizer._id)) {
      return res.status(403).json({ message: 'You can only approve payments for your own events' });
    }

    if (!['PendingApproval', 'Rejected'].includes(registration.paymentStatus)) {
      return res.status(400).json({ message: `Cannot approve: payment status is "${registration.paymentStatus}"` });
    }

    // ── Atomically decrement stock for merchandise orders ──
    if (registration.registrationType === 'Merchandise' && registration.merchandiseOrder) {
      const { itemId, quantity } = registration.merchandiseOrder;
      const updated = await Event.findOneAndUpdate(
        {
          _id: event._id,
          'merchandiseItems._id': itemId,
          'merchandiseItems.stockQuantity': { $gte: quantity },
        },
        { $inc: { 'merchandiseItems.$.stockQuantity': -quantity } },
        { new: true }
      );
      if (!updated) {
        return res.status(400).json({ message: 'Not enough stock remaining to approve this order' });
      }
    }

    // ── Generate ticket ID and QR code on approval ──
    const newTicketId = `TKT-${randomUUID().replace(/-/g, '').slice(0, 8).toUpperCase()}`;
    const qrPayload = JSON.stringify({
      ticketId: newTicketId,
      eventId: registration.eventId,
      participantId: registration.participantId,
    });
    const qrData = await QRCode.toDataURL(qrPayload);

    registration.ticketId = newTicketId;
    registration.paymentStatus = 'Paid';
    registration.qrData = qrData;
    await registration.save();

    // ── Increment totalRevenue on the event ──
    let orderRevenue = 0;
    if (registration.registrationType === 'Merchandise' && registration.merchandiseOrder) {
      orderRevenue = (registration.merchandiseOrder.priceAtPurchase || 0) * (registration.merchandiseOrder.quantity || 1);
    } else {
      orderRevenue = event.registrationFee || 0;
    }
    if (orderRevenue > 0) {
      await Event.findByIdAndUpdate(event._id, { $inc: { totalRevenue: orderRevenue } });
    }

    // ── In-app notification for payment approval ──
    const participantForNotif = await Participant.findById(registration.participantId);
    if (participantForNotif) {
      await createNotification({
        userId: participantForNotif.userId,
        type: 'payment_approved',
        title: 'Payment Approved',
        message: `Your payment for ${event.eventName} has been approved. Your ticket (${registration.ticketId}) is now active!`,
      });
    }

    // ── Send confirmation email with QR (non-blocking) ──
    setImmediate(async () => {
      try {
        const userDoc = await User.findById(
          (await Participant.findById(registration.participantId)).userId
        ).select('email');
        const participantDoc = await Participant.findById(registration.participantId);
        if (userDoc?.email) {
          await sendRegistrationConfirmationEmail(
            userDoc.email,
            participantDoc.firstName,
            {
              eventName: event.eventName,
              eventType: event.eventType,
              startDate: event.startDate,
              endDate: event.endDate,
              location: event.location,
              registrationFee: event.registrationFee,
            },
            registration.ticketId,
            registration.qrData,
            'Paid',
          );
        }
      } catch (emailErr) {
        console.error('Approval confirmation email failed:', emailErr.message);
      }
    });

    res.json({
      success: true,
      message: 'Payment approved — ticket generated and email sent',
      data: {
        registrationId: registration._id,
        ticketId: registration.ticketId,
        paymentStatus: registration.paymentStatus,
        qrData: registration.qrData,
      },
    });
  } catch (err) {
    console.error('approvePayment:', err);
    res.status(500).json({ message: 'Server error', error: err.message });
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// @desc   Reject a payment
// @route  PATCH /api/registrations/:id/reject-payment
// @access Organizer (event owner)
// ─────────────────────────────────────────────────────────────────────────────
const rejectPayment = async (req, res) => {
  try {
    const Organizer = require('../models/Organizer');
    const organizer = await Organizer.findOne({ userId: req.user._id });
    if (!organizer) return res.status(404).json({ message: 'Organizer profile not found' });

    const registration = await Registration.findById(req.params.id);
    if (!registration) return res.status(404).json({ message: 'Registration not found' });

    const event = await Event.findById(registration.eventId);
    if (!event) return res.status(404).json({ message: 'Event not found' });
    if (String(event.organizerId) !== String(organizer._id)) {
      return res.status(403).json({ message: 'You can only reject payments for your own events' });
    }

    if (registration.paymentStatus !== 'PendingApproval') {
      return res.status(400).json({ message: `Cannot reject: payment status is "${registration.paymentStatus}"` });
    }

    registration.paymentStatus = 'Rejected';
    // QR stays null — no ticket
    await registration.save();

    // ── In-app notification for payment rejection ──
    const participantForReject = await Participant.findById(registration.participantId);
    if (participantForReject) {
      await createNotification({
        userId: participantForReject.userId,
        type: 'payment_rejected',
        title: 'Payment Rejected',
        message: `Your payment for ${event.eventName} has been rejected. Please re-upload a valid payment proof.`,
      });
    }

    res.json({
      success: true,
      message: 'Payment rejected',
      data: { registrationId: registration._id, paymentStatus: registration.paymentStatus },
    });
  } catch (err) {
    console.error('rejectPayment:', err);
    res.status(500).json({ message: 'Server error', error: err.message });
  }
};

module.exports = {
  registerForEvent,
  getMyRegistrations,
  getTicket,
  cancelRegistration,
  checkRegistration,
  uploadPaymentProofCtrl,
  getOrdersForEvent,
  approvePayment,
  rejectPayment,
};
