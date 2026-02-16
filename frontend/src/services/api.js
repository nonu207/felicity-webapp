import axios from 'axios';

const API_URL = 'http://localhost:5000/api';

// Create axios instance
const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add token to requests if it exists
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Auth API calls
export const authAPI = {
  // Register participant
  registerParticipant: async (data) => {
    const response = await api.post('/auth/register/participant', data);
    return response.data;
  },

  // Register organizer
  registerOrganizer: async (data) => {
    const response = await api.post('/auth/register/organizer', data);
    return response.data;
  },

  // Login
  login: async (credentials) => {
    const response = await api.post('/auth/login', credentials);
    return response.data;
  },

  // Get current user
  getMe: async () => {
    const response = await api.get('/auth/me');
    return response.data;
  },
};

// Admin API calls
export const adminAPI = {
  // Create admin
  createAdmin: async (data) => {
    const response = await api.post('/admin/create', data);
    return response.data;
  },

  // Get all organizers
  getAllOrganizers: async () => {
    const response = await api.get('/admin/organizers');
    return response.data;
  },

  // Get all participants
  getAllParticipants: async () => {
    const response = await api.get('/admin/participants');
    return response.data;
  },

  // Approve/reject organizer
  approveOrganizer: async (id, approve) => {
    const response = await api.patch(`/admin/organizer/${id}/approve`, { approve });
    return response.data;
  },

  // Delete user
  deleteUser: async (id) => {
    const response = await api.delete(`/admin/user/${id}`);
    return response.data;
  },
};

export default api;
