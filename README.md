# Felicity Event Management System

A centralized platform for managing events, registrations, merchandise, and participant engagement for college fests. Built with the MERN stack.

## Tech Stack

- **Frontend:** React (CRA), React Router DOM, Socket.IO Client
- **Backend:** Node.js, Express.js, Socket.IO, JWT, bcrypt, nodemailer, multer
- **Database:** MongoDB Atlas (Mongoose ODM)
- **Deployment:** Vercel (frontend) + Render (backend)

## Project Structure

```
├── backend/
│   ├── config/          # Database connection
│   ├── controllers/     # Route handlers (auth, events, forum, etc.)
│   ├── middleware/       # Auth, role-based access, file upload
│   ├── models/          # Mongoose schemas (User, Event, Registration, etc.)
│   ├── routes/          # API route definitions
│   ├── utils/           # Discord webhooks, event scheduler, email
│   └── server.js        # Express app + Socket.IO setup
├── frontend/
│   ├── src/
│   │   ├── components/  # Navbar, DiscussionForum, ProtectedRoute
│   │   ├── contexts/    # AuthContext (JWT + role management)
│   │   ├── pages/       # All page components
│   │   └── services/    # Axios API client
│   └── public/
├── deployment.txt       # Deployed URLs
└── README.md
```

## User Roles

| Role | Description |
|------|-------------|
| **Participant** | IIIT students (email-validated) and external participants |
| **Organizer** | Clubs/councils — accounts provisioned by admin |
| **Admin** | System administrator — manages organizers, approves requests |

## Core Features (Part 1)

### Authentication & Security
- JWT-based auth with bcrypt password hashing
- Role-based route protection (frontend + backend)
- IIIT email domain validation for student registration
- Persistent sessions with token storage

### Participant Features
- **Dashboard:** Upcoming events, participation history (Normal/Merchandise/Completed/Cancelled tabs)
- **Browse Events:** Search, trending (top 5/24h), filters (type, eligibility, date, followed clubs)
- **Event Registration:** Custom form submission, email ticket with QR code
- **Merchandise Purchase:** Item selection (size/color/variant), stock validation, payment proof upload
- **Profile:** Editable fields, interests, followed clubs, password change
- **Clubs Page:** List all organizers, follow/unfollow
- **Inbox:** Notification center for all alerts

### Organizer Features
- **Dashboard:** Event cards with status badges, analytics (registrations/revenue/attendance)
- **Event Creation:** Draft → Publish flow, dynamic form builder, merchandise item editor
- **Event Management:** Edit (draft: full, published: limited), close registrations, mark completed
- **Participants View:** Full list with search/filter, payment proof review, CSV export
- **Profile:** Editable org details, Discord webhook integration (auto-posts to Discord)
- **Discussion Forum:** View and participate in event forums
- **Attendance Scanner:** QR code scanning for event check-in

### Admin Features
- **Dashboard:** System overview, manage organizers
- **Club Management:** Create organizer accounts (auto-generates credentials), deactivate/remove
- **Password Reset Requests:** View, approve/reject organizer password reset requests

### Auto Event Status Transitions
- Background scheduler runs every 60s
- Published → Ongoing (when startDate passes)
- Published/Ongoing → Completed (when endDate passes)
- Discord notifications sent for auto-completed events

## Advanced Features (Part 2)

### Tier A (2 features — 16 marks)

**1. Merchandise Payment Approval Workflow**
- Participants upload payment proof (image) during merchandise purchase
- Orders enter "PendingApproval" state
- Organizers review proofs in a dedicated Payment Orders tab
- Approve → stock decremented, QR ticket generated, confirmation email sent
- Reject → participant notified, can re-upload
- No QR generated while pending/rejected

**2. QR Scanner & Attendance Tracking**
- Built-in QR scanner using device camera (html5-qrcode)
- Scans participant QR codes, validates ticket, marks attendance with timestamp
- Duplicate scan rejection
- Live attendance dashboard (scanned vs. not-yet-scanned)
- Manual override with audit logging
- CSV export of attendance data

### Tier B (2 features — 12 marks)

**1. Real-Time Discussion Forum**
- Real-time messaging via Socket.IO on event detail pages
- Message threading (nested replies with depth limit)
- Organizer moderation: delete messages, post pinned announcements
- Upvote/downvote system with score-based sorting
- Typing indicators and live message updates
- Notification system: reply notifications to parent author, new message notifications to organizer

**2. Organizer Password Reset Workflow**
- Organizers request password reset from their profile
- Admin sees all pending requests with organizer name, date, and reason
- Admin approves (system generates new password, emails it) or rejects with comments
- Request status tracking (Pending/Approved/Rejected)
- Full request history viewable by admin

### Tier C (1 feature — 2 marks)

**1. Bot Protection (CAPTCHA)**
- Google reCAPTCHA v2 on login and registration pages
- Backend verification of CAPTCHA token before processing auth requests
- Configurable via environment variables (site key + secret key)

## Environment Variables

### Backend (.env)
```
PORT=5000
MONGODB_URI=mongodb+srv://...
JWT_SECRET=your_jwt_secret
EMAIL_USER=your_email@gmail.com
EMAIL_PASS=your_app_password
FRONTEND_URL=https://your-frontend-url.vercel.app
RECAPTCHA_SECRET_KEY=your_recaptcha_secret
```

### Frontend (.env)
```
REACT_APP_API_URL=https://your-backend-url.onrender.com/api
REACT_APP_RECAPTCHA_SITE_KEY=your_recaptcha_site_key
```

## Deployment Instructions

### 1. Database (MongoDB Atlas)
Already configured — uses MongoDB Atlas cluster via `MONGODB_URI` in backend `.env`.

### 2. Backend → Render (https://render.com)
1. Create a **New Web Service** on Render
2. Connect your GitHub repo (or upload code)
3. Set **Root Directory** to `backend`
4. Set **Build Command** to `npm install`
5. Set **Start Command** to `node server.js`
6. Add environment variables in the Render dashboard:
   - `MONGODB_URI` — your Atlas connection string
   - `JWT_SECRET` — your secret key
   - `EMAIL_USER` / `EMAIL_PASS` — for nodemailer
   - `FRONTEND_URL` — your Vercel URL (set after deploying frontend)
   - `RECAPTCHA_SECRET_KEY` — your reCAPTCHA secret
   - `NODE_ENV` — `production`
7. Deploy — note the URL (e.g. `https://felicity-webapp.onrender.com`)

### 3. Frontend → Vercel (https://vercel.com)
1. Create a **New Project** on Vercel
2. Connect your GitHub repo (or upload code)
3. Set **Root Directory** to `frontend`
4. Set **Framework Preset** to `Create React App`
5. Add environment variables:
   - `REACT_APP_API_URL` — your Render URL + `/api` (e.g. `https://felicity-webapp.onrender.com/api`)
   - `REACT_APP_RECAPTCHA_SITE_KEY` — your reCAPTCHA site key
6. Deploy — note the URL (e.g. `https://felicity-webapp.vercel.app`)

### 4. Post-deployment
- Update backend's `FRONTEND_URL` env var on Render to point to your Vercel URL
- Update `deployment.txt` with the actual URLs

## Local Development

```bash
# Backend
cd backend
npm install
cp .env.example .env  # Configure environment variables
npm run dev            # Starts on port 5000 with nodemon

# Frontend
cd frontend
npm install
npm start              # Starts on port 3000
```

## Seed Data
```bash
cd backend
node seed.js           # Populates test data (admin, organizers, events, participants)
```
