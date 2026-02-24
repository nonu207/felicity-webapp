import React, { useState, useEffect, useRef, useCallback } from 'react';
import { forumAPI } from '../services/api';
import { useAuth } from '../context/AuthContext';
import io from 'socket.io-client';

const SOCKET_URL = process.env.REACT_APP_API_URL?.replace('/api', '') || 'http://localhost:5000';
const MAX_VISIBLE_DEPTH = 8;

// ── Helpers ───────────────────────────────────
const timeAgo = (date) => {
    const s = Math.floor((Date.now() - new Date(date)) / 1000);
    if (s < 60) return 'just now';
    const m = Math.floor(s / 60);
    if (m < 60) return `${m}m ago`;
    const h = Math.floor(m / 60);
    if (h < 24) return `${h}h ago`;
    const d = Math.floor(h / 24);
    if (d < 30) return `${d}d ago`;
    return new Date(date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
};

// ── Vote Button Component ─────────────────────
const VoteControls = ({ msg, userId, onVote }) => {
    const userVote = (msg.votes || []).find(v => v.userId === userId);
    const currentVote = userVote ? userVote.value : 0;

    return (
        <div style={{
            display: 'flex', flexDirection: 'column', alignItems: 'center',
            marginRight: 12, flexShrink: 0, userSelect: 'none',
        }}>
            <button
                onClick={(e) => { e.stopPropagation(); onVote(msg._id, currentVote === 1 ? 0 : 1); }}
                style={{
                    background: 'none', border: 'none', cursor: 'pointer', padding: '2px 4px',
                    color: currentVote === 1 ? '#ff4500' : '#878a8c', fontSize: '1rem',
                    fontWeight: 700, lineHeight: 1,
                }}
                title="Upvote"
            >▲</button>
            <span style={{
                fontSize: '0.82rem', fontWeight: 700, padding: '1px 0',
                color: msg.score > 0 ? '#ff4500' : msg.score < 0 ? '#7193ff' : '#878a8c',
            }}>{msg.score || 0}</span>
            <button
                onClick={(e) => { e.stopPropagation(); onVote(msg._id, currentVote === -1 ? 0 : -1); }}
                style={{
                    background: 'none', border: 'none', cursor: 'pointer', padding: '2px 4px',
                    color: currentVote === -1 ? '#7193ff' : '#878a8c', fontSize: '1rem',
                    fontWeight: 700, lineHeight: 1,
                }}
                title="Downvote"
            >▼</button>
        </div>
    );
};

// ── Single Threaded Comment ───────────────────
const ThreadedComment = ({
    msg, userId, isModerator, depth, onVote, onReply, onDelete, onPin, onToggleCollapse, collapsed,
}) => {
    const isCollapsed = collapsed[msg._id];
    const hasChildren = msg.children && msg.children.length > 0;
    const clampedDepth = Math.min(depth, MAX_VISIBLE_DEPTH);

    const roleBadge = msg.authorRole === 'organizer'
        ? { bg: '#0079d3', color: '#fff', label: 'OP' }
        : msg.authorRole === 'admin'
            ? { bg: '#ff4500', color: '#fff', label: 'Admin' }
            : null;

    const cardBg = msg.isAnnouncement ? '#fff8e1' : msg.isPinned ? '#f0fdf4' : 'transparent';
    const borderLeft = depth > 0 ? '2px solid #edeff1' : 'none';

    return (
        <div style={{ marginLeft: depth > 0 ? 0 : 0 }}>
            <div style={{
                display: 'flex',
                paddingLeft: clampedDepth > 0 ? 20 : 0,
                position: 'relative',
            }}>
                {/* Thread line */}
                {depth > 0 && (
                    <div
                        onClick={() => onToggleCollapse(msg._id)}
                        style={{
                            position: 'absolute', left: clampedDepth * 20 - 12, top: 0, bottom: 0,
                            width: 4, cursor: 'pointer', zIndex: 1,
                        }}
                    >
                        <div style={{
                            position: 'absolute', left: 1, top: 0, bottom: 0,
                            width: 2, background: isCollapsed ? '#0079d3' : '#edeff1',
                            borderRadius: 1, transition: 'background 0.15s',
                        }} />
                    </div>
                )}

                <div style={{
                    flex: 1, padding: '8px 8px 4px',
                    marginLeft: clampedDepth * 20,
                    borderLeft, background: cardBg, borderRadius: 4,
                    minWidth: 0,
                }}>
                    {/* Collapse indicator for collapsed threads */}
                    {isCollapsed ? (
                        <div
                            onClick={() => onToggleCollapse(msg._id)}
                            style={{
                                cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6,
                                padding: '4px 0', color: '#878a8c', fontSize: '0.8rem',
                            }}
                        >
                            <span style={{ color: '#0079d3', fontWeight: 600 }}>⊕</span>
                            <span style={{ fontWeight: 600 }}>{msg.authorName}</span>
                            <span>{msg.score} point{msg.score !== 1 ? 's' : ''}</span>
                            <span>· {timeAgo(msg.createdAt)}</span>
                            {hasChildren && <span>· {msg.replyCount || msg.children.length} {(msg.replyCount || msg.children.length) === 1 ? 'reply' : 'replies'}</span>}
                        </div>
                    ) : (
                        <>
                            {/* Header row */}
                            <div style={{ display: 'flex', alignItems: 'flex-start' }}>
                                <VoteControls msg={msg} userId={userId} onVote={onVote} />
                                <div style={{ flex: 1, minWidth: 0 }}>
                                    {/* Meta line */}
                                    <div style={{
                                        display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap',
                                        marginBottom: 4, fontSize: '0.78rem', color: '#878a8c',
                                    }}>
                                        {msg.isPinned && <span title="Pinned">📌</span>}
                                        {msg.isAnnouncement && <span>📢</span>}
                                        <span style={{ fontWeight: 700, color: msg.authorRole === 'organizer' ? '#0079d3' : '#1a1a1b' }}>
                                            {msg.authorName}
                                        </span>
                                        {roleBadge && (
                                            <span style={{
                                                background: roleBadge.bg, color: roleBadge.color,
                                                fontSize: '0.65rem', padding: '1px 5px', borderRadius: 3,
                                                fontWeight: 700, letterSpacing: 0.3,
                                            }}>{roleBadge.label}</span>
                                        )}
                                        <span>·</span>
                                        <span>{timeAgo(msg.createdAt)}</span>
                                    </div>

                                    {/* Content */}
                                    <div style={{
                                        fontSize: '0.9rem', lineHeight: 1.6, color: msg.isDeleted ? '#878a8c' : '#1a1a1b',
                                        fontStyle: msg.isDeleted ? 'italic' : 'normal',
                                        wordBreak: 'break-word', whiteSpace: 'pre-wrap',
                                        marginBottom: 6,
                                    }}>
                                        {msg.content}
                                    </div>

                                    {/* Actions bar */}
                                    {!msg.isDeleted && (
                                        <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap', marginBottom: 4 }}>
                                            <button onClick={() => onReply(msg)} style={actionBtnStyle}>
                                                💬 Reply
                                            </button>
                                            {isModerator && !msg.parentId && (
                                                <button onClick={() => onPin(msg._id)} style={actionBtnStyle}>
                                                    📌 {msg.isPinned ? 'Unpin' : 'Pin'}
                                                </button>
                                            )}
                                            {(isModerator || msg.authorId === userId) && (
                                                <button onClick={() => onDelete(msg._id)} style={{ ...actionBtnStyle, color: '#d32f2f' }}>
                                                    🗑 Delete
                                                </button>
                                            )}
                                            {hasChildren && (
                                                <button
                                                    onClick={() => onToggleCollapse(msg._id)}
                                                    style={{ ...actionBtnStyle, color: '#0079d3' }}
                                                >
                                                    ⊖ Collapse
                                                </button>
                                            )}
                                        </div>
                                    )}
                                </div>
                            </div>
                        </>
                    )}
                </div>
            </div>

            {/* Children (recursive) */}
            {!isCollapsed && hasChildren && (
                <div>
                    {msg.children.map(child => (
                        <ThreadedComment
                            key={child._id}
                            msg={child}
                            userId={userId}
                            isModerator={isModerator}
                            depth={depth + 1}
                            onVote={onVote}
                            onReply={onReply}
                            onDelete={onDelete}
                            onPin={onPin}
                            onToggleCollapse={onToggleCollapse}
                            collapsed={collapsed}
                        />
                    ))}
                </div>
            )}
        </div>
    );
};

const actionBtnStyle = {
    background: 'none', border: 'none', cursor: 'pointer',
    fontSize: '0.76rem', color: '#878a8c', fontWeight: 700,
    padding: '4px 6px', borderRadius: 4,
};

// ── Reply Composer ────────────────────────────
const ReplyComposer = ({ replyTo, onSend, onCancel, isModerator, isTopLevel }) => {
    const [content, setContent] = useState('');
    const [isAnnouncement, setIsAnnouncement] = useState(false);
    const [sending, setSending] = useState(false);
    const textareaRef = useRef(null);

    useEffect(() => {
        textareaRef.current?.focus();
    }, [replyTo]);

    const handleSend = async () => {
        if (!content.trim() || sending) return;
        setSending(true);
        await onSend(content.trim(), replyTo?._id || null, isAnnouncement);
        setContent('');
        setIsAnnouncement(false);
        setSending(false);
    };

    const handleKeyDown = (e) => {
        if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
            e.preventDefault();
            handleSend();
        }
    };

    return (
        <div style={{
            border: '1px solid #edeff1', borderRadius: 8, overflow: 'hidden',
            marginBottom: 16, background: '#fff',
        }}>
            {replyTo && (
                <div style={{
                    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                    padding: '8px 12px', background: '#f6f7f8', borderBottom: '1px solid #edeff1',
                    fontSize: '0.8rem', color: '#878a8c',
                }}>
                    <span>Replying to <strong style={{ color: '#1a1a1b' }}>{replyTo.authorName}</strong></span>
                    <button onClick={onCancel} style={{
                        background: 'none', border: 'none', cursor: 'pointer', fontSize: '1rem', color: '#878a8c',
                    }}>✕</button>
                </div>
            )}
            {isModerator && isTopLevel && (
                <label style={{
                    display: 'flex', alignItems: 'center', gap: 6,
                    padding: '8px 12px', fontSize: '0.8rem', color: '#878a8c', cursor: 'pointer',
                    borderBottom: isAnnouncement ? '2px solid #ff4500' : 'none',
                }}>
                    <input type="checkbox" checked={isAnnouncement} onChange={e => setIsAnnouncement(e.target.checked)} />
                    📢 Post as announcement
                </label>
            )}
            <textarea
                ref={textareaRef}
                value={content}
                onChange={e => setContent(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder={replyTo ? 'What are your thoughts?' : 'Start a discussion...'}
                style={{
                    width: '100%', border: 'none', outline: 'none', resize: 'vertical',
                    padding: '12px 14px', fontSize: '0.88rem', fontFamily: 'inherit',
                    minHeight: replyTo ? 80 : 56, maxHeight: 200, boxSizing: 'border-box',
                }}
            />
            <div style={{
                display: 'flex', justifyContent: 'flex-end', gap: 8, padding: '8px 12px',
                background: '#f6f7f8', borderTop: '1px solid #edeff1',
            }}>
                {replyTo && (
                    <button onClick={onCancel} style={{
                        background: 'none', border: '1px solid #878a8c', borderRadius: 20,
                        padding: '6px 16px', fontSize: '0.82rem', fontWeight: 700, cursor: 'pointer', color: '#878a8c',
                    }}>Cancel</button>
                )}
                <button onClick={handleSend} disabled={sending || !content.trim()} style={{
                    background: !content.trim() ? '#d7dadc' : '#0079d3', color: '#fff',
                    border: 'none', borderRadius: 20, padding: '6px 16px',
                    fontSize: '0.82rem', fontWeight: 700, cursor: content.trim() ? 'pointer' : 'not-allowed',
                    opacity: sending ? 0.6 : 1,
                }}>{sending ? 'Posting...' : replyTo ? 'Reply' : 'Comment'}</button>
            </div>
        </div>
    );
};

// ── Main DiscussionForum Component ────────────
const DiscussionForum = ({ eventId }) => {
    const { user } = useAuth();
    const [hasAccess, setHasAccess] = useState(false);
    const [isModerator, setIsModerator] = useState(false);
    const [threads, setThreads] = useState([]);
    const [totalMessages, setTotalMessages] = useState(0);
    const [loading, setLoading] = useState(true);
    const [sortBy, setSortBy] = useState('best');
    const [replyTo, setReplyTo] = useState(null);
    const [collapsed, setCollapsed] = useState({});
    const socketRef = useRef(null);
    const replyRef = useRef(null);

    // Check access
    useEffect(() => {
        const check = async () => {
            try {
                const res = await forumAPI.checkAccess(eventId);
                setHasAccess(res.hasAccess);
                setIsModerator(res.isModerator);
            } catch { setHasAccess(false); }
            setLoading(false);
        };
        check();
    }, [eventId]);

    // Fetch threaded messages
    const fetchMessages = useCallback(async () => {
        try {
            const res = await forumAPI.getMessages(eventId, { sort: sortBy });
            setThreads(res.data || []);
            setTotalMessages(res.total || 0);
        } catch (err) {
            console.error('Failed to fetch messages:', err);
        }
    }, [eventId, sortBy]);

    useEffect(() => {
        if (hasAccess) fetchMessages();
    }, [hasAccess, fetchMessages]);

    // Socket.IO for real-time updates
    useEffect(() => {
        if (!hasAccess) return;

        const socket = io(SOCKET_URL, { transports: ['websocket', 'polling'] });
        socketRef.current = socket;
        socket.emit('join_forum', eventId);

        // On any change, just re-fetch the full tree (simpler and correct)
        const refetch = () => fetchMessages();

        socket.on('new_message', refetch);
        socket.on('message_deleted', refetch);
        socket.on('message_pinned', refetch);
        socket.on('message_voted', ({ messageId, score, votes }) => {
            // Optimistically update score in the tree without full refetch
            setThreads(prev => updateNodeInTree(prev, messageId, n => ({ ...n, score, votes })));
        });

        return () => {
            socket.emit('leave_forum', eventId);
            socket.disconnect();
        };
    }, [hasAccess, eventId, fetchMessages]);

    // Recursively update a node in the tree
    const updateNodeInTree = (nodes, id, updater) => {
        return nodes.map(n => {
            if (n._id === id) return updater(n);
            if (n.children && n.children.length > 0) {
                return { ...n, children: updateNodeInTree(n.children, id, updater) };
            }
            return n;
        });
    };

    const handleSend = async (content, parentId, isAnnouncement) => {
        try {
            await forumAPI.postMessage(eventId, { content, parentId, isAnnouncement });
            setReplyTo(null);
            await fetchMessages();
        } catch (err) {
            console.error('Failed to send:', err);
        }
    };

    const handleVote = async (messageId, value) => {
        try {
            const res = await forumAPI.voteMessage(eventId, messageId, value);
            // Optimistic update
            setThreads(prev => updateNodeInTree(prev, messageId, n => ({
                ...n, score: res.data.score, votes: res.data.votes,
            })));
        } catch (err) {
            console.error('Failed to vote:', err);
        }
    };

    const handleDelete = async (messageId) => {
        try {
            await forumAPI.deleteMessage(eventId, messageId);
            await fetchMessages();
        } catch (err) {
            console.error('Failed to delete:', err);
        }
    };

    const handlePin = async (messageId) => {
        try {
            await forumAPI.togglePin(eventId, messageId);
            await fetchMessages();
        } catch (err) {
            console.error('Failed to pin:', err);
        }
    };

    const handleReply = (msg) => {
        setReplyTo(msg);
        setTimeout(() => replyRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' }), 100);
    };

    const handleToggleCollapse = (id) => {
        setCollapsed(prev => ({ ...prev, [id]: !prev[id] }));
    };

    if (loading) return null;
    if (!hasAccess) return null;

    return (
        <div style={{
            background: '#fff', borderRadius: 8, border: '1px solid #ccc',
            overflow: 'hidden', fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
        }}>
            {/* Header */}
            <div style={{
                padding: '14px 20px', borderBottom: '1px solid #edeff1',
                display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                background: '#f6f7f8',
            }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <h3 style={{ fontSize: '1.05rem', fontWeight: 700, margin: 0, color: '#1a1a1b' }}>
                        💬 Discussion
                    </h3>
                    <span style={{
                        background: '#edeff1', color: '#878a8c', fontSize: '0.72rem',
                        padding: '2px 8px', borderRadius: 99, fontWeight: 600,
                    }}>{totalMessages} comment{totalMessages !== 1 ? 's' : ''}</span>
                </div>

                {/* Sort controls */}
                <div style={{ display: 'flex', gap: 2, background: '#edeff1', borderRadius: 20, padding: 2 }}>
                    {[
                        { key: 'best', label: '🔥 Best' },
                        { key: 'new', label: '🕐 New' },
                        { key: 'old', label: '📜 Old' },
                    ].map(s => (
                        <button
                            key={s.key}
                            onClick={() => setSortBy(s.key)}
                            style={{
                                background: sortBy === s.key ? '#fff' : 'transparent',
                                border: 'none', borderRadius: 18, padding: '5px 12px',
                                fontSize: '0.76rem', fontWeight: sortBy === s.key ? 700 : 500,
                                color: sortBy === s.key ? '#1a1a1b' : '#878a8c',
                                cursor: 'pointer', transition: 'all 0.15s',
                                boxShadow: sortBy === s.key ? '0 1px 3px rgba(0,0,0,0.1)' : 'none',
                            }}
                        >{s.label}</button>
                    ))}
                </div>
            </div>

            {/* Top-level composer */}
            <div style={{ padding: '16px 20px 0' }}>
                {!replyTo && (
                    <ReplyComposer
                        replyTo={null}
                        onSend={handleSend}
                        onCancel={() => setReplyTo(null)}
                        isModerator={isModerator}
                        isTopLevel={true}
                    />
                )}
            </div>

            {/* Threads */}
            <div style={{ padding: '0 12px 16px', maxHeight: 600, overflowY: 'auto' }}>
                {threads.length === 0 ? (
                    <div style={{
                        textAlign: 'center', color: '#878a8c', padding: '48px 0',
                        fontSize: '0.92rem',
                    }}>
                        <div style={{ fontSize: '2rem', marginBottom: 8 }}>💬</div>
                        No comments yet. Be the first to start the discussion!
                    </div>
                ) : (
                    threads.map(thread => (
                        <ThreadedComment
                            key={thread._id}
                            msg={thread}
                            userId={user?._id}
                            isModerator={isModerator}
                            depth={0}
                            onVote={handleVote}
                            onReply={handleReply}
                            onDelete={handleDelete}
                            onPin={handlePin}
                            onToggleCollapse={handleToggleCollapse}
                            collapsed={collapsed}
                        />
                    ))
                )}
            </div>

            {/* Inline reply composer (when replying to a specific comment) */}
            {replyTo && (
                <div ref={replyRef} style={{
                    padding: '12px 20px', borderTop: '1px solid #edeff1', background: '#f6f7f8',
                }}>
                    <ReplyComposer
                        replyTo={replyTo}
                        onSend={handleSend}
                        onCancel={() => setReplyTo(null)}
                        isModerator={isModerator}
                        isTopLevel={false}
                    />
                </div>
            )}
        </div>
    );
};

export default DiscussionForum;
