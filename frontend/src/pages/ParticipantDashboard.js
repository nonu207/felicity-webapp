import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { registrationAPI } from '../services/api';
import { useAuth } from '../context/AuthContext';

const TABS = ['Upcoming', 'Normal', 'Merchandise', 'Completed', 'Cancelled'];

const ParticipantDashboard = () => {
    const { profile } = useAuth();
    const navigate = useNavigate();
    const [registrations, setRegistrations] = useState([]);
    const [loading, setLoading] = useState(true);
    const [tab, setTab] = useState('Upcoming');

    useEffect(() => { fetchRegs(); }, []);

    const fetchRegs = async () => {
        try {
            const res = await registrationAPI.getMyRegistrations();
            setRegistrations(res.data || []);
        } catch { }
        setLoading(false);
    };

    const now = new Date();
    const filtered = registrations.filter(r => {
        if (tab === 'Upcoming') return r.status === 'Active' && new Date(r.eventId?.startDate) >= now;
        if (tab === 'Normal') return r.registrationType === 'Normal';
        if (tab === 'Merchandise') return r.registrationType === 'Merchandise';
        if (tab === 'Completed') return r.eventId?.status === 'Completed';
        if (tab === 'Cancelled') return r.status === 'Cancelled';
        return true;
    });

    const statusBadge = (r) => {
        if (r.status === 'Cancelled') return <span className="badge badge-red">Cancelled</span>;
        if (r.attendanceMarked) return <span className="badge badge-green">Attended</span>;
        return <span className="badge badge-purple">Registered</span>;
    };

    return (
        <div className="page" style={{ paddingTop: 32 }}>
            {/* Welcome banner */}
            <div className="card mb-24" style={{
                background: 'linear-gradient(135deg, rgba(124,58,237,0.2), rgba(236,72,153,0.15))',
                border: '1px solid rgba(124,58,237,0.3)'
            }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 16 }}>
                    <div>
                        <h1 style={{ fontSize: '1.7rem', fontWeight: 800, marginBottom: 4 }}>
                            Hey, {profile?.firstName || 'there'}! 👋
                        </h1>
                        <p className="text-secondary">Your Felicity hub — track events and registrations</p>
                    </div>
                    <button className="btn btn-primary" onClick={() => navigate('/events')}>
                        Browse Events →
                    </button>
                </div>
            </div>

            {/* Stats row */}
            <div className="grid-4 mb-24">
                {[
                    { label: 'Total Registered', value: registrations.length, icon: '🎟️' },
                    { label: 'Upcoming', value: registrations.filter(r => r.status === 'Active' && new Date(r.eventId?.startDate) >= now).length, icon: '📅' },
                    { label: 'Attended', value: registrations.filter(r => r.attendanceMarked).length, icon: '✅' },
                    { label: 'Cancelled', value: registrations.filter(r => r.status === 'Cancelled').length, icon: '❌' },
                ].map(s => (
                    <div key={s.label} className="card card-sm" style={{ textAlign: 'center' }}>
                        <div style={{ fontSize: '1.8rem', marginBottom: 4 }}>{s.icon}</div>
                        <div style={{ fontSize: '1.6rem', fontWeight: 800 }}>{s.value}</div>
                        <p className="text-muted" style={{ fontSize: '0.78rem' }}>{s.label}</p>
                    </div>
                ))}
            </div>

            {/* Tabs */}
            <h2 className="section-title">My Events</h2>
            <div style={{ display: 'flex', gap: 4, marginBottom: 20, overflowX: 'auto', paddingBottom: 4 }}>
                {TABS.map(t => (
                    <button key={t} onClick={() => setTab(t)}
                        style={{
                            padding: '7px 16px', borderRadius: 8, border: 'none',
                            background: tab === t ? 'rgba(124,58,237,0.25)' : 'transparent',
                            color: tab === t ? '#111' : '#555',
                            font: '500 0.88rem Inter, sans-serif', cursor: 'pointer',
                            borderBottom: tab === t ? '2px solid #111' : '2px solid transparent',
                            transition: 'all 0.18s', whiteSpace: 'nowrap'
                        }}
                    >{t}</button>
                ))}
            </div>

            {loading ? <div className="spinner" /> : (
                filtered.length === 0 ? (
                    <div className="card" style={{ textAlign: 'center', padding: '52px 24px' }}>
                        <div style={{ fontSize: '2.5rem', marginBottom: 12 }}>🎪</div>
                        <p className="text-secondary">No events here yet.</p>
                        {tab === 'Upcoming' && (
                            <button className="btn btn-primary mt-16" onClick={() => navigate('/events')}>
                                Browse Events
                            </button>
                        )}
                    </div>
                ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                        {filtered.map(r => (
                            <div key={r._id} className="card" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
                                <div style={{ flex: 1 }}>
                                    <div style={{ display: 'flex', gap: 8, marginBottom: 6, flexWrap: 'wrap', alignItems: 'center' }}>
                                        <h3 style={{ fontWeight: 700, marginRight: 8 }}>{r.eventId?.eventName || 'Event'}</h3>
                                        <span className={`badge ${r.registrationType === 'Merchandise' ? 'badge-pink' : 'badge-purple'}`}>
                                            {r.registrationType}
                                        </span>
                                        {statusBadge(r)}
                                    </div>
                                    <p className="text-muted" style={{ fontSize: '0.82rem' }}>
                                        📅 {r.eventId?.startDate ? new Date(r.eventId.startDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : '—'}
                                        &nbsp;&nbsp;🎟️ <span style={{ fontFamily: 'monospace' }}>{r.ticketId}</span>
                                    </p>
                                </div>
                                <button className="btn btn-ghost btn-sm" onClick={() => navigate(`/events/${r.eventId?._id}`)}>
                                    View
                                </button>
                            </div>
                        ))}
                    </div>
                )
            )}
        </div>
    );
};

export default ParticipantDashboard;
