require('dotenv').config({ override: true, path: require('path').resolve(__dirname, '../.env') });
const nodemailer = require('nodemailer');

const createTransporter = () => {
    return nodemailer.createTransport({
        host: process.env.EMAIL_HOST || 'smtp.gmail.com',
        port: parseInt(process.env.EMAIL_PORT || '587'),
        secure: false, // STARTTLS
        auth: {
            user: process.env.EMAIL_USER,
            pass: process.env.EMAIL_PASS,
        },
        // Improve deliverability for Microsoft/Outlook servers
        tls: { rejectUnauthorized: false },
        pool: false,
        dkim: undefined,
    });
};

// Common headers that help avoid Microsoft spam filters
const getDeliverabilityHeaders = () => ({
    'X-Mailer': 'Felicity-EMS',
    'X-Priority': '3',           // Normal priority (1=high looks spammy)
    'Precedence': 'bulk',
    'List-Unsubscribe': `<mailto:${process.env.EMAIL_USER}?subject=unsubscribe>`,
});

/**
 * Send a password-reset email to the user.
 * @param {string} toEmail     – recipient address
 * @param {string} resetToken  –
 */
const sendPasswordResetEmail = async (toEmail, resetToken) => {
    const transporter = createTransporter();
    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
    const resetLink = `${frontendUrl}/reset-password/${resetToken}`;

    const mailOptions = {
        from: `"Felicity EMS" <${process.env.EMAIL_USER}>`,
        to: toEmail,
        replyTo: process.env.EMAIL_USER,
        subject: 'Password Reset Request - Felicity',
        headers: getDeliverabilityHeaders(),
        text: `Hi,\n\nWe received a request to reset the password for your Felicity account (${toEmail}).\n\nClick this link to set a new password (expires in 1 hour):\n${resetLink}\n\nIf you didn't request this, you can safely ignore this email.\n\nFelicity Event Management System - IIIT Hyderabad`,
        html: `
            <div style="font-family: Inter, sans-serif; max-width: 520px; margin: 0 auto; background: #0F0F14; color: #F1F1F9; padding: 40px; border-radius: 16px;">
                <h1 style="font-size: 1.6rem; font-weight: 800; margin-bottom: 8px;
                    background: linear-gradient(135deg, #A78BFA, #EC4899);
                    -webkit-background-clip: text; -webkit-text-fill-color: transparent;">
                    ✦ Felicity
                </h1>
                <h2 style="font-size: 1.2rem; font-weight: 700; margin-bottom: 12px; color: #F1F1F9;">
                    Reset Your Password
                </h2>
                <p style="color: #9B9BB4; margin-bottom: 28px; line-height: 1.6;">
                    We received a request to reset the password for your Felicity account (<strong>${toEmail}</strong>).
                    Click the button below to set a new password. This link expires in <strong>1 hour</strong>.
                </p>
                <a href="${resetLink}"
                   style="display: inline-block; padding: 14px 28px; background: linear-gradient(135deg, #7C3AED, #5B21B6);
                          color: #fff; text-decoration: none; border-radius: 10px; font-weight: 700; font-size: 1rem;">
                    Reset Password
                </a>
                <p style="color: #5A5A72; font-size: 0.82rem; margin-top: 28px; line-height: 1.6;">
                    If you didn't request this, you can safely ignore this email.<br/>
                    This link will expire in 1 hour.
                </p>
                <hr style="border: none; border-top: 1px solid rgba(255,255,255,0.08); margin: 24px 0;" />
                <p style="color: #5A5A72; font-size: 0.75rem;">
                    Felicity Event Management System — IIIT Hyderabad
                </p>
           </div>
        `
    };

    await transporter.sendMail(mailOptions);
};

/**
 * Send a new auto-generated password to the user.
 * @param {string} toEmail     – recipient address
 * @param {string} newPassword – the newly generated plaintext password
 * @param {string} name        – recipient's name or organizer name
 */
const sendNewPasswordEmail = async (toEmail, newPassword, name = '') => {
    const transporter = createTransporter();

    const mailOptions = {
        from: `"Felicity EMS" <${process.env.EMAIL_USER}>`,
        to: toEmail,
        replyTo: process.env.EMAIL_USER,
        subject: 'Your New Password - Felicity',
        headers: getDeliverabilityHeaders(),
        text: `Hi${name ? ' ' + name : ''},\n\nThe admin has reset your Felicity account password.\n\nYour new temporary password is: ${newPassword}\n\nPlease log in and change your password immediately from your profile settings.\n\nFelicity Event Management System - IIIT Hyderabad`,
        html: `
            <div style="font-family: Inter, sans-serif; max-width: 520px; margin: 0 auto; background: #0F0F14; color: #F1F1F9; padding: 40px; border-radius: 16px;">
                <h1 style="font-size: 1.6rem; font-weight: 800; margin-bottom: 8px;
                    background: linear-gradient(135deg, #A78BFA, #EC4899);
                    -webkit-background-clip: text; -webkit-text-fill-color: transparent;">
                    ✦ Felicity
                </h1>
                <h2 style="font-size: 1.2rem; font-weight: 700; margin-bottom: 12px; color: #F1F1F9;">
                    Your Password Has Been Reset
                </h2>
                <p style="color: #9B9BB4; margin-bottom: 20px; line-height: 1.6;">
                    Hi${name ? ' <strong>' + name + '</strong>' : ''}, the admin has reset your Felicity account password.
                    Your new temporary password is:
                </p>
                <div style="background: rgba(255,255,255,0.06); border: 1px solid rgba(255,255,255,0.12);
                            border-radius: 10px; padding: 16px 24px; text-align: center; margin-bottom: 24px;">
                    <span style="font-family: monospace; font-size: 1.4rem; font-weight: 700;
                                letter-spacing: 2px; color: #A78BFA;">${newPassword}</span>
                </div>
                <p style="color: #9B9BB4; margin-bottom: 28px; line-height: 1.6;">
                    Please log in and <strong>change your password immediately</strong> from your profile settings.
                </p>
                <hr style="border: none; border-top: 1px solid rgba(255,255,255,0.08); margin: 24px 0;" />
                <p style="color: #5A5A72; font-size: 0.75rem;">
                    Felicity Event Management System — IIIT Hyderabad
                </p>
            </div>
        `
    };

    await transporter.sendMail(mailOptions);
};

/**
 * Send welcome email to a newly created organizer with their auto-generated credentials.
 * @param {string} toEmail       – contactEmail (where credentials are sent)
 * @param {string} loginEmail    – auto-generated login email (e.g. acm@felicity.com)
 * @param {string} password      – auto-generated plaintext password
 * @param {string} organizerName – club / organizer name
 */
const sendOrganizerWelcomeEmail = async (toEmail, loginEmail, password, organizerName = '') => {
    const transporter = createTransporter();
    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';

    const mailOptions = {
        from: `"Felicity EMS" <${process.env.EMAIL_USER}>`,
        to: toEmail,
        replyTo: process.env.EMAIL_USER,
        subject: `Welcome to Felicity - Your Organizer Account is Ready`,
        headers: getDeliverabilityHeaders(),
        text: `Hi ${organizerName},\n\nAn admin has set up your club account on Felicity.\n\nLogin Email: ${loginEmail}\nTemporary Password: ${password}\n\nLog in at: ${frontendUrl}/login\n\nPlease change your password after your first login from your profile settings.\n\nFelicity Event Management System - IIIT Hyderabad`,
        html: `
            <div style="font-family: Inter, sans-serif; max-width: 540px; margin: 0 auto; background: #0F0F14; color: #F1F1F9; padding: 40px; border-radius: 16px;">
                <h1 style="font-size: 1.6rem; font-weight: 800; margin-bottom: 8px;
                    background: linear-gradient(135deg, #A78BFA, #EC4899);
                    -webkit-background-clip: text; -webkit-text-fill-color: transparent;">
                    ✦ Felicity
                </h1>
                <h2 style="font-size: 1.2rem; font-weight: 700; margin-bottom: 12px; color: #F1F1F9;">
                    Your Organizer Account Has Been Created
                </h2>
                <p style="color: #9B9BB4; margin-bottom: 24px; line-height: 1.6;">
                    Hi <strong>${organizerName}</strong>, an admin has set up your club account on Felicity.
                    Use the credentials below to log in.
                </p>

                <div style="background: rgba(124,58,237,0.1); border: 1px solid rgba(124,58,237,0.3);
                            border-radius: 12px; padding: 20px 24px; margin-bottom: 24px;">
                    <div style="margin-bottom: 14px;">
                        <span style="font-size: 0.78rem; color: #5A5A72; text-transform: uppercase; letter-spacing: 0.06em; font-weight: 600;">Login Email</span><br/>
                        <span style="font-family: monospace; font-size: 1.05rem; color: #A78BFA; font-weight: 700;">${loginEmail}</span>
                    </div>
                    <div>
                        <span style="font-size: 0.78rem; color: #5A5A72; text-transform: uppercase; letter-spacing: 0.06em; font-weight: 600;">Temporary Password</span><br/>
                        <span style="font-family: monospace; font-size: 1.25rem; letter-spacing: 2px; color: #A78BFA; font-weight: 700;">${password}</span>
                    </div>
                </div>

                <a href="${frontendUrl}/login"
                   style="display: inline-block; padding: 14px 28px; background: linear-gradient(135deg, #7C3AED, #5B21B6);
                          color: #fff; text-decoration: none; border-radius: 10px; font-weight: 700; font-size: 1rem; margin-bottom: 24px;">
                    Log In to Felicity
                </a>

                <p style="color: #9B9BB4; font-size: 0.88rem; line-height: 1.6;">
                    Please <strong>change your password</strong> after your first login from your profile settings.
                </p>
                <hr style="border: none; border-top: 1px solid rgba(255,255,255,0.08); margin: 24px 0;" />
                <p style="color: #5A5A72; font-size: 0.75rem;">
                    Felicity Event Management System — IIIT Hyderabad
                </p>
            </div>
        `
    };

    await transporter.sendMail(mailOptions);
};

/**
 * Send a registration confirmation email to a participant.
 * @param {string} toEmail       – participant's email address
 * @param {string} firstName     – participant's first name
 * @param {object} eventDetails  – { eventName, eventType, startDate, endDate, location, registrationFee }
 * @param {string} ticketId      – e.g. "TKT-A1B2C3D4"
 * @param {string} qrDataUrl     – base64 data URL of the QR code image
 * @param {string} paymentStatus – 'Free' | 'PendingApproval' | 'Paid'
 */
const sendRegistrationConfirmationEmail = async (toEmail, firstName, eventDetails, ticketId, qrDataUrl, paymentStatus) => {
    const transporter = createTransporter();

    const { eventName, eventType, startDate, endDate, location, registrationFee } = eventDetails;

    const formatDate = (d) => d ? new Date(d).toLocaleString('en-IN', {
        day: 'numeric', month: 'long', year: 'numeric',
        hour: '2-digit', minute: '2-digit', hour12: true,
    }) : '—';

    const feeText = registrationFee > 0
        ? `₹${registrationFee}`
        : 'Free';

    const paymentNote = paymentStatus === 'PendingApproval'
        ? `<div style="margin-top:16px;padding:12px 16px;background:rgba(252,211,77,0.1);border:1px solid rgba(252,211,77,0.3);border-radius:10px;color:#FCD34D;font-size:0.88rem;">
              ⏳ <strong>Payment Pending:</strong> Your registration is confirmed once the organizer verifies your payment.
           </div>`
        : '';

    // Strip the "data:image/png;base64," prefix for the inline attachment
    const hasQr = !!qrDataUrl;
    const qrBase64 = hasQr ? qrDataUrl.replace(/^data:image\/\w+;base64,/, '') : null;

    const mailOptions = {
        from: `"Felicity EMS" <${process.env.EMAIL_USER}>`,
        to: toEmail,
        replyTo: process.env.EMAIL_USER,
        subject: `Registration Confirmed - ${eventName} - Felicity`,
        headers: getDeliverabilityHeaders(),
        // Plain text version (critical for Microsoft deliverability)
        text: `Hi ${firstName},\n\nYour registration for ${eventName} is confirmed!\n\nTicket ID: ${ticketId}\nEvent: ${eventName} (${eventType})\nStart: ${formatDate(startDate)}\nEnd: ${formatDate(endDate)}\nLocation: ${location || 'TBA'}\nFee: ${feeText}\n\n${paymentStatus === 'PendingApproval' ? 'Payment Pending: Your registration is confirmed once the organizer verifies your payment.\n\n' : ''}You can view your ticket anytime from My Events on the Felicity platform.\n\nFelicity Event Management System - IIIT Hyderabad`,
        html: `
            <div style="font-family: Inter, sans-serif; max-width: 540px; margin: 0 auto; background: #0F0F14; color: #F1F1F9; padding: 40px; border-radius: 16px;">
                <h1 style="font-size: 1.6rem; font-weight: 800; margin-bottom: 4px;
                    background: linear-gradient(135deg, #A78BFA, #EC4899);
                    -webkit-background-clip: text; -webkit-text-fill-color: transparent;">
                    ✦ Felicity
                </h1>

                <h2 style="font-size: 1.25rem; font-weight: 700; margin: 20px 0 6px; color: #F1F1F9;">
                    You're in, ${firstName}! 🎉
                </h2>
                <p style="color: #9B9BB4; margin-bottom: 28px; line-height: 1.6;">
                    Your registration for <strong style="color:#F1F1F9;">${eventName}</strong> is confirmed.
                    Your ticket is attached below.
                </p>

                <!-- Ticket card -->
                <div style="background: rgba(124,58,237,0.12); border: 1px solid rgba(124,58,237,0.3);
                            border-radius: 14px; padding: 24px; margin-bottom: 24px;">
                    <div style="display:flex; justify-content:space-between; align-items:flex-start; flex-wrap:wrap; gap:16px;">
                        <div>
                            <div style="font-size:0.72rem; text-transform:uppercase; letter-spacing:0.08em; color:#5A5A72; margin-bottom:4px;">Event</div>
                            <div style="font-size:1.1rem; font-weight:700; color:#F1F1F9;">${eventName}</div>
                            <div style="margin-top:4px;">
                                <span style="background:rgba(124,58,237,0.25);color:#A78BFA;padding:2px 10px;border-radius:99px;font-size:0.75rem;font-weight:600;">${eventType}</span>
                            </div>
                        </div>
                        <div style="text-align:right;">
                            <div style="font-size:0.72rem; text-transform:uppercase; letter-spacing:0.08em; color:#5A5A72; margin-bottom:4px;">Ticket ID</div>
                            <div style="font-family:monospace; font-size:1rem; font-weight:700; color:#A78BFA;">${ticketId}</div>
                        </div>
                    </div>

                    <hr style="border:none; border-top:1px solid rgba(255,255,255,0.08); margin:18px 0;" />

                    <div style="display:grid; grid-template-columns:1fr 1fr; gap:14px; font-size:0.88rem;">
                        <div>
                            <div style="color:#5A5A72; font-size:0.72rem; text-transform:uppercase; letter-spacing:0.06em; margin-bottom:2px;">Start</div>
                            <div style="color:#D1D1E9;">${formatDate(startDate)}</div>
                        </div>
                        <div>
                            <div style="color:#5A5A72; font-size:0.72rem; text-transform:uppercase; letter-spacing:0.06em; margin-bottom:2px;">End</div>
                            <div style="color:#D1D1E9;">${formatDate(endDate)}</div>
                        </div>
                        <div>
                            <div style="color:#5A5A72; font-size:0.72rem; text-transform:uppercase; letter-spacing:0.06em; margin-bottom:2px;">Location</div>
                            <div style="color:#D1D1E9;">${location || 'TBA'}</div>
                        </div>
                        <div>
                            <div style="color:#5A5A72; font-size:0.72rem; text-transform:uppercase; letter-spacing:0.06em; margin-bottom:2px;">Fee</div>
                            <div style="color:#D1D1E9;">${feeText}</div>
                        </div>
                    </div>

                    <!-- QR code -->
                    ${hasQr ? `
                    <div style="text-align:center; margin-top:24px;">
                        <div style="font-size:0.72rem; text-transform:uppercase; letter-spacing:0.08em; color:#5A5A72; margin-bottom:10px;">Scan at the venue</div>
                        <img src="cid:qrcode" alt="QR Code" style="width:160px; height:160px; border-radius:10px; background:#fff; padding:8px;" />
                    </div>` : ''}
                </div>

                ${paymentNote}

                <p style="color: #5A5A72; font-size: 0.82rem; margin-top: 24px; line-height: 1.6;">
                    You can also view your ticket anytime from <strong>My Events</strong> on the Felicity platform.
                </p>

                <hr style="border: none; border-top: 1px solid rgba(255,255,255,0.08); margin: 24px 0;" />
                <p style="color: #5A5A72; font-size: 0.75rem;">Felicity Event Management System — IIIT Hyderabad</p>
            </div>
        `,
        attachments: hasQr ? [{
            filename: 'ticket-qr.png',
            content: qrBase64,
            encoding: 'base64',
            cid: 'qrcode',
        }] : [],
    };

    await transporter.sendMail(mailOptions);
};

module.exports = {
    sendPasswordResetEmail,
    sendNewPasswordEmail,
    sendOrganizerWelcomeEmail,
    sendRegistrationConfirmationEmail,
};
