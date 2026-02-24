import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { participantAPI } from '../services/api';

const Clubs = () => {
    const [organizers, setOrganizers] = useState([]);
    const [loading, setLoading] = useState(true);
    const navigate = useNavigate();

    useEffect(() => { fetchOrgs(); }, []);

    const fetchOrgs = async () => {
        try {
            const res = await participantAPI.getAllOrganizers();
            setOrganizers(res.data || []);
        } catch { }
        setLoading(false);
    };

    const toggleFollow = async (org) => {
        const followed = org._followed;
        try {
            if (followed) {
                await participantAPI.unfollowOrganizer(org._id);
            } else {
                await participantAPI.followOrganizer(org._id);
            }
            setOrganizers(prev => prev.map(o =>
                o._id === org._id ? { ...o, _followed: !followed } : o
            ));
        } catch { }
    };

    if (loading) return <div className="spinner" />;

    return (
        <div className="page" style={{ paddingTop: 32 }}>
            <h1 className="page-title">Clubs & Organizers</h1>
            <p className="text-secondary mb-24">Follow clubs to get personalised event recommendations</p>

            {organizers.length === 0 ? (
                <div className="card" style={{ textAlign: 'center', padding: '60px 24px' }}>
                    <div style={{ fontSize: '3rem', marginBottom: 12 }}>🏛️</div>
                    <p className="text-secondary">No clubs registered yet.</p>
                </div>
            ) : (
                <div className="grid-3">
                    {organizers.map(org => (
                        <div key={org._id} className="card" style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                                <div style={{
                                    width: 44, height: 44, borderRadius: 10,
                                    background: 'linear-gradient(135deg, #111, #EC4899)',
                                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                                    fontSize: '1.2rem', fontWeight: 700, color: '#fff', flexShrink: 0
                                }}>
                                    {org.organizerName.charAt(0)}
                                </div>
                                <button
                                    className={`btn btn-sm ${org._followed ? 'btn-ghost' : 'btn-primary'}`}
                                    onClick={() => toggleFollow(org)}
                                >
                                    {org._followed ? 'Following ✓' : 'Follow'}
                                </button>
                            </div>

                            <div>
                                <h3
                                    onClick={() => navigate(`/clubs/${org._id}`)}
                                    style={{ fontWeight: 700, marginBottom: 4, cursor: 'pointer', color: '#111' }}
                                >
                                    {org.organizerName}
                                </h3>
                                <span className="badge badge-purple" style={{ fontSize: '0.72rem' }}>{org.organizerCategory}</span>
                            </div>

                            <p className="text-secondary" style={{ fontSize: '0.87rem', lineHeight: 1.55 }}>
                                {org.organizerDescription?.slice(0, 120)}{org.organizerDescription?.length > 120 ? '…' : ''}
                            </p>

                            <button className="btn btn-ghost btn-sm" style={{ alignSelf: 'flex-start' }}
                                onClick={() => navigate(`/clubs/${org._id}`)}>
                                View Events →
                            </button>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};

export default Clubs;
