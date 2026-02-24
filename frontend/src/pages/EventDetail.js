import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { eventAPI, registrationAPI } from '../services/api';
import { useAuth } from '../context/AuthContext';
import DiscussionForum from '../components/DiscussionForum';

const PAYMENT_BADGE = {
    Free: { bg: '#f0fdf4', color: '#166534', label: 'Free' },
    Paid: { bg: '#f0fdf4', color: '#166534', label: 'Paid ✓' },
    PendingApproval: { bg: '#fffbeb', color: '#92400e', label: 'Pending Approval' },
    Rejected: { bg: '#fef2f2', color: '#991b1b', label: 'Rejected' },
};

const EventDetail = () => {
    const { id } = useParams();
    const { user } = useAuth();
    const navigate = useNavigate();
    const [event, setEvent] = useState(null);
    const [loading, setLoading] = useState(true);
    const [registering, setRegistering] = useState(false);
    const [formAnswers, setFormAnswers] = useState({});
    const [message, setMessage] = useState({ text: '', type: '' });
    const [ticket, setTicket] = useState(null);

    // Merchandise-specific state
    const [selectedItem, setSelectedItem] = useState(null);
    const [quantity, setQuantity] = useState(1);

    // Payment proof upload state
    const [existingReg, setExistingReg] = useState(null);
    const [proofFile, setProofFile] = useState(null);
    const [uploading, setUploading] = useState(false);

    // QR enlarge modal
    const [qrModal, setQrModal] = useState(false);

    // eslint-disable-next-line react-hooks/exhaustive-deps
    useEffect(() => { fetchEvent(); checkExisting(); }, [id]);

    const fetchEvent = async () => {
        try {
            const res = await eventAPI.getEventById(id);
            setEvent(res.data);
        } catch { navigate('/events'); }
        setLoading(false);
    };

    const checkExisting = async () => {
        try {
            const res = await registrationAPI.checkRegistration(id);
            if (res.registered) setExistingReg(res.data);
        } catch { }
    };

    const deadlinePassed = event && new Date(event.registrationDeadline) < new Date();
    const limitReached = event && event.registrationLimit && event.registrationCount >= event.registrationLimit;
    const canRegister = event && !deadlinePassed && !limitReached && event.status === 'Published';

    const handleRegister = async (e) => {
        e.preventDefault();
        setRegistering(true);

        // Client-side validation for custom form fields
        if (event.customForm?.fields?.length > 0) {
            for (const field of event.customForm.fields) {
                const val = formAnswers[field.fieldLabel];
                if (field.isRequired && (val === undefined || val === '')) {
                    setMessage({ text: `Required field missing: "${field.fieldLabel}"`, type: 'error' });
                    setRegistering(false);
                    return;
                }
                if (val !== undefined && val !== '') {
                    if (field.fieldType === 'number') {
                        if (isNaN(Number(val))) {
                            setMessage({ text: `"${field.fieldLabel}" requires a valid number`, type: 'error' });
                            setRegistering(false);
                            return;
                        }
                        const numVal = Number(val);
                        if (field.min != null && numVal < field.min) {
                            setMessage({ text: `"${field.fieldLabel}" must be at least ${field.min}`, type: 'error' });
                            setRegistering(false);
                            return;
                        }
                        if (field.max != null && numVal > field.max) {
                            setMessage({ text: `"${field.fieldLabel}" must be at most ${field.max}`, type: 'error' });
                            setRegistering(false);
                            return;
                        }
                    }
                    if (field.fieldType === 'email' && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(val)) {
                        setMessage({ text: `Invalid email address for "${field.fieldLabel}"`, type: 'error' });
                        setRegistering(false);
                        return;
                    }
                    if (field.fieldType === 'phone' && !/^\+?[\d\s\-()]{7,15}$/.test(val)) {
                        setMessage({ text: `Invalid phone number for "${field.fieldLabel}". Use 7-15 digits.`, type: 'error' });
                        setRegistering(false);
                        return;
                    }
                }
            }
        }

        try {
            const payload = { eventId: id };

            if (event.customForm?.fields?.length > 0) {
                payload.formResponses = event.customForm.fields.map(f => ({
                    fieldLabel: f.fieldLabel,
                    answer: formAnswers[f.fieldLabel] || ''
                }));
            }

            if (event.eventType === 'Merchandise') {
                if (!selectedItem) {
                    setMessage({ text: 'Please select a merchandise item', type: 'error' });
                    setRegistering(false);
                    return;
                }
                payload.merchandiseOrder = { itemId: selectedItem._id, quantity };
            }

            const res = await registrationAPI.register(payload);
            setTicket(res.data);
            if (res.data.paymentStatus === 'PendingApproval') {
                setMessage({ text: 'Order placed! Upload your payment proof below to proceed.', type: 'success' });
                // Re-check to get the registration for upload
                await checkExisting();
            } else {
                setMessage({ text: 'Successfully registered! Check your email for the ticket.', type: 'success' });
            }
        } catch (err) {
            setMessage({ text: err.response?.data?.message || 'Registration failed', type: 'error' });
        }
        setRegistering(false);
    };

    const handleUploadProof = async () => {
        if (!proofFile || !existingReg) return;
        setUploading(true);
        try {
            await registrationAPI.uploadPaymentProof(existingReg._id, proofFile);
            setMessage({ text: 'Payment proof uploaded! Waiting for organizer approval.', type: 'success' });
            setProofFile(null);
            await checkExisting();
        } catch (err) {
            setMessage({ text: err.response?.data?.message || 'Upload failed', type: 'error' });
        }
        setUploading(false);
    };

    if (loading) return <div className="spinner" />;
    if (!event) return null;

    const paymentBadge = existingReg ? PAYMENT_BADGE[existingReg.paymentStatus] : null;

    return (
        <div className="page" style={{ maxWidth: 800, paddingTop: 32 }}>
            <button className="btn btn-ghost btn-sm mb-16" onClick={() => navigate('/events')}>← Back</button>

            <div className="card card-lg mb-24">
                <div style={{ display: 'flex', gap: 10, marginBottom: 16, flexWrap: 'wrap' }}>
                    <span className={`badge ${event.eventType === 'Merchandise' ? 'badge-pink' : 'badge-purple'}`}>{event.eventType}</span>
                    <span className={`badge ${event.status === 'Published' ? 'badge-green' : 'badge-gray'}`}>{event.status}</span>
                    {event.eligibility !== 'all' && (
                        <span className="badge badge-yellow">{event.eligibility === 'iiit-only' ? 'IIIT Only' : 'Non-IIIT Only'}</span>
                    )}
                </div>

                <h1 style={{ fontSize: '1.8rem', fontWeight: 800, marginBottom: 8 }}>{event.eventName}</h1>
                <p className="text-secondary" style={{ lineHeight: 1.7, marginBottom: 24 }}>{event.description}</p>

                <div className="grid-2" style={{ gap: 12, marginBottom: 24 }}>
                    <div className="card card-sm">
                        <p className="text-muted" style={{ fontSize: '0.78rem', marginBottom: 4 }}>START DATE</p>
                        <p style={{ fontWeight: 600 }}>{new Date(event.startDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })}</p>
                    </div>
                    <div className="card card-sm">
                        <p className="text-muted" style={{ fontSize: '0.78rem', marginBottom: 4 }}>END DATE</p>
                        <p style={{ fontWeight: 600 }}>{new Date(event.endDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })}</p>
                    </div>
                    <div className="card card-sm">
                        <p className="text-muted" style={{ fontSize: '0.78rem', marginBottom: 4 }}>REGISTRATION DEADLINE</p>
                        <p style={{ fontWeight: 600, color: deadlinePassed ? 'var(--danger)' : 'inherit' }}>
                            {new Date(event.registrationDeadline).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })}
                            {deadlinePassed && ' (Closed)'}
                        </p>
                    </div>
                    <div className="card card-sm">
                        <p className="text-muted" style={{ fontSize: '0.78rem', marginBottom: 4 }}>FEE</p>
                        <p style={{ fontWeight: 600 }}>{event.registrationFee ? `₹${event.registrationFee}` : 'Free'}</p>
                    </div>
                </div>

                {event.eventTags?.length > 0 && (
                    <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                        {event.eventTags.map(tag => <span key={tag} className="badge badge-gray">#{tag}</span>)}
                    </div>
                )}
            </div>

            {/* Merchandise Items Listing */}
            {event.eventType === 'Merchandise' && event.merchandiseItems?.length > 0 && (
                <div className="card mb-24">
                    <h2 className="section-title" style={{ marginBottom: 16 }}>Available Items</h2>
                    <div style={{ display: 'grid', gap: 10 }}>
                        {event.merchandiseItems.map(item => (
                            <div key={item._id}
                                onClick={() => !existingReg && setSelectedItem(item)}
                                style={{
                                    padding: '14px 18px', borderRadius: 8,
                                    border: `1px solid ${selectedItem?._id === item._id ? '#111' : '#e0e0e0'}`,
                                    background: selectedItem?._id === item._id ? '#f7f7f7' : '#fff',
                                    cursor: existingReg ? 'default' : 'pointer',
                                    opacity: item.stockQuantity === 0 ? 0.5 : 1,
                                }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                    <div>
                                        <div style={{ fontWeight: 700, fontSize: '0.95rem' }}>{item.name}</div>
                                        <div style={{ fontSize: '0.82rem', color: '#777', marginTop: 2 }}>
                                            {[item.size, item.color, item.variant].filter(Boolean).join(' · ') || '—'}
                                        </div>
                                    </div>
                                    <div style={{ textAlign: 'right' }}>
                                        <div style={{ fontWeight: 700 }}>₹{item.price}</div>
                                        <div style={{ fontSize: '0.78rem', color: item.stockQuantity > 0 ? '#166534' : '#991b1b' }}>
                                            {item.stockQuantity > 0 ? `${item.stockQuantity} in stock` : 'Out of stock'}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* Registration section — only for participants */}
            {user?.role === 'participant' && (
                <div className="card">
                    <h2 className="section-title">
                        {event.eventType === 'Merchandise' ? 'Purchase' : 'Register'}
                    </h2>

                    {message.text && <div className={`alert alert-${message.type} mb-16`}>{message.text}</div>}

                    {/* Existing registration status */}
                    {existingReg && paymentBadge && (
                        <div style={{ marginBottom: 16 }}>
                            <div className="card card-sm" style={{ background: paymentBadge.bg, border: `1px solid ${paymentBadge.color}30` }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 8 }}>
                                    <div>
                                        <p style={{ fontWeight: 700, marginBottom: 4 }}>🎟️ Ticket: {existingReg.ticketId}</p>
                                        <span style={{
                                            background: paymentBadge.bg, color: paymentBadge.color,
                                            padding: '2px 10px', borderRadius: 99, fontSize: '0.8rem', fontWeight: 600,
                                            border: `1px solid ${paymentBadge.color}40`,
                                        }}>{paymentBadge.label}</span>
                                    </div>
                                    {existingReg.qrData && (
                                        <img src={existingReg.qrData} alt="QR Ticket"
                                            style={{ width: 100, height: 100, borderRadius: 8, cursor: 'pointer' }}
                                            title="Click to enlarge"
                                            onClick={() => setQrModal(true)} />
                                    )}
                                </div>

                                {/* Payment proof already uploaded */}
                                {existingReg.paymentProofUrl && (
                                    <div style={{ marginTop: 12 }}>
                                        <p style={{ fontSize: '0.82rem', color: '#555', marginBottom: 4 }}>Payment Proof:</p>
                                        <img src={`${process.env.REACT_APP_API_URL?.replace('/api', '') || 'http://localhost:5000'}${existingReg.paymentProofUrl}`}
                                            alt="Payment proof" style={{ maxWidth: 200, borderRadius: 6, border: '1px solid #e0e0e0' }} />
                                    </div>
                                )}
                            </div>
                        </div>
                    )}

                    {/* Payment proof upload for PendingApproval / Rejected */}
                    {existingReg && ['PendingApproval', 'Rejected'].includes(existingReg.paymentStatus) && (
                        <div style={{ marginBottom: 16, padding: '16px', background: '#f7f7f7', borderRadius: 8, border: '1px solid #e0e0e0' }}>
                            <p style={{ fontWeight: 600, marginBottom: 8, fontSize: '0.9rem' }}>
                                {existingReg.paymentStatus === 'Rejected'
                                    ? '⚠️ Your payment was rejected. Please upload a new proof.'
                                    : '📎 Upload Payment Proof'}
                            </p>
                            <input type="file" accept="image/jpeg,image/png,image/webp"
                                onChange={e => setProofFile(e.target.files[0])} style={{ marginBottom: 8 }} />
                            <button className="btn btn-primary" onClick={handleUploadProof} disabled={uploading || !proofFile}>
                                {uploading ? 'Uploading…' : 'Upload Proof'}
                            </button>
                        </div>
                    )}

                    {ticket && !existingReg && (
                        <div className="alert alert-success" style={{ marginBottom: 16 }}>
                            <p style={{ fontWeight: 700, marginBottom: 4 }}>🎟️ Your Ticket ID</p>
                            <p style={{ fontFamily: 'monospace', fontSize: '1.1rem' }}>{ticket.ticketId}</p>
                        </div>
                    )}

                    {deadlinePassed && <div className="alert alert-warn">Registration deadline has passed.</div>}
                    {limitReached && <div className="alert alert-warn">Registration limit reached.</div>}

                    {canRegister && !ticket && !existingReg && (
                        <form onSubmit={handleRegister}>
                            {/* Normal event custom form */}
                            {event.customForm?.fields?.map(field => (
                                <div key={field.fieldLabel} className="form-group">
                                    <label>{field.fieldLabel}{field.isRequired && ' *'}</label>
                                    {field.fieldType === 'textarea' ? (
                                        <textarea required={field.isRequired}
                                            value={formAnswers[field.fieldLabel] || ''}
                                            onChange={e => setFormAnswers({ ...formAnswers, [field.fieldLabel]: e.target.value })} />
                                    ) : field.fieldType === 'dropdown' ? (
                                        <select required={field.isRequired}
                                            value={formAnswers[field.fieldLabel] || ''}
                                            onChange={e => setFormAnswers({ ...formAnswers, [field.fieldLabel]: e.target.value })}>
                                            <option value="">Select…</option>
                                            {field.options?.map(o => <option key={o} value={o}>{o}</option>)}
                                        </select>
                                    ) : field.fieldType === 'email' ? (
                                        <input type="email"
                                            required={field.isRequired}
                                            placeholder="example@email.com"
                                            value={formAnswers[field.fieldLabel] || ''}
                                            onChange={e => setFormAnswers({ ...formAnswers, [field.fieldLabel]: e.target.value })} />
                                    ) : field.fieldType === 'phone' ? (
                                        <input type="tel"
                                            required={field.isRequired}
                                            placeholder="+91 98765 43210"
                                            pattern="\+?[\d\s\-()]{7,15}"
                                            title="Enter a valid phone number (7-15 digits)"
                                            value={formAnswers[field.fieldLabel] || ''}
                                            onChange={e => setFormAnswers({ ...formAnswers, [field.fieldLabel]: e.target.value })} />
                                    ) : field.fieldType === 'number' ? (
                                        <div>
                                            <input type="number"
                                                required={field.isRequired}
                                                placeholder={field.min != null && field.max != null ? `${field.min} – ${field.max}` : '0'}
                                                min={field.min ?? undefined}
                                                max={field.max ?? undefined}
                                                value={formAnswers[field.fieldLabel] || ''}
                                                onChange={e => setFormAnswers({ ...formAnswers, [field.fieldLabel]: e.target.value })} />
                                            {(field.min != null || field.max != null) && (
                                                <p style={{ fontSize: '0.78rem', color: '#666', marginTop: 4 }}>
                                                    {field.min != null && field.max != null
                                                        ? `Accepted range: ${field.min} – ${field.max}`
                                                        : field.min != null
                                                            ? `Minimum value: ${field.min}`
                                                            : `Maximum value: ${field.max}`}
                                                </p>
                                            )}
                                        </div>
                                    ) : (
                                        <input type={field.fieldType === 'file' ? 'file' : 'text'}
                                            required={field.isRequired}
                                            value={field.fieldType !== 'file' ? (formAnswers[field.fieldLabel] || '') : undefined}
                                            onChange={e => setFormAnswers({ ...formAnswers, [field.fieldLabel]: e.target.value })} />
                                    )}
                                </div>
                            ))}

                            {/* Merchandise quantity selector */}
                            {event.eventType === 'Merchandise' && selectedItem && (
                                <div className="form-group">
                                    <label>Quantity (max {event.purchaseLimitPerParticipant || 1})</label>
                                    <input type="number" min={1} max={event.purchaseLimitPerParticipant || 1}
                                        value={quantity}
                                        onChange={e => setQuantity(Math.max(1, Math.min(Number(e.target.value), event.purchaseLimitPerParticipant || 1)))} />
                                    <p style={{ fontSize: '0.82rem', color: '#555', marginTop: 4 }}>
                                        Total: ₹{selectedItem.price * quantity}
                                    </p>
                                </div>
                            )}

                            <button type="submit" className="btn btn-primary btn-lg" disabled={registering}>
                                {registering ? 'Processing…' : event.eventType === 'Merchandise' ? 'Place Order' : 'Register Now'}
                            </button>
                        </form>
                    )}
                </div>
            )}
            {/* QR enlarge modal */}
            {qrModal && existingReg?.qrData && (
                <div style={{
                    position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999,
                }} onClick={() => setQrModal(false)}>
                    <div style={{ background: '#fff', borderRadius: 16, padding: 28, maxWidth: 400, width: '90%', textAlign: 'center' }}
                        onClick={e => e.stopPropagation()}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                            <strong style={{ fontSize: '1rem' }}>🎟️ {existingReg.ticketId}</strong>
                            <button className="btn btn-ghost" style={{ padding: '2px 8px' }} onClick={() => setQrModal(false)}>✕</button>
                        </div>
                        <img src={existingReg.qrData} alt="QR Ticket"
                            style={{ width: '100%', maxWidth: 320, height: 'auto', borderRadius: 12, imageRendering: 'pixelated' }} />
                        <p style={{ fontSize: '0.82rem', color: '#777', marginTop: 12 }}>Scan this QR code at the event entrance</p>
                    </div>
                </div>
            )}

            {/* Discussion Forum */}
            {user && (
                <div style={{ marginTop: 24 }}>
                    <DiscussionForum eventId={id} />
                </div>
            )}
        </div>
    );
};

export default EventDetail;
