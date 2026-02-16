import React, { createContext, useState, useContext, useEffect } from 'react';
import { authAPI } from '../services/api';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Check if user is logged in on mount
  useEffect(() => {
    const token = localStorage.getItem('token');
    if (token) {
      loadUser();
    } else {
      setLoading(false);
    }
  }, []);

  // Load user from token
  const loadUser = async () => {
    try {
      const response = await authAPI.getMe();
      setUser(response.data.user);
      setProfile(response.data.profile);
      setError(null);
    } catch (err) {
      console.error('Load user error:', err);
      localStorage.removeItem('token');
      setUser(null);
      setProfile(null);
    } finally {
      setLoading(false);
    }
  };

  // Login
  const login = async (credentials) => {
    try {
      const response = await authAPI.login(credentials);
      localStorage.setItem('token', response.data.token);
      setUser(response.data.user);
      setProfile(response.data.profile);
      setError(null);
      return { success: true };
    } catch (err) {
      const errorMsg = err.response?.data?.message || 'Login failed';
      setError(errorMsg);
      return { success: false, error: errorMsg };
    }
  };

  // Register Participant
  const registerParticipant = async (data) => {
    try {
      const response = await authAPI.registerParticipant(data);
      localStorage.setItem('token', response.data.token);
      setUser(response.data.user);
      setProfile(response.data.participant);
      setError(null);
      return { success: true };
    } catch (err) {
      const errorMsg = err.response?.data?.message || 'Registration failed';
      setError(errorMsg);
      return { success: false, error: errorMsg };
    }
  };

  // Register Organizer
  const registerOrganizer = async (data) => {
    try {
      const response = await authAPI.registerOrganizer(data);
      localStorage.setItem('token', response.data.token);
      setUser(response.data.user);
      setProfile(response.data.organizer);
      setError(null);
      return { success: true, message: response.message };
    } catch (err) {
      const errorMsg = err.response?.data?.message || 'Registration failed';
      setError(errorMsg);
      return { success: false, error: errorMsg };
    }
  };

  // Logout
  const logout = () => {
    localStorage.removeItem('token');
    setUser(null);
    setProfile(null);
    setError(null);
  };

  const value = {
    user,
    profile,
    loading,
    error,
    login,
    registerParticipant,
    registerOrganizer,
    logout,
    isAuthenticated: !!user,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
