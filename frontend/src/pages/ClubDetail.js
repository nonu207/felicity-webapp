import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { participantAPI } from '../services/api';

const ClubDetail = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [followed, setFollowed] = useState(false);

    // eslint-disable-next-line react-hooks/exhaustive-deps
    useEffect(() => { fetchDetail(); }, [id]);

    const fetchDetail = async () => {
        try {
            const res = await participantAPI.getOrganizerDetail(id);
            setData(res.data);
            setFollowed(res.data.organizer._followed || false);
        } catch {
            navigate('/clubs');
        }
        setLoading(false);
    };

    const toggleFollow = async () => {
        try {
            if (followed) {
                await participantAPI.unfollowOrganizer(id);
            } else {
                await participantAPI.followOrganizer(id);
            }
            setFollowed(f => !f);
        } catch { }
    };

    if (loading) return <div className="spinner" />;
    if (!data) return null;

    const { organizer, upcomingEvents, pastEvents } = data;

    const EventRow = ({ event }) => (
        <div className="card" style={{ cursor: 'pointer', marginBottom: 12 }}
            onClick={() => navigate(`/events/${event._id}`)}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', gap: 8, marginBottom: 6, flexWrap: 'wrap' }}>
                        <span className={`badge ${event.eventType === 'Merchandise' ? 'badge-pink' : 'badge-purple'}`}
                            style={{ fontSize: '0.72rem' }}>{event.eventType}</span>
                        <span className={`badge ${event.status === 'Published' ? 'badge-green' : event.status === 'Ongoing' ? 'badge-green' : 'badge-gray'}`}
                            style={{ fontSize: '0.72rem' }}>{event.status}</span>
                    </div>
                    <h3 style={{ fontWeight: 700, fontSize: '1rem', marginBottom: 4, color: '#111' }}>{event.eventName}</h3>
                    <p className="text-secondary" style={{ fontSize: '0.82rem' }}>
                        📅 {new Date(event.startDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                        {event.registrationFee > 0 && ` · 💰 ₹${event.registrationFee}`}
                        {event.registrationFee === 0 && ' · Free'}
                    </p>
                </div>
                <span style={{ color: '#999', fontSize: '1.1rem', flexShrink: 0, marginLeft: 12 }}>→</span>
            </div>
        </div>
    );

    return (
        <div className="page" style={{ paddingTop: 32, maxWidth: 760, margin: '0 auto' }}>
            <button className="btn btn-ghost btn-sm mb-16" onClick={() => navigate('/clubs')}>← Back to Clubs</button>

            {/* Organizer header */}
            <div className="card card-lg mb-24">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 }}>
                    <div style={{ display: 'flex', gap: 16, alignItems: 'center' }}>
                        <div style={{
                            width: 56, height: 56, borderRadius: 14,
                            background: 'linear-gradient(135deg, #111, #EC4899)',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            fontSize: '1.5rem', fontWeight: 700, color: '#fff', flexShrink: 0
                        }}>
                            {organizer.organizerName.charAt(0)}
                        </div>
                        <div>
                            <h1 style={{ fontSize: '1.5rem', fontWeight: 800, marginBottom: 4 }}>{organizer.organizerName}</h1>
                            <span className="badge badge-purple" style={{ fontSize: '0.78rem' }}>{organizer.organizerCategory}</span>
                        </div>
                    </div>
                    <button className={`btn ${followed ? 'btn-ghost' : 'btn-primary'}`} onClick={toggleFollow}>
                        {followed ? 'Following ✓' : 'Follow'}
                    </button>
                </div>
                {organizer.organizerDescription && (
                    <p className="text-secondary" style={{ lineHeight: 1.7 }}>{organizer.organizerDescription}</p>
                )}
                {organizer.contactEmail && (
                    <p style={{ marginTop: 12, fontSize: '0.85rem', color: '#555' }}>📧 {organizer.contactEmail}</p>
                )}
            </div>

            {/* Upcoming events */}
            <div style={{ marginBottom: 32 }}>
                <h2 style={{ fontSize: '1.1rem', fontWeight: 700, marginBottom: 16, color: '#111' }}>
                    Upcoming Events {upcomingEvents.length > 0 && <span style={{ fontWeight: 400, color: '#888' }}>({upcomingEvents.length})</span>}
                </h2>
                {upcomingEvents.length === 0 ? (
                    <div className="card" style={{ textAlign: 'center', padding: '40px 24px' }}>
                        <p className="text-secondary">No upcoming events at the moment.</p>
                    </div>
                ) : (
                    upcomingEvents.map(ev => <EventRow key={ev._id} event={ev} />)
                )}
            </div>

            {/* Past events */}
            {pastEvents.length > 0 && (
                <div style={{ marginBottom: 48 }}>
                    <h2 style={{ fontSize: '1.1rem', fontWeight: 700, marginBottom: 16, color: '#111' }}>
                        Past Events <span style={{ fontWeight: 400, color: '#888' }}>({pastEvents.length})</span>
                    </h2>
                    {pastEvents.map(ev => <EventRow key={ev._id} event={ev} />)}
                </div>
            )}
        </div>
    );
};

export default ClubDetail;
