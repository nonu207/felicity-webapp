import React, { useState, useEffect, useCallback } from 'react';
import { notificationAPI } from '../services/api';

const typeIcon = {
    password_reset_approved: '🔑',
    password_reset_rejected: '🚫',
    password_reset_requested: '🔄',
    event_published: '📢',
    registration_confirmed: '🎟️',
    registration_cancelled: '❌',
    payment_approved: '✅',
    payment_rejected: '💳',
    account_approved: '✅',
    account_deactivated: '⛔',
    organizer_welcome: '🎉',
    forum_message: '🗨️',
    forum_reply: '💬',
    general: '💬',
};

const Inbox = () => {
    const [notifications, setNotifications] = useState([]);
    const [loading, setLoading] = useState(true);
    const [unreadCount, setUnreadCount] = useState(0);
    const [page, setPage] = useState(1);
    const [pagination, setPagination] = useState({ pages: 1 });

    const load = useCallback(async (p = page) => {
        try {
            const res = await notificationAPI.getNotifications({ page: p, limit: 20 });
            setNotifications(res.data || []);
            setUnreadCount(res.unreadCount || 0);
            setPagination(res.pagination || { pages: 1 });
        } catch { }
        setLoading(false);
    }, [page]);

    useEffect(() => { load(page); }, [page, load]);

    const handleMarkRead = async (id) => {
        try {
            await notificationAPI.markAsRead(id);
            setNotifications(prev => prev.map(n => n._id === id ? { ...n, read: true } : n));
            setUnreadCount(prev => Math.max(0, prev - 1));
        } catch { }
    };

    const handleMarkAllRead = async () => {
        try {
            await notificationAPI.markAllAsRead();
            setNotifications(prev => prev.map(n => ({ ...n, read: true })));
            setUnreadCount(0);
        } catch { }
    };

    const timeAgo = (date) => {
        const seconds = Math.floor((Date.now() - new Date(date)) / 1000);
        if (seconds < 60) return 'just now';
        const mins = Math.floor(seconds / 60);
        if (mins < 60) return `${mins}m ago`;
        const hrs = Math.floor(mins / 60);
        if (hrs < 24) return `${hrs}h ago`;
        const days = Math.floor(hrs / 24);
        if (days < 7) return `${days}d ago`;
        return new Date(date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
    };

    if (loading) return <div className="spinner" />;

    return (
        <div className="page" style={{ paddingTop: 32, maxWidth: 640, margin: '0 auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
                <div>
                    <h1 className="page-title" style={{ marginBottom: 4 }}>Inbox</h1>
                    <p className="text-secondary" style={{ fontSize: '0.88rem' }}>
                        {unreadCount > 0 ? `${unreadCount} unread` : 'All caught up'}
                    </p>
                </div>
                {unreadCount > 0 && (
                    <button className="btn btn-ghost btn-sm" onClick={handleMarkAllRead}>
                        Mark all read
                    </button>
                )}
            </div>

            {notifications.length === 0 ? (
                <div className="card" style={{ textAlign: 'center', padding: '60px 24px' }}>
                    <p className="text-secondary">No notifications yet.</p>
                </div>
            ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                    {notifications.map(n => (
                        <div
                            key={n._id}
                            onClick={() => !n.read && handleMarkRead(n._id)}
                            style={{
                                display: 'flex', gap: 14, padding: '14px 16px',
                                background: n.read ? '#fff' : '#f7f7f7',
                                borderLeft: n.read ? '3px solid transparent' : '3px solid #111',
                                cursor: n.read ? 'default' : 'pointer',
                                borderBottom: '1px solid #e0e0e0',
                                transition: 'background 0.15s',
                            }}
                        >
                            <div style={{ fontSize: '1.25rem', flexShrink: 0, lineHeight: 1.4 }}>
                                {typeIcon[n.type] || '💬'}
                            </div>
                            <div style={{ flex: 1, minWidth: 0 }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8 }}>
                                    <div style={{ fontWeight: n.read ? 400 : 600, fontSize: '0.92rem', color: '#111' }}>
                                        {n.title}
                                    </div>
                                    <div style={{ fontSize: '0.75rem', color: '#999', whiteSpace: 'nowrap', flexShrink: 0 }}>
                                        {timeAgo(n.createdAt)}
                                    </div>
                                </div>
                                <p style={{ fontSize: '0.85rem', color: '#555', margin: '4px 0 0', lineHeight: 1.5 }}>
                                    {n.message}
                                </p>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* Pagination */}
            {pagination.pages > 1 && (
                <div style={{ display: 'flex', justifyContent: 'center', gap: 8, marginTop: 20 }}>
                    <button className="btn btn-ghost btn-sm" disabled={page <= 1} onClick={() => setPage(p => p - 1)}>
                        ← Prev
                    </button>
                    <span className="text-secondary" style={{ lineHeight: '32px', fontSize: '0.85rem' }}>
                        {page} / {pagination.pages}
                    </span>
                    <button className="btn btn-ghost btn-sm" disabled={page >= pagination.pages} onClick={() => setPage(p => p + 1)}>
                        Next →
                    </button>
                </div>
            )}
        </div>
    );
};

export default Inbox;
