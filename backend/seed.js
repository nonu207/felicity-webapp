/**
 * Seed script — populates the database with test users, events, registrations,
 * and some forum messages so you can test the Discussion Forum feature.
 *
 * Usage:  node seed.js
 *
 * ALL PASSWORDS: Test@1234
 */

require('dotenv').config();
const mongoose = require('mongoose');
const QRCode = require('qrcode');
const User = require('./models/User');
const Participant = require('./models/Participant');
const Organizer = require('./models/Organizer');
const Event = require('./models/Event');
const Registration = require('./models/Registration');
const Message = require('./models/Message');
const Notification = require('./models/Notification');

const MONGODB_URI = process.env.MONGODB_URI;
const PASSWORD = 'Test@1234';

async function seed() {
    await mongoose.connect(MONGODB_URI);
    console.log('Connected to MongoDB');

    // ── Clean existing data ─────────────────
    await Promise.all([
        User.deleteMany({}),
        Participant.deleteMany({}),
        Organizer.deleteMany({}),
        Event.deleteMany({}),
        Registration.deleteMany({}),
        Message.deleteMany({}),
        Notification.deleteMany({}),
    ]);
    console.log('Cleared existing data');

    // Let the User model's pre-save hook hash the password automatically
    const pw = PASSWORD;

    // ── Admin ────────────────────────────────
    const adminUser = await User.create({
        email: 'jainsaanvi358+admin@gmail.com',
        password: pw,
        role: 'admin',
    });
    console.log('Created admin: jainsaanvi358+admin@gmail.com / Test@1234');

    // ── Organizers ───────────────────────────
    const org1User = await User.create({
        email: 'jainsaanvi358@gmail.com',
        password: pw,
        role: 'organizer',
    });
    const org1 = await Organizer.create({
        userId: org1User._id,
        organizerName: 'Tech Club IIIT',
        organizerDescription: 'The official tech club of IIIT Hyderabad, organizing hackathons, workshops, and tech talks.',
        organizerCategory: 'Technology',
        contactEmail: 'jainsaanvi358@gmail.com',
    });

    const org2User = await User.create({
        email: 'rachanajain0981@gmail.com',
        password: pw,
        role: 'organizer',
    });
    const org2 = await Organizer.create({
        userId: org2User._id,
        organizerName: 'Cultural Committee',
        organizerDescription: 'Bringing arts, music, and dance to campus life. We organize Felicity cultural events.',
        organizerCategory: 'Cultural',
        contactEmail: 'rachanajain0981@gmail.com',
    });

    const org3User = await User.create({
        email: 'jainsaanvi358+3org@gmail.com',
        password: pw,
        role: 'organizer',
    });
    const org3 = await Organizer.create({
        userId: org3User._id,
        organizerName: 'Sports Club',
        organizerDescription: 'Inter-college sports tournaments and fitness events.',
        organizerCategory: 'Sports',
        contactEmail: 'jainsaanvi358+3org@gmail.com',
    });

    console.log('Created 3 organizers');

    // ── Participants ─────────────────────────
    const p1User = await User.create({
        email: 'jainsaanvi358+1test@gmail.com',
        password: pw,
        role: 'participant',
    });
    const p1 = await Participant.create({
        userId: p1User._id,
        firstName: 'Alice',
        lastName: 'Sharma',
        participantType: 'NON_IIIT',
        collegeName: 'IIT Delhi',
        contactNumber: '9876543210',
        interests: ['Technology', 'AI'],
        onboardingComplete: true,
        profileComplete: true,
    });

    const p2User = await User.create({
        email: 'jainsaanvi358+2test@gmail.com',
        password: pw,
        role: 'participant',
    });
    const p2 = await Participant.create({
        userId: p2User._id,
        firstName: 'Bob',
        lastName: 'Kumar',
        participantType: 'NON_IIIT',
        collegeName: 'BITS Pilani',
        contactNumber: '9876543211',
        interests: ['Cultural', 'Music'],
        onboardingComplete: true,
        profileComplete: true,
    });

    const p3User = await User.create({
        email: 'jainsaanvi358+3test@gmail.com',
        password: pw,
        role: 'participant',
    });
    const p3 = await Participant.create({
        userId: p3User._id,
        firstName: 'Charlie',
        lastName: 'Gupta',
        participantType: 'NON_IIIT',
        collegeName: 'NIT Warangal',
        contactNumber: '9876543212',
        interests: ['Sports', 'Technology'],
        onboardingComplete: true,
        profileComplete: true,
    });

    const p4User = await User.create({
        email: 'jainsaanvi358+4test@gmail.com',
        password: pw,
        role: 'participant',
    });
    const p4 = await Participant.create({
        userId: p4User._id,
        firstName: 'Diana',
        lastName: 'Patel',
        participantType: 'NON_IIIT',
        collegeName: 'IIIT Bangalore',
        contactNumber: '9876543213',
        interests: ['Cultural', 'Dance'],
        onboardingComplete: true,
        profileComplete: true,
    });

    console.log('Created 4 participants');

    // ── Events ───────────────────────────────
    const now = new Date();
    const inFuture = (days) => new Date(now.getTime() + days * 86400000);

    const event1 = await Event.create({
        eventName: 'CodeSprint 2026',
        description: 'A 24-hour hackathon where teams compete to build innovative solutions. Prizes worth ₹50,000! Bring your laptops and your A-game.',
        eventType: 'Normal',
        status: 'Published',
        organizerId: org1._id,
        startDate: inFuture(10),
        endDate: inFuture(11),
        registrationDeadline: inFuture(8),
        location: 'Seminar Hall, IIIT Hyderabad',
        registrationFee: 0,
        eligibility: 'all',
        registrationLimit: 100,
        registrationCount: 3,
        eventTags: ['hackathon', 'coding', 'tech'],
        customForm: {
            fields: [
                { fieldLabel: 'Team Name', fieldType: 'text', isRequired: true, order: 1 },
                { fieldLabel: 'Programming Languages', fieldType: 'text', isRequired: false, order: 2 },
            ],
            isLocked: true,
        },
    });

    const event2 = await Event.create({
        eventName: 'Melody Night 2026',
        description: 'An evening of soulful music performances by student bands and solo artists. Open mic segment included!',
        eventType: 'Normal',
        status: 'Published',
        organizerId: org2._id,
        startDate: inFuture(15),
        endDate: inFuture(15),
        registrationDeadline: inFuture(12),
        location: 'Amphitheatre, IIIT Hyderabad',
        registrationFee: 50,
        eligibility: 'all',
        registrationLimit: 200,
        registrationCount: 2,
        eventTags: ['music', 'cultural', 'performance'],
    });

    const event3 = await Event.create({
        eventName: 'Felicity Merch Drop',
        description: 'Official Felicity 2026 merchandise — hoodies, t-shirts, and caps. Limited stock!',
        eventType: 'Merchandise',
        status: 'Published',
        organizerId: org1._id,
        startDate: inFuture(5),
        endDate: inFuture(30),
        registrationDeadline: inFuture(25),
        location: 'Online',
        eligibility: 'all',
        registrationCount: 1,
        eventTags: ['merch', 'felicity'],
        merchandiseItems: [
            { name: 'Felicity Hoodie - Black L', size: 'L', color: 'Black', stockQuantity: 50, price: 800 },
            { name: 'Felicity Hoodie - Black XL', size: 'XL', color: 'Black', stockQuantity: 30, price: 800 },
            { name: 'Felicity T-Shirt - White M', size: 'M', color: 'White', stockQuantity: 100, price: 400 },
            { name: 'Felicity Cap', variant: 'One Size', stockQuantity: 75, price: 250 },
        ],
        purchaseLimitPerParticipant: 3,
    });

    const event4 = await Event.create({
        eventName: 'Cricket Tournament',
        description: 'Inter-college T20 cricket tournament. Assemble your team of 11 and register!',
        eventType: 'Normal',
        status: 'Published',
        organizerId: org3._id,
        startDate: inFuture(20),
        endDate: inFuture(22),
        registrationDeadline: inFuture(15),
        location: 'Sports Ground, IIIT Hyderabad',
        registrationFee: 200,
        eligibility: 'all',
        registrationLimit: 16,
        registrationCount: 1,
        eventTags: ['cricket', 'sports', 'tournament'],
    });

    console.log('Created 4 events');

    // ── Registrations ────────────────────────
    // Helper to generate QR data for a registration
    const genQR = async (ticketId, eventId, participantId) => {
        const payload = JSON.stringify({ ticketId, eventId: String(eventId), participantId: String(participantId) });
        return QRCode.toDataURL(payload);
    };

    // Register Alice, Bob, Charlie for CodeSprint (event1)
    const reg1 = await Registration.create({
        participantId: p1._id,
        eventId: event1._id,
        registrationType: 'Normal',
        paymentStatus: 'Free',
        formResponses: [
            { fieldLabel: 'Team Name', answer: 'Bug Busters' },
            { fieldLabel: 'Programming Languages', answer: 'JavaScript, Python' },
        ],
    });
    reg1.qrData = await genQR(reg1.ticketId, event1._id, p1._id);
    await reg1.save();

    const reg2 = await Registration.create({
        participantId: p2._id,
        eventId: event1._id,
        registrationType: 'Normal',
        paymentStatus: 'Free',
        formResponses: [
            { fieldLabel: 'Team Name', answer: 'Code Warriors' },
            { fieldLabel: 'Programming Languages', answer: 'C++, Rust' },
        ],
    });
    reg2.qrData = await genQR(reg2.ticketId, event1._id, p2._id);
    await reg2.save();

    const reg3 = await Registration.create({
        participantId: p3._id,
        eventId: event1._id,
        registrationType: 'Normal',
        paymentStatus: 'Free',
        formResponses: [
            { fieldLabel: 'Team Name', answer: 'Pixel Pirates' },
            { fieldLabel: 'Programming Languages', answer: 'Go, TypeScript' },
        ],
    });
    reg3.qrData = await genQR(reg3.ticketId, event1._id, p3._id);
    await reg3.save();

    // Register Bob, Diana for Melody Night (event2)
    const reg4 = await Registration.create({
        participantId: p2._id,
        eventId: event2._id,
        registrationType: 'Normal',
        paymentStatus: 'Paid',
    });
    reg4.qrData = await genQR(reg4.ticketId, event2._id, p2._id);
    await reg4.save();

    const reg5 = await Registration.create({
        participantId: p4._id,
        eventId: event2._id,
        registrationType: 'Normal',
        paymentStatus: 'Paid',
    });
    reg5.qrData = await genQR(reg5.ticketId, event2._id, p4._id);
    await reg5.save();

    // Register Charlie for merch (event3) — PendingApproval, no QR yet
    await Registration.create({
        participantId: p3._id,
        eventId: event3._id,
        registrationType: 'Merchandise',
        paymentStatus: 'PendingApproval',
        merchandiseOrder: {
            itemId: event3.merchandiseItems[0]._id,
            itemName: 'Felicity Hoodie - Black L',
            size: 'L',
            color: 'Black',
            quantity: 1,
            priceAtPurchase: 800,
        },
    });

    // Register Alice for Cricket (event4)
    const reg7 = await Registration.create({
        participantId: p1._id,
        eventId: event4._id,
        registrationType: 'Normal',
        paymentStatus: 'Paid',
    });
    reg7.qrData = await genQR(reg7.ticketId, event4._id, p1._id);
    await reg7.save();

    console.log('Created registrations');

    // ── Forum Messages for CodeSprint (event1) ──
    const msg1 = await Message.create({
        eventId: event1._id,
        authorId: org1User._id,
        authorName: 'Tech Club IIIT',
        authorRole: 'organizer',
        content: 'Welcome to the CodeSprint 2026 discussion forum! Use this space to find teammates, ask questions, and stay updated. 🚀',
        isAnnouncement: true,
        isPinned: true,
    });

    const msg2 = await Message.create({
        eventId: event1._id,
        authorId: p1User._id,
        authorName: 'Alice Sharma',
        authorRole: 'participant',
        content: 'Hey everyone! Is there a specific theme for this hackathon, or can we build anything?',
        replyCount: 2,
    });

    // Thread replies to msg2
    await Message.create({
        eventId: event1._id,
        authorId: org1User._id,
        authorName: 'Tech Club IIIT',
        authorRole: 'organizer',
        content: 'Great question, Alice! The theme will be announced on the day of the event. But you can start preparing with any tech stack.',
        parentId: msg2._id,
    });

    await Message.create({
        eventId: event1._id,
        authorId: p2User._id,
        authorName: 'Bob Kumar',
        authorRole: 'participant',
        content: 'Thanks for clarifying! Looking forward to it.',
        parentId: msg2._id,
    });

    const msg3 = await Message.create({
        eventId: event1._id,
        authorId: p3User._id,
        authorName: 'Charlie Gupta',
        authorRole: 'participant',
        content: 'Anyone looking for a team member? I\'m strong in backend (Go, Node.js). DM me!',
        reactions: [
            { userId: p1User._id, emoji: '👍' },
            { userId: p2User._id, emoji: '👍' },
            { userId: org1User._id, emoji: '🎉' },
        ],
    });

    await Message.create({
        eventId: event1._id,
        authorId: p2User._id,
        authorName: 'Bob Kumar',
        authorRole: 'participant',
        content: 'Will food be provided during the 24 hours? 🍕',
    });

    await Message.create({
        eventId: event1._id,
        authorId: org1User._id,
        authorName: 'Tech Club IIIT',
        authorRole: 'organizer',
        content: '📢 Important: Please bring your college ID cards. They will be checked at the entrance.',
        isAnnouncement: true,
    });

    // Forum messages for Melody Night (event2)
    await Message.create({
        eventId: event2._id,
        authorId: org2User._id,
        authorName: 'Cultural Committee',
        authorRole: 'organizer',
        content: 'Welcome to Melody Night 2026! Drop your song suggestions and performance ideas here. 🎶',
        isAnnouncement: true,
        isPinned: true,
    });

    await Message.create({
        eventId: event2._id,
        authorId: p2User._id,
        authorName: 'Bob Kumar',
        authorRole: 'participant',
        content: 'Can we do a band performance or is it solo only?',
    });

    await Message.create({
        eventId: event2._id,
        authorId: p4User._id,
        authorName: 'Diana Patel',
        authorRole: 'participant',
        content: 'I\'d love to perform a classical dance piece. Is there space for dance acts too?',
    });

    console.log('Created forum messages');

    // ── Summary ──────────────────────────────
    console.log('\n════════════════════════════════════════════');
    console.log('  SEED COMPLETE — Test Credentials');
    console.log('════════════════════════════════════════════');
    console.log('  ALL PASSWORDS: Test@1234');
    console.log('');
    console.log('  ADMIN:');
    console.log('    jainsaanvi358+admin@gmail.com');
    console.log('');
    console.log('  ORGANIZERS:');
    console.log('    jainsaanvi358@gmail.com        (Tech Club IIIT)');
    console.log('    rachanajain0981@gmail.com      (Cultural Committee)');
    console.log('    jainsaanvi358+3org@gmail.com   (Sports Club)');
    console.log('');
    console.log('  PARTICIPANTS:');
    console.log('    jainsaanvi358+1test@gmail.com  (Alice Sharma)');
    console.log('    jainsaanvi358+2test@gmail.com  (Bob Kumar)');
    console.log('    jainsaanvi358+3test@gmail.com  (Charlie Gupta)');
    console.log('    jainsaanvi358+4test@gmail.com  (Diana Patel)');
    console.log('');
    console.log('  EVENTS:');
    console.log(`    1. CodeSprint 2026     (id: ${event1._id})`);
    console.log(`    2. Melody Night 2026   (id: ${event2._id})`);
    console.log(`    3. Felicity Merch Drop (id: ${event3._id})`);
    console.log(`    4. Cricket Tournament  (id: ${event4._id})`);
    console.log('');
    console.log('  FORUM MESSAGES: CodeSprint has 6 messages, Melody Night has 3');
    console.log('════════════════════════════════════════════\n');

    await mongoose.connection.close();
    process.exit(0);
}

seed().catch(err => {
    console.error('Seed failed:', err);
    process.exit(1);
});
