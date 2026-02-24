import axios from 'axios';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';

const api = axios.create({
  baseURL: API_URL,
  headers: { 'Content-Type': 'application/json' },
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// ── Auth ──────────────────────────────────────
export const authAPI = {
  registerParticipant: (data) => api.post('/auth/register/participant', data).then(r => r.data),
  registerOrganizer: (data) => api.post('/auth/register/organizer', data).then(r => r.data),
  login: (data) => api.post('/auth/login', data).then(r => r.data),
  getMe: () => api.get('/auth/me').then(r => r.data),
  changePassword: (data) => api.patch('/auth/change-password', data).then(r => r.data),
  forgotPassword: (data) => api.post('/auth/forgot-password', data).then(r => r.data),
  resetPassword: (token, data) => api.post(`/auth/reset-password/${token}`, data).then(r => r.data),
};

// ── Admin ─────────────────────────────────────
export const adminAPI = {
  createAdmin: (data) => api.post('/admin/create', data).then(r => r.data),
  getAllOrganizers: () => api.get('/admin/organizers').then(r => r.data),
  getAllParticipants: () => api.get('/admin/participants').then(r => r.data),
  approveOrganizer: (id, approve) => api.patch(`/admin/organizer/${id}/approve`, { approve }).then(r => r.data),
  deleteUser: (id) => api.delete(`/admin/user/${id}`).then(r => r.data),
  toggleUserActive: (id) => api.patch(`/admin/user/${id}/toggle-active`).then(r => r.data),
  createOrganizer: (data) => api.post('/admin/organizer/create', data).then(r => r.data),
  resetPassword: (id) => api.patch(`/admin/user/${id}/reset-password`, {}).then(r => r.data),
  getPendingPasswordResets: () => api.get('/admin/password-reset-requests').then(r => r.data),
  approvePasswordReset: (userId, comment) => api.patch(`/admin/password-reset-requests/${userId}/approve`, { comment }).then(r => r.data),
  rejectPasswordReset: (userId, reason) => api.patch(`/admin/password-reset-requests/${userId}/reject`, { reason }).then(r => r.data),
};

// ── Notifications ─────────────────────────────
export const notificationAPI = {
  getNotifications: (params) => api.get('/notifications', { params }).then(r => r.data),
  getUnreadCount: () => api.get('/notifications/unread-count').then(r => r.data),
  markAsRead: (id) => api.patch(`/notifications/${id}/read`).then(r => r.data),
  markAllAsRead: () => api.patch('/notifications/read-all').then(r => r.data),
};

// ── Participant ───────────────────────────────
export const participantAPI = {
  completeOnboarding: (data) => api.patch('/participant/onboarding', data).then(r => r.data),
  getProfile: () => api.get('/participant/profile').then(r => r.data),
  updateProfile: (data) => api.patch('/participant/profile', data).then(r => r.data),
  followOrganizer: (id) => api.post(`/participant/follow/${id}`).then(r => r.data),
  unfollowOrganizer: (id) => api.delete(`/participant/follow/${id}`).then(r => r.data),
  getAllOrganizers: () => api.get('/participant/organizers').then(r => r.data),
  getOrganizerDetail: (id) => api.get(`/participant/organizers/${id}`).then(r => r.data),
};

// ── Events ────────────────────────────────────
export const eventAPI = {
  // Public / participant
  getEvents: (params) => api.get('/events', { params }).then(r => r.data),
  getEventById: (id) => api.get(`/events/${id}`).then(r => r.data),

  // Organizer
  createEvent: (data) => api.post('/events', data).then(r => r.data),
  updateEvent: (id, data) => api.patch(`/events/${id}`, data).then(r => r.data),
  publishEvent: (id) => api.patch(`/events/${id}/publish`).then(r => r.data),
  closeEvent: (id) => api.patch(`/events/${id}/close`).then(r => r.data),
  completeEvent: (id) => api.patch(`/events/${id}/complete`).then(r => r.data),
  deleteEvent: (id) => api.delete(`/events/${id}`).then(r => r.data),
  getMyEvents: () => api.get('/events/organizer/my').then(r => r.data),
  getEventRegistrations: (id, params) => api.get(`/events/${id}/registrations`, { params }).then(r => r.data),
};

// ── Organizer ─────────────────────────────────
export const organizerAPI = {
  getProfile: () => api.get('/organizer/profile').then(r => r.data),
  updateProfile: (data) => api.patch('/organizer/profile', data).then(r => r.data),
  requestPasswordReset: (reason) => api.post('/organizer/request-password-reset', { reason }).then(r => r.data),
  testWebhook: (webhookUrl) => api.post('/organizer/test-webhook', { webhookUrl }).then(r => r.data),
};

// ── Registrations ─────────────────────────────
export const registrationAPI = {
  register: (data) => api.post('/registrations', data).then(r => r.data),
  getMyRegistrations: () => api.get('/registrations/my').then(r => r.data),
  checkRegistration: (eventId) => api.get(`/registrations/check/${eventId}`).then(r => r.data),
  getTicket: (ticketId) => api.get(`/registrations/ticket/${ticketId}`).then(r => r.data),
  cancelRegistration: (id) => api.patch(`/registrations/${id}/cancel`).then(r => r.data),
  uploadPaymentProof: (id, file) => {
    const formData = new FormData();
    formData.append('paymentProof', file);
    // Use native fetch to avoid Axios Content-Type header conflicts with FormData
    const token = localStorage.getItem('token');
    return fetch(`${API_URL}/registrations/${id}/payment-proof`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
      body: formData,
    }).then(async (res) => {
      const data = await res.json();
      if (!res.ok) throw { response: { data } };
      return data;
    });
  },
  getOrdersForEvent: (eventId) => api.get(`/registrations/event/${eventId}/orders`).then(r => r.data),
  approvePayment: (id) => api.patch(`/registrations/${id}/approve-payment`).then(r => r.data),
  rejectPayment: (id) => api.patch(`/registrations/${id}/reject-payment`).then(r => r.data),
};

// ── Attendance ─────────────────────────────────
export const attendanceAPI = {
  scanQR: (eventId, qrData) => api.post(`/attendance/${eventId}/scan`, { qrData }).then(r => r.data),
  manualOverride: (eventId, data) => api.post(`/attendance/${eventId}/manual`, data).then(r => r.data),
  getDashboard: (eventId) => api.get(`/attendance/${eventId}/dashboard`).then(r => r.data),
  exportCSV: (eventId) => api.get(`/attendance/${eventId}/export-csv`, { responseType: 'blob' }).then(r => r),
};

// ── Forum (Discussion) ─────────────────────────
export const forumAPI = {
  checkAccess: (eventId) => api.get(`/forum/${eventId}/access`).then(r => r.data),
  getMessages: (eventId, params) => api.get(`/forum/${eventId}/messages`, { params }).then(r => r.data),
  postMessage: (eventId, data) => api.post(`/forum/${eventId}/messages`, data).then(r => r.data),
  deleteMessage: (eventId, messageId) => api.delete(`/forum/${eventId}/messages/${messageId}`).then(r => r.data),
  togglePin: (eventId, messageId) => api.patch(`/forum/${eventId}/messages/${messageId}/pin`).then(r => r.data),
  voteMessage: (eventId, messageId, value) => api.post(`/forum/${eventId}/messages/${messageId}/vote`, { value }).then(r => r.data),
};

export default api;
