import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import ParticipantDashboard from './ParticipantDashboard';
import AdminDashboardView from './AdminDashboardView';
import OrganizerDashboard from './OrganizerDashboard';

const Dashboard = () => {
  const { user, profile, loading } = useAuth();

  if (loading) return <div className="spinner" style={{ marginTop: 80 }} />;
  if (!user) return <Navigate to="/login" replace />;

  // Redirect participants who haven't completed onboarding
  if (user.role === 'participant' && profile && !profile.onboardingComplete) {
    return <Navigate to="/onboarding" replace />;
  }

  if (user.role === 'participant') return <ParticipantDashboard />;
  if (user.role === 'admin')       return <AdminDashboardView />;
  if (user.role === 'organizer')   return <OrganizerDashboard />;

  return <Navigate to="/login" replace />;
};

export default Dashboard;
