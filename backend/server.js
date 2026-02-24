const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const path = require('path');
const http = require('http');
const { Server } = require('socket.io');
const connectDB = require('./config/db');

// Load environment variables
const _preloadedNodeEnv = process.env.NODE_ENV;
dotenv.config({ override: true });
if (_preloadedNodeEnv) process.env.NODE_ENV = _preloadedNodeEnv;

// Create Express app
const app = express();

// Create HTTP server & Socket.IO
const server = http.createServer(app);
const io = new Server(server, {
  cors: { origin: '*', methods: ['GET', 'POST'] },
});

// Make io accessible in route handlers via req.app.get('io')
app.set('io', io);

// Socket.IO connection handling
io.on('connection', (socket) => {
  // Join a forum room for an event
  socket.on('join_forum', (eventId) => {
    socket.join(`forum:${eventId}`);
  });

  // Leave a forum room
  socket.on('leave_forum', (eventId) => {
    socket.leave(`forum:${eventId}`);
  });

  // Typing indicator
  socket.on('typing', ({ eventId, userName }) => {
    socket.to(`forum:${eventId}`).emit('user_typing', { userName });
  });

  socket.on('stop_typing', ({ eventId }) => {
    socket.to(`forum:${eventId}`).emit('user_stop_typing');
  });
});

// Connect to Database
if (process.env.NODE_ENV !== 'test') {
  connectDB();
  // Start the event status scheduler (auto-transitions Published→Ongoing→Completed)
  const { startEventScheduler } = require('./utils/eventScheduler');
  startEventScheduler();
}

// Middleware
app.use(cors({
  origin: 'https://felicity-webapp-kfkz.vercel.app',
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  credentials: true
}));
app.use(express.json());

// Serve uploaded files (payment proofs etc.)
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Import routes
const authRoutes = require('./routes/auth');
const adminRoutes = require('./routes/admin');
const eventRoutes = require('./routes/events');
const participantRoutes = require('./routes/participant');
const organizerRoutes = require('./routes/organizer');
const registrationRoutes = require('./routes/registrations');
const notificationRoutes = require('./routes/notifications');
const attendanceRoutes = require('./routes/attendance');
const forumRoutes = require('./routes/forum');

// Use routes
app.use('/api/auth', authRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/events', eventRoutes);
app.use('/api/participant', participantRoutes);
app.use('/api/organizer', organizerRoutes);
app.use('/api/registrations', registrationRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/attendance', attendanceRoutes);
app.use('/api/forum', forumRoutes);


module.exports = app;
module.exports.server = server;
module.exports.io = io;

// Start server only if run directly
if (require.main === module) {
  const PORT = process.env.PORT || 5000;
  server.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
  });
}