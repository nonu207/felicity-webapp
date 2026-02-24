import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { organizerAPI } from '../services/api';
import './OrganizerProfile.css';

const CATEGORIES = [
  'Cultural',
  'Technical',
  'Sports',
  'Literary',
  'Music',
  'Fine Arts',
  'Drama',
  'Social Service',
  'Finance',
  'Media',
  'Gaming',
  'Other',
];

const OrganizerProfile = () => {
  const { user, profile, setProfile } = useAuth();
  const navigate = useNavigate();

  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [requestingReset, setRequestingReset] = useState(false);
  const [resetRequested, setResetRequested] = useState(false);
  const [resetReason, setResetReason] = useState('');
  const [testingWebhook, setTestingWebhook] = useState(false);
  const [webhookResult, setWebhookResult] = useState(null);

  const [form, setForm] = useState({
    organizerName: '',
    organizerCategory: '',
    organizerDescription: '',
    contactEmail: '',
    contactNumber: '',
    discordWebhookUrl: '',
  });

  // Populate form when profile loads
  useEffect(() => {
    if (profile) {
      setForm({
        organizerName: profile.organizerName || '',
        organizerCategory: profile.organizerCategory || '',
        organizerDescription: profile.organizerDescription || '',
        contactEmail: profile.contactEmail || '',
        contactNumber: profile.contactNumber || '',
        discordWebhookUrl: profile.discordWebhookUrl || '',
      });
    }
  }, [profile]);

  const handleChange = (e) => {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
    setError('');
    setSuccess('');
  };

  const handleCancel = () => {
    // Reset form to current profile values
    if (profile) {
      setForm({
        organizerName: profile.organizerName || '',
        organizerCategory: profile.organizerCategory || '',
        organizerDescription: profile.organizerDescription || '',
        contactEmail: profile.contactEmail || '',
        contactNumber: profile.contactNumber || '',
        discordWebhookUrl: profile.discordWebhookUrl || '',
      });
    }
    setEditing(false);
    setError('');
    setSuccess('');
    setWebhookResult(null);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError('');
    setSuccess('');

    try {
      const res = await organizerAPI.updateProfile(form);
      setProfile(res.organizer);
      setSuccess('Profile updated successfully.');
      setEditing(false);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to update profile.');
    } finally {
      setSaving(false);
    }
  };

  const handleRequestReset = async () => {
    if (!resetReason.trim()) {
      setError('Please provide a reason for the password reset request.');
      return;
    }
    if (!window.confirm('Submit password reset request to admin?')) return;
    setRequestingReset(true);
    try {
      const res = await organizerAPI.requestPasswordReset(resetReason.trim());
      setResetRequested(true);
      setSuccess(res.message || 'Password reset request submitted!');
      setResetReason('');
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to submit request.');
    }
    setRequestingReset(false);
  };

  if (!profile) {
    return (
      <div className="profile-page">
        <div className="profile-loading">Loading profile…</div>
      </div>
    );
  }

  return (
    <div className="profile-page">
      <div className="profile-container">
        {/* Header */}
        <div className="profile-header">
          <div className="profile-avatar">
            {profile.organizerName?.charAt(0).toUpperCase() || '?'}
          </div>
          <div className="profile-header-info">
            <h1 className="profile-name">{profile.organizerName}</h1>
            <span className="profile-category-badge">{profile.organizerCategory}</span>
          </div>
          {!editing && (
            <button className="btn-edit-profile" onClick={() => setEditing(true)}>
              Edit Profile
            </button>
          )}
        </div>

        {/* Alerts */}
        {error && <div className="profile-alert error">{error}</div>}
        {success && <div className="profile-alert success">{success}</div>}

        {/* Body */}
        {editing ? (
          <form className="profile-form" onSubmit={handleSubmit}>
            <div className="form-group">
              <label>Club / Organizer Name</label>
              <input
                type="text"
                name="organizerName"
                value={form.organizerName}
                onChange={handleChange}
                required
                placeholder="e.g. ACM Student Chapter"
              />
            </div>

            <div className="form-group">
              <label>Category</label>
              <select
                name="organizerCategory"
                value={form.organizerCategory}
                onChange={handleChange}
                required
              >
                <option value="">Select category…</option>
                {CATEGORIES.map((cat) => (
                  <option key={cat} value={cat}>{cat}</option>
                ))}
              </select>
            </div>

            <div className="form-group">
              <label>Description</label>
              <textarea
                name="organizerDescription"
                value={form.organizerDescription}
                onChange={handleChange}
                rows={4}
                required
                placeholder="Tell participants about your club…"
              />
            </div>

            <div className="form-group">
              <label>Contact Email</label>
              <input
                type="email"
                name="contactEmail"
                value={form.contactEmail}
                onChange={handleChange}
                required
                placeholder="club@example.com"
              />
            </div>

            <div className="form-group">
              <label>Contact Number <span className="optional">(optional)</span></label>
              <input
                type="text"
                name="contactNumber"
                value={form.contactNumber}
                onChange={handleChange}
                placeholder="+91 90000 00000"
              />
            </div>

            <div className="form-group">
              <label>Discord Webhook URL <span className="optional">(optional — auto-post new events)</span></label>
              <div style={{ display: 'flex', gap: 8, alignItems: 'flex-start' }}>
                <input
                  type="url"
                  name="discordWebhookUrl"
                  value={form.discordWebhookUrl}
                  onChange={(e) => { handleChange(e); setWebhookResult(null); }}
                  placeholder="https://discord.com/api/webhooks/..."
                  style={{ flex: 1 }}
                />
                <button
                  type="button"
                  disabled={testingWebhook || !form.discordWebhookUrl}
                  onClick={async () => {
                    setTestingWebhook(true);
                    setWebhookResult(null);
                    try {
                      const res = await organizerAPI.testWebhook(form.discordWebhookUrl);
                      setWebhookResult({ ok: true, msg: res.message || 'Test sent!' });
                    } catch (err) {
                      setWebhookResult({ ok: false, msg: err.response?.data?.message || 'Test failed' });
                    }
                    setTestingWebhook(false);
                  }}
                  style={{
                    padding: '8px 16px', background: '#5865F2', color: '#fff',
                    border: 'none', borderRadius: 6, fontSize: 13, fontWeight: 600,
                    cursor: testingWebhook || !form.discordWebhookUrl ? 'not-allowed' : 'pointer',
                    opacity: testingWebhook || !form.discordWebhookUrl ? 0.5 : 1,
                    whiteSpace: 'nowrap',
                  }}
                >
                  {testingWebhook ? 'Testing…' : '🔔 Test'}
                </button>
              </div>
              {webhookResult && (
                <p style={{ fontSize: 12, marginTop: 4, color: webhookResult.ok ? '#16a34a' : '#dc2626' }}>
                  {webhookResult.ok ? '✅' : '❌'} {webhookResult.msg}
                </p>
              )}
              <p style={{ fontSize: 11, color: '#888', marginTop: 4 }}>
                When you publish, close, or complete an event, an announcement will be auto-posted to the linked Discord channel.
              </p>
            </div>

            <div className="form-group readonly-group">
              <label>Login Email <span className="readonly-hint">(cannot be changed)</span></label>
              <input type="email" value={user?.email || ''} disabled />
            </div>

            <div className="profile-form-actions">
              <button type="button" className="btn-cancel" onClick={handleCancel} disabled={saving}>
                Cancel
              </button>
              <button type="submit" className="btn-save" disabled={saving}>
                {saving ? 'Saving…' : 'Save Changes'}
              </button>
            </div>
          </form>
        ) : (
          <div className="profile-details">
            <div className="detail-row">
              <span className="detail-label">Description</span>
              <span className="detail-value">{profile.organizerDescription || '—'}</span>
            </div>
            <div className="detail-row">
              <span className="detail-label">Contact Email</span>
              <span className="detail-value">{profile.contactEmail}</span>
            </div>
            {profile.contactNumber && (
              <div className="detail-row">
                <span className="detail-label">Contact Number</span>
                <span className="detail-value">{profile.contactNumber}</span>
              </div>
            )}
            {profile.discordWebhookUrl && (
              <div className="detail-row">
                <span className="detail-label">Discord Webhook</span>
                <span className="detail-value" style={{ fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span style={{ wordBreak: 'break-all' }}>{profile.discordWebhookUrl.slice(0, 50)}…</span>
                  <button
                    onClick={async () => {
                      setTestingWebhook(true);
                      setWebhookResult(null);
                      try {
                        const res = await organizerAPI.testWebhook(profile.discordWebhookUrl);
                        setWebhookResult({ ok: true, msg: res.message || 'Sent!' });
                      } catch (err) {
                        setWebhookResult({ ok: false, msg: err.response?.data?.message || 'Failed' });
                      }
                      setTestingWebhook(false);
                    }}
                    disabled={testingWebhook}
                    style={{
                      padding: '4px 12px', background: '#5865F2', color: '#fff',
                      border: 'none', borderRadius: 4, fontSize: 12, fontWeight: 600,
                      cursor: testingWebhook ? 'not-allowed' : 'pointer',
                      opacity: testingWebhook ? 0.5 : 1,
                    }}
                  >
                    {testingWebhook ? '…' : '🔔 Test'}
                  </button>
                  {webhookResult && (
                    <span style={{ fontSize: 12, color: webhookResult.ok ? '#16a34a' : '#dc2626' }}>
                      {webhookResult.ok ? '✅' : '❌'} {webhookResult.msg}
                    </span>
                  )}
                </span>
              </div>
            )}
            <div className="detail-row">
              <span className="detail-label">Login Email</span>
              <span className="detail-value muted">{user?.email}</span>
            </div>
            <div className="detail-row">
              <span className="detail-label">Followers</span>
              <span className="detail-value">{profile.followedBy?.length ?? 0}</span>
            </div>
          </div>
        )}

        {/* Quick nav */}
        <div className="profile-footer">
          <button className="btn-ghost" onClick={() => navigate('/dashboard')}>
            ← Back to Dashboard
          </button>
        </div>

        {/* Request Password Reset */}
        {!editing && (
          <div style={{ marginTop: 24, padding: '24px 0', borderTop: '1px solid #e0e0e0' }}>
            <h3 style={{ fontSize: 16, fontWeight: 600, marginBottom: 12, color: '#111' }}>Request Password Reset</h3>
            <p style={{ fontSize: 13, color: '#666', marginBottom: 12 }}>Provide a reason and submit your request. The admin will review it and share a new password with you.</p>
            <textarea
              placeholder="Reason for password reset…"
              value={resetReason}
              onChange={(e) => setResetReason(e.target.value)}
              disabled={resetRequested}
              rows={3}
              style={{ width: '100%', maxWidth: 400, padding: '10px 12px', border: '1px solid #e0e0e0', borderRadius: 4, fontSize: 14, resize: 'vertical', fontFamily: 'inherit' }}
            />
            <div style={{ marginTop: 8 }}>
              <button
                onClick={handleRequestReset}
                disabled={requestingReset || resetRequested}
                style={{
                  padding: '10px 20px',
                  background: resetRequested ? '#999' : '#111',
                  color: '#fff',
                  border: 'none',
                  borderRadius: 4,
                  fontSize: 14,
                  fontWeight: 600,
                  cursor: resetRequested ? 'not-allowed' : 'pointer',
                }}
              >
                {resetRequested ? 'Request Submitted' : requestingReset ? 'Submitting...' : 'Submit Reset Request'}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default OrganizerProfile;
