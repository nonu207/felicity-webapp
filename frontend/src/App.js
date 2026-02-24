import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import Navbar from './components/Navbar';
import PrivateRoute from './components/PrivateRoute';

// Pages
import Home from './pages/Home';
import Login from './pages/Login';
import Register from './pages/Register';
import Dashboard from './pages/Dashboard';
import Onboarding from './pages/Onboarding';
import BrowseEvents from './pages/BrowseEvents';
import EventDetail from './pages/EventDetail';
import Profile from './pages/Profile';
import Clubs from './pages/Clubs';
import ClubDetail from './pages/ClubDetail';
import ForgotPassword from './pages/ForgotPassword';
import ResetPassword from './pages/ResetPassword';
import CreateEvent from './pages/CreateEvent';
import OrganizerEventDetail from './pages/OrganizerEventDetail';
import OrganizerProfile from './pages/OrganizerProfile';
import Inbox from './pages/Inbox';
import AttendanceScanner from './pages/AttendanceScanner';

import './App.css';

// Redirect guests away from protected pages, and logged-in users away from auth pages
const AuthRoute = ({ children }) => {
  const { isAuthenticated } = useAuth();
  return isAuthenticated ? <Navigate to="/dashboard" replace /> : children;
};

function App() {
  return (
    <Router>
      <AuthProvider>
        <div className="App">
          <Navbar />
          <Routes>
            {/* Public */}
            <Route path="/" element={<Home />} />
            <Route path="/login" element={<AuthRoute><Login /></AuthRoute>} />
            <Route path="/register" element={<AuthRoute><Register /></AuthRoute>} />
            <Route path="/forgot-password" element={<AuthRoute><ForgotPassword /></AuthRoute>} />
            <Route path="/reset-password/:token" element={<ResetPassword />} />

            {/* Participant onboarding (right after signup) */}
            <Route path="/onboarding" element={<PrivateRoute><Onboarding /></PrivateRoute>} />

            {/* Shared protected */}
            <Route path="/dashboard" element={<PrivateRoute><Dashboard /></PrivateRoute>} />
            <Route path="/inbox" element={<PrivateRoute><Inbox /></PrivateRoute>} />

            {/* Events */}
            <Route path="/events" element={<PrivateRoute><BrowseEvents /></PrivateRoute>} />
            <Route path="/events/:id" element={<PrivateRoute><EventDetail /></PrivateRoute>} />

            {/* Organizer */}
            <Route path="/events/create" element={<PrivateRoute><CreateEvent /></PrivateRoute>} />
            <Route path="/organizer/events/:id" element={<PrivateRoute><OrganizerEventDetail /></PrivateRoute>} />
            <Route path="/organizer/events/:eventId/attendance" element={<PrivateRoute><AttendanceScanner /></PrivateRoute>} />
            <Route path="/organizer/profile" element={<PrivateRoute><OrganizerProfile /></PrivateRoute>} />

            {/* Participant */}
            <Route path="/profile" element={<PrivateRoute><Profile /></PrivateRoute>} />
            <Route path="/clubs" element={<PrivateRoute><Clubs /></PrivateRoute>} />
            <Route path="/clubs/:id" element={<PrivateRoute><ClubDetail /></PrivateRoute>} />

            {/* Fallback */}
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </div>
      </AuthProvider>
    </Router>
  );
}

export default App;
