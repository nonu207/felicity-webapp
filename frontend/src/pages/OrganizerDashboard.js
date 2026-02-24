import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { eventAPI } from '../services/api';
import { useAuth } from '../context/AuthContext';

const STATUS_COLOR = {
  Draft:     { bg: '#e0e0e0', color: '#555', border: '#e0e0e0' },
  Published: { bg: 'rgba(59,130,246,0.15)',  color: '#60A5FA', border: 'rgba(59,130,246,0.3)' },
  Ongoing:   { bg: 'rgba(16,185,129,0.15)',  color: '#1a7a3f', border: '#a7d7b8' },
  Closed:    { bg: 'rgba(245,158,11,0.15)',  color: '#92400e', border: 'rgba(245,158,11,0.3)' },
  Completed: { bg: '#f7f7f7',  color: '#111', border: 'rgba(124,58,237,0.3)' },
};

const StatusBadge = ({ status }) => {
  const s = STATUS_COLOR[status] || STATUS_COLOR.Draft;
  return (
    <span style={{
      background: s.bg, color: s.color, border: `1px solid ${s.border}`,
      borderRadius: 99, padding: '3px 10px', fontSize: '0.75rem', fontWeight: 600,
    }}>{status}</span>
  );
};

const OrganizerDashboard = () => {
  const { profile } = useAuth();
  const navigate = useNavigate();
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => { fetchEvents(); }, []);

  const fetchEvents = async () => {
    try {
      const res = await eventAPI.getMyEvents();
      setEvents(res.data || []);
    } catch (e) {
      setError(e.response?.data?.message || 'Failed to load events');
    } finally {
      setLoading(false);
    }
  };

  const handlePublish = async (id, e) => {
    e.stopPropagation();
    try {
      await eventAPI.publishEvent(id);
      fetchEvents();
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to publish');
    }
  };

  const handleDelete = async (id, e) => {
    e.stopPropagation();
    if (!window.confirm('Delete this draft event?')) return;
    try {
      await eventAPI.deleteEvent(id);
      fetchEvents();
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to delete');
    }
  };

  // Analytics from completed events
  const completed = events.filter(ev => ev.status === 'Completed');
  const totalRevenue = completed.reduce((sum, ev) => sum + (ev.totalRevenue || 0), 0);
  const totalRegistrations = events.reduce((sum, ev) => sum + (ev.registrationCount || 0), 0);

  return (
    <div className="page" style={{ paddingTop: 32 }}>

      {/* Welcome banner */}
      <div className="card mb-24" style={{
        background: 'linear-gradient(135deg, rgba(124,58,237,0.2), rgba(236,72,153,0.15))',
        border: '1px solid rgba(124,58,237,0.3)',
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 16 }}>
          <div>
            <h1 style={{ fontSize: '1.7rem', fontWeight: 800, marginBottom: 4 }}>
              {profile?.organizerName || 'Organizer'} Dashboard
            </h1>
            <p className="text-secondary">{profile?.organizerCategory} &nbsp;·&nbsp; {profile?.contactEmail}</p>
          </div>
          <button className="btn btn-primary" onClick={() => navigate('/events/create')}>
            + Create Event
          </button>
        </div>
      </div>

      {/* Stats row */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: 16, marginBottom: 32 }}>
        {[
          { label: 'Total Events',        value: events.length },
          { label: 'Published',           value: events.filter(e => e.status === 'Published').length },
          { label: 'Total Registrations', value: totalRegistrations },
          { label: 'Sales (completed)',   value: completed.reduce((sum, ev) => sum + (ev.registrationCount || 0), 0) },
          { label: 'Revenue (completed)', value: `₹${totalRevenue.toLocaleString()}` },
        ].map(stat => (
          <div key={stat.label} className="card" style={{ textAlign: 'center', padding: '20px 16px' }}>
            <div style={{ fontSize: '1.8rem', fontWeight: 800, color: '#111' }}>{stat.value}</div>
            <div style={{ fontSize: '0.8rem', color: '#555', marginTop: 4 }}>{stat.label}</div>
          </div>
        ))}
      </div>

      {/* Events list */}
      <h2 style={{ fontSize: '1.2rem', fontWeight: 700, marginBottom: 16 }}>Your Events</h2>

      {loading && <div style={{ textAlign: 'center', padding: 40, color: '#555' }}>Loading…</div>}
      {error && <div className="alert alert-error mb-16">{error}</div>}

      {!loading && events.length === 0 && (
        <div className="card" style={{ textAlign: 'center', padding: '48px 24px' }}>
          <div style={{ fontSize: '2.5rem', marginBottom: 12 }}>📋</div>
          <p className="text-secondary" style={{ marginBottom: 20 }}>No events yet. Create your first one!</p>
          <button className="btn btn-primary" onClick={() => navigate('/events/create')}>Create Event</button>
        </div>
      )}

      <div style={{ display: 'flex', overflowX: 'auto', gap: 20, paddingBottom: 16 }}>
        {events.map(ev => (
          <div
            key={ev._id}
            className="card"
            style={{ cursor: 'pointer', transition: 'transform 0.15s', position: 'relative', minWidth: 290, maxWidth: 320, flex: '0 0 auto' }}
            onClick={() => navigate(`/organizer/events/${ev._id}`)}
            onMouseEnter={e => e.currentTarget.style.transform = 'translateY(-3px)'}
            onMouseLeave={e => e.currentTarget.style.transform = 'translateY(0)'}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10 }}>
              <span style={{
                background: '#f7f7f7', color: '#111',
                borderRadius: 6, padding: '2px 8px', fontSize: '0.73rem', fontWeight: 600,
              }}>{ev.eventType}</span>
              <StatusBadge status={ev.status} />
            </div>

            <h3 style={{ fontSize: '1rem', fontWeight: 700, marginBottom: 6 }}>{ev.eventName}</h3>
            <p className="text-secondary" style={{ fontSize: '0.83rem', marginBottom: 12, minHeight: 36,
              overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' }}>
              {ev.description || 'No description'}
            </p>

            <div style={{ fontSize: '0.78rem', color: '#555', marginBottom: 14 }}>
              <div>📅 {new Date(ev.startDate).toLocaleDateString()}</div>
              <div style={{ marginTop: 2 }}>👥 {ev.registrationCount || 0}
                {ev.registrationLimit ? ` / ${ev.registrationLimit}` : ''} registered</div>
            </div>

            {/* Quick actions */}
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              {ev.status === 'Draft' && (
                <>
                  <button className="btn btn-primary" style={{ padding: '6px 14px', fontSize: '0.8rem' }}
                    onClick={(e) => handlePublish(ev._id, e)}>Publish</button>
                  <button className="btn btn-ghost" style={{ padding: '6px 14px', fontSize: '0.8rem', color: '#b91c1c' }}
                    onClick={(e) => handleDelete(ev._id, e)}>Delete</button>
                </>
              )}
              {ev.status === 'Published' && (
                <button className="btn btn-ghost" style={{ padding: '6px 14px', fontSize: '0.8rem' }}
                  onClick={e => { e.stopPropagation(); navigate(`/organizer/events/${ev._id}`); }}>
                  Manage →
                </button>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default OrganizerDashboard;
