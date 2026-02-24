import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { eventAPI } from '../services/api';
import { useAuth } from '../context/AuthContext';

const EventCard = ({ event, onClick, rank }) => {
    const statusColor = (status) => {
        const map = { Draft: 'gray', Published: 'purple', Ongoing: 'green', Closed: 'red', Completed: 'gray' };
        return `badge badge-${map[status] || 'gray'}`;
    };
    const typeColor = (t) => t === 'Merchandise' ? 'badge badge-pink' : 'badge badge-purple';

    return (
        <div className="card" style={{ cursor: 'pointer', position: 'relative' }} onClick={onClick}>
            {rank && (
                <div style={{
                    position: 'absolute', top: -8, left: -8,
                    width: 28, height: 28, borderRadius: '50%',
                    background: rank <= 3 ? 'linear-gradient(135deg, #7C3AED, #EC4899)' : '#555',
                    color: '#fff', fontWeight: 800, fontSize: '0.8rem',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    boxShadow: '0 2px 6px rgba(0,0,0,0.15)',
                }}>#{rank}</div>
            )}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
                <span className={typeColor(event.eventType)}>{event.eventType}</span>
                <span className={statusColor(event.status)}>{event.status}</span>
            </div>
            <h3 style={{ fontSize: '1.05rem', fontWeight: 700, marginBottom: 6, color: '#111' }}>{event.eventName}</h3>
            {event.organizerId?.organizerName && (
                <p style={{ fontSize: '0.78rem', color: '#7C3AED', fontWeight: 600, marginBottom: 6 }}>
                    🏛️ {event.organizerId.organizerName}
                </p>
            )}
            <p className="text-secondary" style={{ fontSize: '0.85rem', marginBottom: 12, lineHeight: 1.5 }}>
                {event.description?.slice(0, 90)}{event.description?.length > 90 ? '…' : ''}
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                <p className="text-muted" style={{ fontSize: '0.8rem' }}>
                    📅 {new Date(event.startDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                </p>
                <p className="text-muted" style={{ fontSize: '0.8rem' }}>
                    ⏰ Deadline: {new Date(event.registrationDeadline).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}
                </p>
                <p className="text-muted" style={{ fontSize: '0.8rem' }}>
                    💰 {event.registrationFee > 0 ? `₹${event.registrationFee}` : 'Free'}
                </p>
                {rank && (
                    <p className="text-muted" style={{ fontSize: '0.8rem' }}>
                        🔥 {event.registrationCount || 0} registrations
                    </p>
                )}
            </div>
            {event.eventTags?.length > 0 && (
                <div style={{ marginTop: 12, display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                    {event.eventTags.slice(0, 3).map(tag => (
                        <span key={tag} className="badge badge-gray" style={{ fontSize: '0.7rem' }}>#{tag}</span>
                    ))}
                </div>
            )}
        </div>
    );
};

const BrowseEvents = () => {
    const { user, profile } = useAuth();
    const navigate = useNavigate();
    const [events, setEvents] = useState([]);
    const [trendingEvents, setTrendingEvents] = useState([]);
    const [loading, setLoading] = useState(true);
    const [trendingLoading, setTrendingLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [filter, setFilter] = useState({ eventType: '', eligibility: '', dateFrom: '', dateTo: '', followed: false });

    // Fetch trending events on mount
    useEffect(() => {
        const fetchTrending = async () => {
            setTrendingLoading(true);
            try {
                const params = { trending: true };
                if (user?.role === 'organizer' && profile?._id) params.organizerId = profile._id;
                const res = await eventAPI.getEvents(params);
                setTrendingEvents(res.data || []);
            } catch {
                setTrendingEvents([]);
            }
            setTrendingLoading(false);
        };
        fetchTrending();
    }, []);

    // eslint-disable-next-line react-hooks/exhaustive-deps
    useEffect(() => { fetchEvents(); }, [filter]);

    const fetchEvents = async () => {
        setLoading(true);
        try {
            const params = {
                search: search || undefined,
                eventType: filter.eventType || undefined,
                eligibility: filter.eligibility || undefined,
                dateFrom: filter.dateFrom || undefined,
                dateTo: filter.dateTo || undefined,
                followed: filter.followed || undefined,
            };
            if (user?.role === 'organizer' && profile?._id) params.organizerId = profile._id;
            const res = await eventAPI.getEvents(params);
            setEvents(res.data || []);
        } catch {
            setEvents([]);
        }
        setLoading(false);
    };

    const handleSearch = (e) => { e.preventDefault(); fetchEvents(); };

    const handleClearFilters = () => {
        setSearch('');
        setFilter({ eventType: '', eligibility: '', dateFrom: '', dateTo: '', followed: false });
    };

    const hasActiveFilters = search || filter.eventType || filter.eligibility || filter.dateFrom || filter.dateTo || filter.followed;

    return (
        <div className="page-wide" style={{ paddingTop: 32 }}>
            <h1 className="page-title">{user?.role === 'organizer' ? 'Your Events' : 'Browse Events'}</h1>
            <p className="text-secondary mb-24">{user?.role === 'organizer' ? 'Published & ongoing events from your club' : 'Discover what\'s happening at Felicity'}</p>

            {/* ── Trending Section ── */}
            <div style={{ marginBottom: 32 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
                    <span style={{ fontSize: '1.4rem' }}>🔥</span>
                    <h2 style={{ fontSize: '1.15rem', fontWeight: 700, color: '#111', margin: 0 }}>Trending Now</h2>
                    <span className="text-muted" style={{ fontSize: '0.78rem' }}>Top 5 in last 24 hours</span>
                </div>
                {trendingLoading ? <div className="spinner" /> : (
                    trendingEvents.length === 0 ? (
                        <div className="card" style={{ textAlign: 'center', padding: '24px' }}>
                            <p className="text-secondary" style={{ fontSize: '0.88rem' }}>No trending events right now. Check back later!</p>
                        </div>
                    ) : (
                        <div style={{ display: 'flex', gap: 16, overflowX: 'auto', paddingBottom: 8 }}>
                            {trendingEvents.map((event, i) => (
                                <div key={event._id} style={{ flex: '0 0 260px', minWidth: 260 }}>
                                    <EventCard event={event} rank={i + 1} onClick={() => navigate(user?.role === 'organizer' ? `/organizer/events/${event._id}` : `/events/${event._id}`)} />
                                </div>
                            ))}
                        </div>
                    )
                )}
            </div>

            <hr style={{ border: 'none', borderTop: '1px solid #e0e0e0', margin: '24px 0' }} />

            {/* ── Search + filters ── */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
                <h2 style={{ fontSize: '1.15rem', fontWeight: 700, color: '#111', margin: 0 }}>All Events</h2>
            </div>
            <div className="card mb-24">
                <form onSubmit={handleSearch} style={{ display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'flex-end' }}>
                    <div className="form-group" style={{ flex: '1 1 200px', marginBottom: 0 }}>
                        <label>Search</label>
                        <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Event or organizer name…" />
                    </div>
                    <div className="form-group" style={{ flex: '0 0 140px', marginBottom: 0 }}>
                        <label>Type</label>
                        <select value={filter.eventType} onChange={e => setFilter({ ...filter, eventType: e.target.value })}>
                            <option value="">All Types</option>
                            <option value="Normal">Normal</option>
                            <option value="Merchandise">Merchandise</option>
                        </select>
                    </div>
                    <div className="form-group" style={{ flex: '0 0 160px', marginBottom: 0 }}>
                        <label>Eligibility</label>
                        <select value={filter.eligibility} onChange={e => setFilter({ ...filter, eligibility: e.target.value })}>
                            <option value="">All</option>
                            <option value="all">Everyone</option>
                            <option value="iiit-only">IIIT Only</option>
                            <option value="non-iiit-only">Non-IIIT Only</option>
                        </select>
                    </div>
                    <div className="form-group" style={{ flex: '0 0 140px', marginBottom: 0 }}>
                        <label>From</label>
                        <input type="date" value={filter.dateFrom} onChange={e => setFilter({ ...filter, dateFrom: e.target.value })} />
                    </div>
                    <div className="form-group" style={{ flex: '0 0 140px', marginBottom: 0 }}>
                        <label>To</label>
                        <input type="date" value={filter.dateTo} onChange={e => setFilter({ ...filter, dateTo: e.target.value })} />
                    </div>
                    {user?.role === 'participant' && (
                        <label style={{ display: 'flex', alignItems: 'center', gap: 8, color: '#555', fontSize: '0.88rem', cursor: 'pointer', marginBottom: 0 }}>
                            <input type="checkbox" checked={filter.followed}
                                onChange={e => setFilter({ ...filter, followed: e.target.checked })} />
                            Followed clubs only
                        </label>
                    )}
                    <button type="submit" className="btn btn-primary" style={{ marginBottom: 0 }}>Search</button>
                    {hasActiveFilters && (
                        <button type="button" className="btn btn-ghost" style={{ marginBottom: 0 }} onClick={handleClearFilters}>
                            Clear
                        </button>
                    )}
                </form>
            </div>

            {loading ? <div className="spinner" /> : (
                events.length === 0 ? (
                    <div className="card" style={{ textAlign: 'center', padding: '60px 24px' }}>
                        <div style={{ fontSize: '3rem', marginBottom: 12 }}>🎪</div>
                        <p className="text-secondary">No events found. Try adjusting your filters.</p>
                    </div>
                ) : (
                    <>
                        <p className="text-muted" style={{ marginBottom: 12, fontSize: '0.85rem' }}>
                            {events.length} event{events.length !== 1 ? 's' : ''} found
                        </p>
                        <div className="grid-3">
                            {events.map(event => (
                                <EventCard key={event._id} event={event} onClick={() => navigate(user?.role === 'organizer' ? `/organizer/events/${event._id}` : `/events/${event._id}`)} />
                            ))}
                        </div>
                    </>
                )
            )}
        </div>
    );
};

export default BrowseEvents;
