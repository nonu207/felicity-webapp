const Participant = require('../models/Participant');
const Organizer = require('../models/Organizer');

// ─────────────────────────────────────────────
// @desc    Complete or skip onboarding (participants only)
// @route   PATCH /api/participant/onboarding
// @access  Private (Participant)
// ─────────────────────────────────────────────
const completeOnboarding = async (req, res) => {
    try {
        const { interests, followedOrganizers } = req.body;
        // interests: string[] — e.g. ['Music', 'Tech']
        // followedOrganizers: ObjectId[] — organizer _ids

        const participant = await Participant.findOne({ userId: req.user._id });
        if (!participant) {
            return res.status(404).json({ message: 'Participant profile not found' });
        }

        // Only save if values are provided; skip means we just flip the flag
        if (interests && Array.isArray(interests)) {
            participant.interests = interests;
        }

        if (followedOrganizers && Array.isArray(followedOrganizers)) {
            participant.followedOrganizers = followedOrganizers;

            // Keep Organizer.followedBy in sync
            // Remove participant from all organizers, then re-add to selected ones
            await Organizer.updateMany(
                { followedBy: participant._id },
                { $pull: { followedBy: participant._id } }
            );
            if (followedOrganizers.length > 0) {
                await Organizer.updateMany(
                    { _id: { $in: followedOrganizers } },
                    { $addToSet: { followedBy: participant._id } }
                );
            }
        }

        participant.onboardingComplete = true;
        await participant.save();

        res.status(200).json({
            success: true,
            message: 'Onboarding complete',
            data: participant
        });
    } catch (error) {
        console.error('Error in completeOnboarding:', error);
        res.status(500).json({ message: 'Server error', error: error.message });
    }
};

// ─────────────────────────────────────────────
// @desc    Get own participant profile
// @route   GET /api/participant/profile
// @access  Private (Participant)
// ─────────────────────────────────────────────
const getProfile = async (req, res) => {
    try {
        const participant = await Participant.findOne({ userId: req.user._id })
            .populate('followedOrganizers', 'organizerName organizerCategory organizerDescription');

        if (!participant) {
            return res.status(404).json({ message: 'Participant profile not found' });
        }

        res.status(200).json({
            success: true,
            data: {
                ...participant.toObject(),
                email: req.user.email,            // email lives on User, surface it here
                participantType: participant.participantType  // non-editable
            }
        });
    } catch (error) {
        console.error('Error in getProfile:', error);
        res.status(500).json({ message: 'Server error', error: error.message });
    }
};

// ─────────────────────────────────────────────
// @desc    Update own participant profile
// @route   PATCH /api/participant/profile
// @access  Private (Participant)
// Editable: firstName, lastName, contactNumber, collegeName, interests, followedOrganizers
// Non-editable: email, participantType (enforced here)
// ─────────────────────────────────────────────
const updateProfile = async (req, res) => {
    try {
        const { firstName, lastName, contactNumber, collegeName, interests, followedOrganizers } = req.body;

        const participant = await Participant.findOne({ userId: req.user._id });
        if (!participant) {
            return res.status(404).json({ message: 'Participant profile not found' });
        }

        if (firstName) participant.firstName = firstName;
        if (lastName) participant.lastName = lastName;
        if (contactNumber) participant.contactNumber = contactNumber;
        if (collegeName) participant.collegeName = collegeName;
        if (interests && Array.isArray(interests)) participant.interests = interests;

        // Update followed organizers + keep Organizer.followedBy in sync
        if (followedOrganizers && Array.isArray(followedOrganizers)) {
            await Organizer.updateMany(
                { followedBy: participant._id },
                { $pull: { followedBy: participant._id } }
            );
            if (followedOrganizers.length > 0) {
                await Organizer.updateMany(
                    { _id: { $in: followedOrganizers } },
                    { $addToSet: { followedBy: participant._id } }
                );
            }
            participant.followedOrganizers = followedOrganizers;
        }

        await participant.save();

        res.status(200).json({
            success: true,
            message: 'Profile updated successfully',
            data: participant
        });
    } catch (error) {
        console.error('Error in updateProfile:', error);
        res.status(500).json({ message: 'Server error', error: error.message });
    }
};

// ─────────────────────────────────────────────
// @desc    Follow an organizer
// @route   POST /api/participant/follow/:organizerId
// @access  Private (Participant)
// ─────────────────────────────────────────────
const followOrganizer = async (req, res) => {
    try {
        const { organizerId } = req.params;

        const organizer = await Organizer.findById(organizerId);
        if (!organizer) {
            return res.status(404).json({ message: 'Organizer not found' });
        }

        const participant = await Participant.findOne({ userId: req.user._id });
        if (!participant) {
            return res.status(404).json({ message: 'Participant profile not found' });
        }

        // Idempotent — addToSet prevents duplicates
        await Participant.findByIdAndUpdate(participant._id, {
            $addToSet: { followedOrganizers: organizerId }
        });
        await Organizer.findByIdAndUpdate(organizerId, {
            $addToSet: { followedBy: participant._id }
        });

        res.status(200).json({
            success: true,
            message: `Now following ${organizer.organizerName}`
        });
    } catch (error) {
        console.error('Error in followOrganizer:', error);
        res.status(500).json({ message: 'Server error', error: error.message });
    }
};

// ─────────────────────────────────────────────
// @desc    Unfollow an organizer
// @route   DELETE /api/participant/follow/:organizerId
// @access  Private (Participant)
// ─────────────────────────────────────────────
const unfollowOrganizer = async (req, res) => {
    try {
        const { organizerId } = req.params;

        const participant = await Participant.findOne({ userId: req.user._id });
        if (!participant) {
            return res.status(404).json({ message: 'Participant profile not found' });
        }

        await Participant.findByIdAndUpdate(participant._id, {
            $pull: { followedOrganizers: organizerId }
        });
        await Organizer.findByIdAndUpdate(organizerId, {
            $pull: { followedBy: participant._id }
        });

        res.status(200).json({
            success: true,
            message: 'Unfollowed successfully'
        });
    } catch (error) {
        console.error('Error in unfollowOrganizer:', error);
        res.status(500).json({ message: 'Server error', error: error.message });
    }
};

// ─────────────────────────────────────────────
// @desc    List all active organizers (for onboarding + clubs listing page)
// @route   GET /api/participant/organizers
// @access  Private (Participant) — also usable as public if needed
// ─────────────────────────────────────────────
const getAllOrganizers = async (req, res) => {
    try {
        // Exclude archived organizers
        const organizers = await Organizer.find({ isArchived: false })
            .select('organizerName organizerCategory organizerDescription contactEmail followedBy')
            .sort({ organizerName: 1 });

        // Enrich each organizer with a _followed flag for the logged-in participant
        let followedSet = new Set();
        if (req.user) {
            const participant = await Participant.findOne({ userId: req.user._id }).select('followedOrganizers');
            if (participant && participant.followedOrganizers) {
                followedSet = new Set(participant.followedOrganizers.map(id => id.toString()));
            }
        }

        const enriched = organizers.map(org => ({
            ...org.toObject(),
            _followed: followedSet.has(org._id.toString()),
        }));

        res.status(200).json({
            success: true,
            count: enriched.length,
            data: enriched
        });
    } catch (error) {
        console.error('Error in getAllOrganizers:', error);
        res.status(500).json({ message: 'Server error', error: error.message });
    }
};

// ─────────────────────────────────────────────
// @desc    Get a single organizer's public profile + their events
// @route   GET /api/participant/organizers/:id
// @access  Private (Participant)
// ─────────────────────────────────────────────
const getOrganizerDetail = async (req, res) => {
    try {
        const organizer = await Organizer.findOne({
            _id: req.params.id,
            isArchived: false
        }).select('-followedBy -discordWebhookUrl -userId');

        if (!organizer) {
            return res.status(404).json({ message: 'Organizer not found' });
        }

        // Fetch organizer's upcoming and past events
        const Event = require('../models/Event');
        const now = new Date();
        const [upcomingEvents, pastEvents] = await Promise.all([
            Event.find({
                organizerId: organizer._id,
                status: { $in: ['Published', 'Ongoing'] },
                startDate: { $gte: now }
            }).select('eventName eventType startDate endDate registrationFee eligibility status'),
            Event.find({
                organizerId: organizer._id,
                status: { $in: ['Completed', 'Closed'] }
            }).select('eventName eventType startDate endDate status').sort({ startDate: -1 }).limit(10)
        ]);

        // Check if the logged-in participant follows this organizer
        let _followed = false;
        if (req.user) {
            const participant = await Participant.findOne({ userId: req.user._id }).select('followedOrganizers');
            if (participant && participant.followedOrganizers) {
                _followed = participant.followedOrganizers.some(id => id.toString() === organizer._id.toString());
            }
        }

        res.status(200).json({
            success: true,
            data: {
                organizer: { ...organizer.toObject(), _followed },
                upcomingEvents,
                pastEvents
            }
        });
    } catch (error) {
        console.error('Error in getOrganizerDetail:', error);
        res.status(500).json({ message: 'Server error', error: error.message });
    }
};

module.exports = {
    completeOnboarding,
    getProfile,
    updateProfile,
    followOrganizer,
    unfollowOrganizer,
    getAllOrganizers,
    getOrganizerDetail
};