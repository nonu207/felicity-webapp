import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { eventAPI, registrationAPI } from '../services/api';
import DiscussionForum from '../components/DiscussionForum';

const STATUS_COLOR = {
  Draft: '#999',
  Published: '#1a7a3f',
  Ongoing: '#1a7a3f',
  Closed: '#333',
  Completed: '#111',
};

const OrganizerEventDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();

  const [event, setEvent] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [editing, setEditing] = useState(false);

  // Participants list
  const [registrations, setRegistrations] = useState([]);
  const [regsLoading, setRegsLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterPayment, setFilterPayment] = useState('all');
  const [filterStatus, setFilterStatus] = useState('all');

  // Payment actions (inline approve/reject in participants table)
  const [actingOnPayment, setActingOnPayment] = useState(null);
  const [paymentMsg, setPaymentMsg] = useState('');
  const [proofModalUrl, setProofModalUrl] = useState(null);

  // Editable fields (draft = all; published = limited subset)
  const [editForm, setEditForm] = useState({});

  const load = async () => {
    try {
      const res = await eventAPI.getEventById(id);
      const ev = res.data;
      setEvent(ev);
      setEditForm({
        eventName: ev.eventName,
        description: ev.description || '',
        startDate: ev.startDate?.slice(0, 16) || '',
        endDate: ev.endDate?.slice(0, 16) || '',
        registrationDeadline: ev.registrationDeadline?.slice(0, 16) || '',
        location: ev.location || '',
        registrationFee: ev.registrationFee || 0,
        eligibility: ev.eligibility || 'all',
        registrationLimit: ev.registrationLimit || '',
        eventTags: (ev.eventTags || []).join(', '),
        merchandiseItems: (ev.merchandiseItems || []).map(item => ({
          name: item.name || '', size: item.size || '', color: item.color || '',
          variant: item.variant || '', price: item.price || 0, stockQuantity: item.stockQuantity || 0,
        })),
        purchaseLimitPerParticipant: ev.purchaseLimitPerParticipant || 1,
        customFormFields: (ev.customForm?.fields || []).map((f, i) => ({
          fieldLabel: f.fieldLabel || '', fieldType: f.fieldType || 'text',
          options: f.options || [], isRequired: f.isRequired || false, order: f.order ?? i,
        })),
      });
    } catch (e) {
      setError(e.response?.data?.message || 'Failed to load event');
    } finally {
      setLoading(false);
    }
  };

  const loadRegistrations = async () => {
    setRegsLoading(true);
    try {
      const res = await eventAPI.getEventRegistrations(id);
      setRegistrations(res.data || []);
    } catch { setRegistrations([]); }
    setRegsLoading(false);
  };

  useEffect(() => { load(); }, [id]);
  useEffect(() => {
    if (event && event.status !== 'Draft') loadRegistrations();
  }, [event?.status]);

  const flash = (msg, isError = false) => {
    if (isError) setError(msg); else setSuccess(msg);
    setTimeout(() => { setError(''); setSuccess(''); }, 3500);
  };

  const handlePaymentAction = async (regId, action) => {
    setActingOnPayment(regId);
    try {
      if (action === 'approve') await registrationAPI.approvePayment(regId);
      else await registrationAPI.rejectPayment(regId);
      await loadRegistrations();
      setPaymentMsg(`Payment ${action}d successfully`);
      setTimeout(() => setPaymentMsg(''), 3000);
    } catch (err) {
      setPaymentMsg(err.response?.data?.message || 'Action failed');
      setTimeout(() => setPaymentMsg(''), 4000);
    }
    setActingOnPayment(null);
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const payload = {
        ...editForm,
        registrationFee: Number(editForm.registrationFee) || 0,
        registrationLimit: editForm.registrationLimit ? Number(editForm.registrationLimit) : undefined,
        eventTags: editForm.eventTags
          ? editForm.eventTags.split(',').map(t => t.trim()).filter(Boolean)
          : [],
      };
      // Clean out internal state fields
      delete payload.customFormFields;

      // For published events, only send deadline/limit if actually changed
      if (!isDraft) {
        const origDL = (event.registrationDeadline || '').slice(0, 16);
        const origLimit = event.registrationLimit || '';
        if (editForm.registrationDeadline === origDL) delete payload.registrationDeadline;
        if (String(editForm.registrationLimit) === String(origLimit)) delete payload.registrationLimit;
      }
      // Include custom form fields for Normal events (draft only, not locked)
      if (isDraft && !event.customForm?.isLocked) {
        payload.customForm = { fields: editForm.customFormFields || [] };
      }
      // Include merch items with numeric coercion
      if (event.eventType === 'Merchandise' && isDraft) {
        payload.merchandiseItems = (editForm.merchandiseItems || []).map(item => ({
          name: item.name, size: item.size || undefined, color: item.color || undefined,
          variant: item.variant || undefined, price: Number(item.price) || 0,
          stockQuantity: Number(item.stockQuantity) || 0,
        }));
        payload.purchaseLimitPerParticipant = Number(editForm.purchaseLimitPerParticipant) || 1;
        // Validate at least one item
        if (!payload.merchandiseItems.length) {
          flash('Add at least one merchandise item', true);
          setSaving(false);
          return;
        }
        for (let i = 0; i < payload.merchandiseItems.length; i++) {
          const it = payload.merchandiseItems[i];
          if (!it.name?.trim()) { flash(`Item ${i + 1}: Name is required`, true); setSaving(false); return; }
          if (it.price <= 0) { flash(`Item ${i + 1}: Price must be greater than 0`, true); setSaving(false); return; }
          if (it.stockQuantity < 0) { flash(`Item ${i + 1}: Stock cannot be negative`, true); setSaving(false); return; }
        }
      }
      await eventAPI.updateEvent(id, payload);
      await load();
      setEditing(false);
      flash('Event updated successfully');
    } catch (e) {
      flash(e.response?.data?.message || 'Update failed', true);
    } finally {
      setSaving(false);
    }
  };

  const doStatusChange = async (action) => {
    setSaving(true);
    try {
      if (action === 'publish') await eventAPI.publishEvent(id);
      if (action === 'close') await eventAPI.closeEvent(id);
      if (action === 'complete') await eventAPI.completeEvent(id);
      await load();
      const labels = { publish: 'Event published — registrations are now open!', close: 'Registrations closed', complete: 'Event marked as completed' };
      flash(labels[action] || `Event ${action}ed successfully`);
    } catch (e) {
      flash(e.response?.data?.message || `Failed to ${action} event`, true);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!window.confirm('Delete this draft event? This cannot be undone.')) return;
    try {
      await eventAPI.deleteEvent(id);
      navigate('/dashboard');
    } catch (e) {
      flash(e.response?.data?.message || 'Delete failed', true);
    }
  };

  if (loading) return <div style={{ padding: 60, textAlign: 'center', color: '#999' }}>Loading…</div>;
  if (!event) return <div style={{ padding: 60, textAlign: 'center', color: '#b91c1c' }}>{error}</div>;

  const canEdit = ['Draft', 'Published'].includes(event.status);
  const isDraft = event.status === 'Draft';

  return (
    <div className="page" style={{ paddingTop: 32, maxWidth: 820, margin: '0 auto' }}>

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 28, flexWrap: 'wrap' }}>
        <button className="btn btn-ghost" onClick={() => navigate('/dashboard')} style={{ padding: '8px 14px' }}>← Back</button>
        <div style={{ flex: 1 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
            <h1 style={{ fontSize: '1.5rem', fontWeight: 800 }}>{event.eventName}</h1>
            <span style={{
              background: '#f7f7f7', color: STATUS_COLOR[event.status],
              border: '1px solid #e0e0e0',
              borderRadius: 99, padding: '3px 12px', fontSize: '0.8rem', fontWeight: 600,
            }}>{event.status}</span>
          </div>
          <p className="text-secondary" style={{ marginTop: 4, fontSize: '0.85rem' }}>
            {event.eventType} event &nbsp;·&nbsp; {event.eligibility}
          </p>
        </div>
        {canEdit && !editing && (
          <button className="btn btn-ghost" onClick={() => setEditing(true)}>Edit Details</button>
        )}
      </div>

      {success && <div className="alert alert-success mb-16">{success}</div>}
      {error && <div className="alert alert-error   mb-16">{error}</div>}

      {/* Status actions */}
      <div className="card mb-24" style={{ display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'center' }}>
        <span style={{ fontSize: '0.85rem', color: '#555', marginRight: 4 }}>Actions:</span>
        {isDraft && (
          <>
            <button className="btn btn-primary" style={{ padding: '8px 18px' }}
              onClick={() => doStatusChange('publish')} disabled={saving}>Publish</button>
            <button className="btn btn-ghost" style={{ padding: '8px 18px', color: '#991b1b', borderColor: '#991b1b' }}
              onClick={handleDelete} disabled={saving}>Delete Draft</button>
          </>
        )}
        {event.status === 'Published' && (
          <button className="btn btn-ghost" onClick={() => doStatusChange('close')} disabled={saving}>Close Registrations</button>
        )}
        {event.status === 'Ongoing' && (
          <>
            <button className="btn btn-ghost" onClick={() => doStatusChange('close')} disabled={saving}>Close Registrations</button>
            <button className="btn btn-ghost" onClick={() => doStatusChange('complete')} disabled={saving}>Mark Completed</button>
          </>
        )}
        {event.status === 'Closed' && (
          <button className="btn btn-ghost" onClick={() => doStatusChange('complete')} disabled={saving}>Mark Completed</button>
        )}
        {event.status === 'Completed' && (
          <span style={{ color: '#1a7a3f', fontSize: '0.88rem' }}>✓ Event completed</span>
        )}

        {/* Attendance scanner — available for Published / Ongoing / Closed / Completed events */}
        {['Published', 'Ongoing', 'Closed', 'Completed'].includes(event.status) && (
          <button className="btn btn-primary" style={{ padding: '8px 18px', marginLeft: 'auto', background: '#7c3aed' }}
            onClick={() => navigate(`/organizer/events/${id}/attendance`)}>
            📋 Attendance
          </button>
        )}
      </div>

      {/* View / Edit */}
      {!editing ? (
        <>
          {/* Overview */}
          <div className="card card-lg mb-24">
            <h2 style={{ fontSize: '1rem', fontWeight: 700, marginBottom: 20 }}>Overview</h2>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: 16 }}>
              {[
                ['Start Date', new Date(event.startDate).toLocaleString()],
                ['End Date', new Date(event.endDate).toLocaleString()],
                ['Reg. Deadline', new Date(event.registrationDeadline).toLocaleString()],
                ['Location', event.location || '—'],
                ['Fee', event.eventType === 'Merchandise' ? 'Per item' : (event.registrationFee ? `₹${event.registrationFee}` : 'Free')],
                ['Limit', event.registrationLimit ? `${event.registrationCount || 0} / ${event.registrationLimit}` : 'Unlimited'],
                ['Eligibility', event.eligibility],
                ['Tags', (event.eventTags || []).join(', ') || '—'],
              ].map(([label, value]) => (
                <div key={label}>
                  <div style={{ fontSize: '0.75rem', color: '#999', marginBottom: 2 }}>{label}</div>
                  <div style={{ fontSize: '0.9rem', fontWeight: 500 }}>{value}</div>
                </div>
              ))}
            </div>
            {event.description && (
              <div style={{ marginTop: 20 }}>
                <div style={{ fontSize: '0.75rem', color: '#999', marginBottom: 6 }}>Description</div>
                <p style={{ fontSize: '0.9rem', lineHeight: 1.6 }}>{event.description}</p>
              </div>
            )}
          </div>

          {/* Analytics */}
          <div className="card mb-24">
            <h2 style={{ fontSize: '1rem', fontWeight: 700, marginBottom: 16 }}>Analytics</h2>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16 }}>
              {[
                ['Registrations', event.registrationCount || 0],
                ['Revenue', `₹${(event.totalRevenue || (event.eventType === 'Merchandise'
                  ? registrations.filter(r => r.paymentStatus === 'Paid').reduce((sum, r) => sum + (r.merchandiseOrder?.priceAtPurchase || 0) * (r.merchandiseOrder?.quantity || 1), 0)
                  : (event.registrationFee || 0) * (event.registrationCount || 0))
                ).toLocaleString()}`],
                ['Attendance', registrations.filter(r => r.attendanceMarked).length],
                ['Capacity', event.registrationLimit
                  ? `${Math.round(((event.registrationCount || 0) / event.registrationLimit) * 100)}%`
                  : 'Unlimited'],
              ].map(([label, value]) => (
                <div key={label} className="card" style={{ textAlign: 'center', padding: '16px 12px' }}>
                  <div style={{ fontSize: '1.6rem', fontWeight: 700 }}>{value}</div>
                  <div style={{ fontSize: '0.78rem', color: '#999', marginTop: 4 }}>{label}</div>
                </div>
              ))}
            </div>
          </div>

          {/* Payment Orders — Merchandise events (shown prominently after analytics) */}
          {event.eventType === 'Merchandise' && <MerchOrdersTab eventId={id} />}

          {/* Merch items */}
          {event.eventType === 'Merchandise' && event.merchandiseItems?.length > 0 && (
            <div className="card mb-24">
              <h2 style={{ fontSize: '1rem', fontWeight: 700, marginBottom: 16 }}>Merchandise Items</h2>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
                <thead>
                  <tr >
                    {['Name', 'Size', 'Color', 'Variant', 'Price', 'Stock'].map(h => (
                      <th key={h} style={{ textAlign: 'left', padding: '8px 10px', fontWeight: 600 }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {event.merchandiseItems.map((item, i) => (
                    <tr key={i} >
                      <td style={{ padding: '10px' }}>{item.name}</td>
                      <td style={{ padding: '10px' }}>{item.size || '—'}</td>
                      <td style={{ padding: '10px' }}>{item.color || '—'}</td>
                      <td style={{ padding: '10px' }}>{item.variant || '—'}</td>
                      <td style={{ padding: '10px' }}>₹{item.price}</td>
                      <td style={{ padding: '10px' }}>{item.stockQuantity}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Custom form preview */}
          {event.customForm?.fields?.length > 0 && (
            <div className="card mb-24">
              <h2 style={{ fontSize: '1rem', fontWeight: 700, marginBottom: 16 }}>
                Registration Form Fields
                {event.customForm.isLocked && (
                  <span style={{ fontSize: '0.75rem', color: '#92400e', background: '#fffbeb', border: '1px solid #92400e', borderRadius: 3, padding: '1px 7px', marginLeft: 10, fontWeight: 400 }}>Locked</span>
                )}
              </h2>
              {event.customForm.fields.map((f, i) => {
                const typeLabels = { text: 'Text', textarea: 'Long Text', email: 'Email', phone: 'Phone Number', number: 'Number', dropdown: 'Dropdown', checkbox: 'Checkbox', radio: 'Radio', file: 'File' };
                return (
                  <div key={i} style={{
                    padding: '10px 14px', borderRadius: 8, marginBottom: 8,
                    background: '#f7f7f7', border: '1px solid #e0e0e0'
                  }}>
                    <span style={{ fontWeight: 600 }}>{f.fieldLabel}</span>
                    <span style={{ color: '#999', fontSize: '0.8rem', marginLeft: 10 }}>{typeLabels[f.fieldType] || f.fieldType}</span>
                    {f.isRequired && <span style={{ color: '#b91c1c', marginLeft: 8, fontSize: '0.75rem' }}>required</span>}
                    {f.options?.length > 0 && (
                      <div style={{ color: '#999', fontSize: '0.78rem', marginTop: 4 }}>Options: {f.options.join(', ')}</div>
                    )}
                  </div>
                );
              })}
            </div>
          )}

          {/* Participants — real registration list */}
          <div className="card mb-24">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16, flexWrap: 'wrap', gap: 8 }}>
              <h2 style={{ fontSize: '1rem', fontWeight: 700 }}>Participants ({registrations.length})</h2>
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                {event.status !== 'Draft' && (
                  <>
                    <button className="btn btn-ghost" style={{ padding: '4px 12px', fontSize: '0.78rem' }}
                      onClick={loadRegistrations} disabled={regsLoading}>
                      {regsLoading ? 'Refreshing…' : '↻ Refresh'}
                    </button>
                    <button className="btn btn-ghost" style={{ padding: '4px 12px', fontSize: '0.78rem' }}
                      onClick={() => {
                        const headers = ['#', 'Name', 'Email', 'Contact', 'Type', 'College', 'Ticket ID', 'Status', 'Payment', 'Attendance', 'Registered'];
                        const rows = registrations.map((reg, i) => {
                          const p = reg.participantId;
                          return [
                            i + 1,
                            `${p?.firstName || ''} ${p?.lastName || ''}`.trim(),
                            p?.userId?.email || '',
                            p?.contactNumber || '',
                            p?.participantType || '',
                            p?.collegeName || '',
                            reg.ticketId,
                            reg.status,
                            reg.paymentStatus,
                            reg.attendanceMarked ? 'Yes' : 'No',
                            new Date(reg.createdAt).toLocaleString(),
                          ];
                        });
                        const csv = [headers, ...rows].map(r => r.map(c => `"${String(c).replace(/"/g, '""')}"`).join(',')).join('\n');
                        const blob = new Blob([csv], { type: 'text/csv' });
                        const url = URL.createObjectURL(blob);
                        const a = document.createElement('a');
                        a.href = url; a.download = `${event.eventName.replace(/[^a-zA-Z0-9]/g, '_')}_participants.csv`;
                        a.click(); URL.revokeObjectURL(url);
                      }}>
                      ⬇ Export CSV
                    </button>
                  </>
                )}
              </div>
            </div>

            {/* Search & Filters */}
            {event.status !== 'Draft' && registrations.length > 0 && (
              <div style={{ display: 'flex', gap: 10, marginBottom: 14, flexWrap: 'wrap', alignItems: 'center' }}>
                <input
                  placeholder="Search name, email, ticket…"
                  value={searchTerm}
                  onChange={e => setSearchTerm(e.target.value)}
                  style={{ flex: '1 1 200px', padding: '7px 12px', border: '1px solid #e0e0e0', borderRadius: 6, fontSize: '0.83rem' }}
                />
                <select value={filterPayment} onChange={e => setFilterPayment(e.target.value)}
                  style={{ padding: '7px 10px', border: '1px solid #e0e0e0', borderRadius: 6, fontSize: '0.83rem' }}>
                  <option value="all">All Payments</option>
                  <option value="Paid">Paid</option>
                  <option value="PendingApproval">Pending</option>
                  <option value="Rejected">Rejected</option>
                  <option value="Free">Free</option>
                </select>
                <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)}
                  style={{ padding: '7px 10px', border: '1px solid #e0e0e0', borderRadius: 6, fontSize: '0.83rem' }}>
                  <option value="all">All Status</option>
                  <option value="Active">Active</option>
                  <option value="Cancelled">Cancelled</option>
                </select>
              </div>
            )}

            {event.status === 'Draft' ? (
              <p className="text-secondary" style={{ fontSize: '0.88rem' }}>
                Publish the event to start accepting registrations.
              </p>
            ) : regsLoading && registrations.length === 0 ? (
              <p style={{ color: '#999', fontSize: '0.88rem' }}>Loading registrations…</p>
            ) : registrations.length === 0 ? (
              <p className="text-secondary" style={{ fontSize: '0.88rem' }}>
                No registrations yet.
              </p>
            ) : (() => {
              const term = searchTerm.toLowerCase();
              const filtered = registrations.filter(reg => {
                const p = reg.participantId;
                const nameMatch = !term || `${p?.firstName} ${p?.lastName}`.toLowerCase().includes(term)
                  || (p?.userId?.email || '').toLowerCase().includes(term)
                  || (reg.ticketId || '').toLowerCase().includes(term);
                const payMatch = filterPayment === 'all' || reg.paymentStatus === filterPayment;
                const statMatch = filterStatus === 'all' || reg.status === filterStatus;
                return nameMatch && payMatch && statMatch;
              });
              return (
                <div style={{ overflowX: 'auto' }}>
                  <div style={{ fontSize: '0.78rem', color: '#999', marginBottom: 8 }}>
                    Showing {filtered.length} of {registrations.length} registrations
                  </div>
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.83rem' }}>
                    <thead>
                      <tr>
                        {['#', 'Name', 'Email', 'Contact', 'Type', 'College', 'Ticket ID', 'Status', 'Payment', 'Attendance', 'Registered', ...(event.registrationFee > 0 || event.eventType === 'Merchandise' ? ['Actions'] : [])].map(h => (
                          <th key={h} style={{ textAlign: 'left', padding: '8px 10px', fontWeight: 600, borderBottom: '2px solid #e0e0e0', whiteSpace: 'nowrap' }}>{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {filtered.map((reg, i) => {
                        const p = reg.participantId;
                        const psBg = reg.paymentStatus === 'Paid' ? '#f0fdf4'
                          : reg.paymentStatus === 'PendingApproval' ? '#fffbeb'
                            : reg.paymentStatus === 'Rejected' ? '#fef2f2' : '#f7f7f7';
                        const psColor = reg.paymentStatus === 'Paid' ? '#166534'
                          : reg.paymentStatus === 'PendingApproval' ? '#92400e'
                            : reg.paymentStatus === 'Rejected' ? '#991b1b' : '#555';
                        return (
                          <tr key={reg._id} style={{ borderBottom: '1px solid #f0f0f0' }}>
                            <td style={{ padding: '10px' }}>{i + 1}</td>
                            <td style={{ padding: '10px', fontWeight: 600, whiteSpace: 'nowrap' }}>
                              {p?.firstName} {p?.lastName}
                            </td>
                            <td style={{ padding: '10px' }}>{p?.userId?.email || '—'}</td>
                            <td style={{ padding: '10px' }}>{p?.contactNumber || '—'}</td>
                            <td style={{ padding: '10px' }}>{p?.participantType || '—'}</td>
                            <td style={{ padding: '10px' }}>{p?.collegeName || '—'}</td>
                            <td style={{ padding: '10px', fontFamily: 'monospace', fontSize: '0.78rem' }}>{reg.ticketId}</td>
                            <td style={{ padding: '10px' }}>
                              <span style={{
                                background: reg.status === 'Active' ? '#f0fdf4' : '#fef2f2',
                                color: reg.status === 'Active' ? '#166534' : '#991b1b',
                                padding: '2px 8px', borderRadius: 99, fontSize: '0.75rem', fontWeight: 600,
                              }}>{reg.status}</span>
                            </td>
                            <td style={{ padding: '10px' }}>
                              <span style={{
                                background: psBg, color: psColor,
                                padding: '2px 8px', borderRadius: 99, fontSize: '0.75rem', fontWeight: 600,
                              }}>{reg.paymentStatus === 'PendingApproval' ? 'Pending' : reg.paymentStatus}</span>
                            </td>
                            <td style={{ padding: '10px' }}>
                              <span style={{
                                background: reg.attendanceMarked ? '#f0fdf4' : '#f7f7f7',
                                color: reg.attendanceMarked ? '#166534' : '#999',
                                padding: '2px 8px', borderRadius: 99, fontSize: '0.75rem', fontWeight: 600,
                              }}>{reg.attendanceMarked ? 'Present' : '—'}</span>
                            </td>
                            <td style={{ padding: '10px', whiteSpace: 'nowrap', fontSize: '0.78rem', color: '#777' }}>
                              {new Date(reg.createdAt).toLocaleString()}
                            </td>
                            {(event.registrationFee > 0 || event.eventType === 'Merchandise') && (
                              <td style={{ padding: '10px', whiteSpace: 'nowrap' }}>
                                {reg.paymentProofUrl && (
                                  <button
                                    className="btn btn-ghost"
                                    style={{ padding: '2px 8px', fontSize: '0.72rem', marginRight: 4 }}
                                    onClick={() => setProofModalUrl(reg.paymentProofUrl)}
                                  >Proof</button>
                                )}
                                {reg.paymentStatus === 'PendingApproval' && (
                                  <>
                                    <button
                                      className="btn btn-primary"
                                      style={{ padding: '3px 10px', fontSize: '0.75rem', marginRight: 4 }}
                                      disabled={actingOnPayment === reg._id}
                                      onClick={() => handlePaymentAction(reg._id, 'approve')}
                                    >{actingOnPayment === reg._id ? '…' : 'Approve'}</button>
                                    <button
                                      className="btn btn-ghost"
                                      style={{ padding: '3px 10px', fontSize: '0.75rem', color: '#991b1b', borderColor: '#991b1b' }}
                                      disabled={actingOnPayment === reg._id}
                                      onClick={() => handlePaymentAction(reg._id, 'reject')}
                                    >Reject</button>
                                  </>
                                )}
                                {reg.paymentStatus === 'Rejected' && (
                                  <button
                                    className="btn btn-primary"
                                    style={{ padding: '3px 10px', fontSize: '0.75rem' }}
                                    disabled={actingOnPayment === reg._id}
                                    onClick={() => handlePaymentAction(reg._id, 'approve')}
                                  >{actingOnPayment === reg._id ? '…' : 'Approve'}</button>
                                )}
                              </td>
                            )}
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              );
            })()}

            {paymentMsg && (
              <div className="alert alert-success" style={{ marginTop: 12, fontSize: '0.85rem' }}>{paymentMsg}</div>
            )}
          </div>

          {/* Payment proof modal */}
          {proofModalUrl && (
            <div style={{
              position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)',
              display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999,
            }} onClick={() => setProofModalUrl(null)}>
              <div style={{ background: '#fff', borderRadius: 12, padding: 20, maxWidth: 500, width: '90%' }}
                onClick={e => e.stopPropagation()}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 12 }}>
                  <strong>Payment Proof</strong>
                  <button className="btn btn-ghost" style={{ padding: '2px 8px' }} onClick={() => setProofModalUrl(null)}>✕</button>
                </div>
                <img
                  src={`${process.env.REACT_APP_API_URL?.replace('/api', '') || 'http://localhost:5000'}${proofModalUrl}`}
                  alt="Payment proof"
                  style={{ width: '100%', borderRadius: 8 }}
                />
              </div>
            </div>
          )}
        </>
      ) : (
        /* ── Edit form ── */
        <div className="card card-lg mb-24">
          <h2 style={{ fontSize: '1rem', fontWeight: 700, marginBottom: 20, color: '#111' }}>
            {isDraft ? 'Edit Event (Draft — all fields editable)' : 'Edit Event (Published — limited fields)'}
          </h2>

          {isDraft && (
            <>
              <div className="form-group">
                <label>Event Name</label>
                <input value={editForm.eventName} onChange={e => setEditForm(f => ({ ...f, eventName: e.target.value }))} />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 16 }}>
                <div className="form-group">
                  <label>Start Date</label>
                  <input type="datetime-local" value={editForm.startDate} onChange={e => setEditForm(f => ({ ...f, startDate: e.target.value }))} />
                </div>
                <div className="form-group">
                  <label>End Date</label>
                  <input type="datetime-local" value={editForm.endDate} onChange={e => setEditForm(f => ({ ...f, endDate: e.target.value }))} />
                </div>
                <div className="form-group">
                  <label>Registration Deadline</label>
                  <input type="datetime-local" value={editForm.registrationDeadline} onChange={e => setEditForm(f => ({ ...f, registrationDeadline: e.target.value }))} />
                </div>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: event.eventType === 'Merchandise' ? '1fr 1fr' : '1fr 1fr 1fr', gap: 16 }}>
                <div className="form-group">
                  <label>Location</label>
                  <input value={editForm.location} onChange={e => setEditForm(f => ({ ...f, location: e.target.value }))} />
                </div>
                {event.eventType !== 'Merchandise' && (
                  <div className="form-group">
                    <label>Fee (₹)</label>
                    <input type="number" min="0" value={editForm.registrationFee} onChange={e => setEditForm(f => ({ ...f, registrationFee: e.target.value }))} />
                  </div>
                )}
                <div className="form-group">
                  <label>Eligibility</label>
                  <select value={editForm.eligibility} onChange={e => setEditForm(f => ({ ...f, eligibility: e.target.value }))}>
                    <option value="all">All</option>
                    <option value="iiit-only">IIIT Only</option>
                    <option value="non-iiit-only">Non-IIIT Only</option>
                  </select>
                </div>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                <div className="form-group">
                  <label>Registration Limit</label>
                  <input type="number" min="1" value={editForm.registrationLimit} onChange={e => setEditForm(f => ({ ...f, registrationLimit: e.target.value }))} placeholder="Unlimited" />
                </div>
                <div className="form-group">
                  <label>Tags (comma-separated)</label>
                  <input value={editForm.eventTags} onChange={e => setEditForm(f => ({ ...f, eventTags: e.target.value }))} />
                </div>
              </div>

              {/* Merchandise Items Editor (Draft only) */}
              {event.eventType === 'Merchandise' && (
                <div style={{ marginTop: 8, marginBottom: 16 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                    <label style={{ fontWeight: 700, fontSize: '0.95rem' }}>Merchandise Items</label>
                    <button type="button" className="btn btn-ghost" style={{ padding: '4px 14px', fontSize: '0.82rem' }}
                      onClick={() => setEditForm(f => ({
                        ...f,
                        merchandiseItems: [...(f.merchandiseItems || []), { name: '', size: '', color: '', variant: '', price: 0, stockQuantity: 0 }],
                      }))}>
                      + Add Item
                    </button>
                  </div>
                  {(editForm.merchandiseItems || []).length === 0 && (
                    <p style={{ color: '#991b1b', fontSize: '0.85rem' }}>No merchandise items. Add at least one item before publishing.</p>
                  )}
                  {(editForm.merchandiseItems || []).map((item, idx) => (
                    <div key={idx} style={{ padding: '14px 16px', border: '1px solid #e0e0e0', borderRadius: 8, marginBottom: 10, background: '#f7f7f7' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                        <span style={{ fontWeight: 600, fontSize: '0.85rem' }}>Item {idx + 1}</span>
                        <button type="button" className="btn btn-ghost" style={{ padding: '2px 10px', fontSize: '0.78rem', color: '#991b1b' }}
                          onClick={() => setEditForm(f => ({ ...f, merchandiseItems: f.merchandiseItems.filter((_, i) => i !== idx) }))}>
                          Remove
                        </button>
                      </div>
                      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr 1fr', gap: 10, marginBottom: 8 }}>
                        <div className="form-group" style={{ marginBottom: 0 }}>
                          <label style={{ fontSize: '0.78rem' }}>Name *</label>
                          <input value={item.name} placeholder="e.g. Black Hoodie"
                            onChange={e => setEditForm(f => {
                              const items = [...f.merchandiseItems];
                              items[idx] = { ...items[idx], name: e.target.value };
                              return { ...f, merchandiseItems: items };
                            })} />
                        </div>
                        <div className="form-group" style={{ marginBottom: 0 }}>
                          <label style={{ fontSize: '0.78rem' }}>Size</label>
                          <input value={item.size} placeholder="e.g. L"
                            onChange={e => setEditForm(f => {
                              const items = [...f.merchandiseItems];
                              items[idx] = { ...items[idx], size: e.target.value };
                              return { ...f, merchandiseItems: items };
                            })} />
                        </div>
                        <div className="form-group" style={{ marginBottom: 0 }}>
                          <label style={{ fontSize: '0.78rem' }}>Color</label>
                          <input value={item.color} placeholder="e.g. Black"
                            onChange={e => setEditForm(f => {
                              const items = [...f.merchandiseItems];
                              items[idx] = { ...items[idx], color: e.target.value };
                              return { ...f, merchandiseItems: items };
                            })} />
                        </div>
                        <div className="form-group" style={{ marginBottom: 0 }}>
                          <label style={{ fontSize: '0.78rem' }}>Variant</label>
                          <input value={item.variant} placeholder="e.g. v1"
                            onChange={e => setEditForm(f => {
                              const items = [...f.merchandiseItems];
                              items[idx] = { ...items[idx], variant: e.target.value };
                              return { ...f, merchandiseItems: items };
                            })} />
                        </div>
                      </div>
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                        <div className="form-group" style={{ marginBottom: 0 }}>
                          <label style={{ fontSize: '0.78rem' }}>Price (₹) *</label>
                          <input type="number" min="0" value={item.price}
                            onChange={e => setEditForm(f => {
                              const items = [...f.merchandiseItems];
                              items[idx] = { ...items[idx], price: e.target.value };
                              return { ...f, merchandiseItems: items };
                            })} />
                        </div>
                        <div className="form-group" style={{ marginBottom: 0 }}>
                          <label style={{ fontSize: '0.78rem' }}>Stock Quantity *</label>
                          <input type="number" min="0" value={item.stockQuantity}
                            onChange={e => setEditForm(f => {
                              const items = [...f.merchandiseItems];
                              items[idx] = { ...items[idx], stockQuantity: e.target.value };
                              return { ...f, merchandiseItems: items };
                            })} />
                        </div>
                      </div>
                    </div>
                  ))}
                  <div className="form-group" style={{ marginTop: 8 }}>
                    <label>Purchase Limit Per Participant</label>
                    <input type="number" min="1" value={editForm.purchaseLimitPerParticipant}
                      onChange={e => setEditForm(f => ({ ...f, purchaseLimitPerParticipant: e.target.value }))} />
                  </div>
                </div>
              )}

              {/* Custom Form Builder (Normal events, Draft, not locked) */}
              {!event.customForm?.isLocked && (
                <div style={{ marginTop: 8, marginBottom: 16 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                    <label style={{ fontWeight: 700, fontSize: '0.95rem' }}>Registration Form Fields</label>
                    <button type="button" className="btn btn-ghost" style={{ padding: '4px 14px', fontSize: '0.82rem' }}
                      onClick={() => setEditForm(f => ({
                        ...f,
                        customFormFields: [...(f.customFormFields || []), { fieldLabel: '', fieldType: 'text', options: [], isRequired: false, min: null, max: null, order: (f.customFormFields || []).length }],
                      }))}>
                      + Add Field
                    </button>
                  </div>
                  {(editForm.customFormFields || []).map((field, idx) => (
                    <div key={idx} style={{ background: '#f7f7f7', borderRadius: 10, padding: 16, marginBottom: 12, border: '1px solid #e0e0e0' }}>
                      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr auto', gap: 12, alignItems: 'end' }}>
                        <div className="form-group" style={{ marginBottom: 0 }}>
                          <label style={{ fontSize: '0.78rem' }}>Label</label>
                          <input value={field.fieldLabel} placeholder="e.g. Team Name"
                            onChange={e => setEditForm(f => {
                              const fields = [...f.customFormFields];
                              fields[idx] = { ...fields[idx], fieldLabel: e.target.value };
                              return { ...f, customFormFields: fields };
                            })} />
                        </div>
                        <div className="form-group" style={{ marginBottom: 0 }}>
                          <label style={{ fontSize: '0.78rem' }}>Type</label>
                          <select value={field.fieldType}
                            onChange={e => setEditForm(f => {
                              const fields = [...f.customFormFields];
                              fields[idx] = { ...fields[idx], fieldType: e.target.value };
                              return { ...f, customFormFields: fields };
                            })}>
                            {[
                              { value: 'text', label: 'Text' },
                              { value: 'textarea', label: 'Long Text' },
                              { value: 'email', label: 'Email' },
                              { value: 'phone', label: 'Phone Number' },
                              { value: 'number', label: 'Number' },
                              { value: 'dropdown', label: 'Dropdown' },
                              { value: 'checkbox', label: 'Checkbox' },
                              { value: 'radio', label: 'Radio' },
                              { value: 'file', label: 'File' },
                            ].map(t => (
                              <option key={t.value} value={t.value}>{t.label}</option>
                            ))}
                          </select>
                        </div>
                        <div style={{ display: 'flex', gap: 6, alignItems: 'center', paddingBottom: 2 }}>
                          <button type="button" onClick={() => setEditForm(f => {
                            const fields = [...f.customFormFields];
                            if (idx === 0) return f;
                            [fields[idx], fields[idx - 1]] = [fields[idx - 1], fields[idx]];
                            return { ...f, customFormFields: fields.map((fl, i) => ({ ...fl, order: i })) };
                          })} className="btn btn-ghost" style={{ padding: '6px 10px', fontSize: '0.8rem' }} title="Move up">↑</button>
                          <button type="button" onClick={() => setEditForm(f => {
                            const fields = [...f.customFormFields];
                            if (idx >= fields.length - 1) return f;
                            [fields[idx], fields[idx + 1]] = [fields[idx + 1], fields[idx]];
                            return { ...f, customFormFields: fields.map((fl, i) => ({ ...fl, order: i })) };
                          })} className="btn btn-ghost" style={{ padding: '6px 10px', fontSize: '0.8rem' }} title="Move down">↓</button>
                          <button type="button" onClick={() => setEditForm(f => ({
                            ...f, customFormFields: f.customFormFields.filter((_, i) => i !== idx),
                          }))} className="btn btn-ghost" style={{ padding: '6px 10px', fontSize: '0.8rem', color: '#b91c1c' }}>✕</button>
                        </div>
                      </div>
                      {['dropdown', 'checkbox', 'radio'].includes(field.fieldType) && (
                        <div className="form-group" style={{ marginTop: 10, marginBottom: 0 }}>
                          <label style={{ fontSize: '0.78rem' }}>Options (comma-separated)</label>
                          <input
                            value={(field.options || []).join(', ')}
                            onChange={e => setEditForm(f => {
                              const fields = [...f.customFormFields];
                              fields[idx] = { ...fields[idx], options: e.target.value.split(',').map(o => o.trim()).filter(Boolean) };
                              return { ...f, customFormFields: fields };
                            })}
                            placeholder="Option A, Option B, Option C"
                          />
                        </div>
                      )}
                      {field.fieldType === 'number' && (
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginTop: 10 }}>
                          <div className="form-group" style={{ marginBottom: 0 }}>
                            <label style={{ fontSize: '0.78rem' }}>Min Value</label>
                            <input type="number" value={field.min ?? ''} placeholder="No minimum"
                              onChange={e => setEditForm(f => {
                                const fields = [...f.customFormFields];
                                fields[idx] = { ...fields[idx], min: e.target.value === '' ? null : Number(e.target.value) };
                                return { ...f, customFormFields: fields };
                              })} />
                          </div>
                          <div className="form-group" style={{ marginBottom: 0 }}>
                            <label style={{ fontSize: '0.78rem' }}>Max Value</label>
                            <input type="number" value={field.max ?? ''} placeholder="No maximum"
                              onChange={e => setEditForm(f => {
                                const fields = [...f.customFormFields];
                                fields[idx] = { ...fields[idx], max: e.target.value === '' ? null : Number(e.target.value) };
                                return { ...f, customFormFields: fields };
                              })} />
                          </div>
                        </div>
                      )}
                      <label style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 10, fontSize: '0.82rem', cursor: 'pointer' }}>
                        <input type="checkbox" checked={field.isRequired}
                          onChange={e => setEditForm(f => {
                            const fields = [...f.customFormFields];
                            fields[idx] = { ...fields[idx], isRequired: e.target.checked };
                            return { ...f, customFormFields: fields };
                          })} />
                        Required field
                      </label>
                    </div>
                  ))}
                </div>
              )}
              {event.customForm?.isLocked && (
                <div style={{ background: '#fffbeb', border: '1px solid #92400e', borderRadius: 8, padding: '12px 16px', marginTop: 8, marginBottom: 16, fontSize: '0.85rem', color: '#92400e' }}>
                  🔒 Registration form is locked — it cannot be edited after the first registration was received.
                </div>
              )}
            </>
          )}

          {/* Description always editable */}
          <div className="form-group">
            <label>Description</label>
            <textarea value={editForm.description} onChange={e => setEditForm(f => ({ ...f, description: e.target.value }))} rows={4} />
          </div>

          {/* Published-only: extend deadline / increase limit */}
          {!isDraft && (
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
              <div className="form-group">
                <label>Extend Deadline (can only move forward)</label>
                <input type="datetime-local" value={editForm.registrationDeadline}
                  onChange={e => setEditForm(f => ({ ...f, registrationDeadline: e.target.value }))} />
              </div>
              <div className="form-group">
                <label>Increase Registration Limit (can only increase)</label>
                <input type="number" min={event.registrationLimit || 1} value={editForm.registrationLimit}
                  onChange={e => setEditForm(f => ({ ...f, registrationLimit: e.target.value }))} />
              </div>
            </div>
          )}

          <div style={{ display: 'flex', gap: 12, marginTop: 8 }}>
            <button className="btn btn-primary" onClick={handleSave} disabled={saving}>
              {saving ? 'Saving…' : 'Save Changes'}
            </button>
            <button className="btn btn-ghost" onClick={() => setEditing(false)} disabled={saving}>Cancel</button>
          </div>
        </div>
      )}

      {/* Discussion Forum — available for non-Draft events */}
      {!isDraft && (
        <div className="mb-24" style={{ marginTop: 32 }}>
          <DiscussionForum eventId={id} />
        </div>
      )}
    </div>
  );
};

// ── Merchandise Orders Sub-component ──────────────────────────────────────────
const PAYMENT_STATUS_STYLE = {
  PendingApproval: { bg: '#fffbeb', color: '#92400e', label: 'Pending' },
  Paid: { bg: '#f0fdf4', color: '#166534', label: 'Approved' },
  Rejected: { bg: '#fef2f2', color: '#991b1b', label: 'Rejected' },
  Free: { bg: '#f7f7f7', color: '#555', label: 'Free' },
};

const MerchOrdersTab = ({ eventId }) => {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [acting, setActing] = useState(null);
  const [msg, setMsg] = useState('');
  const [filter, setFilter] = useState('all');
  const [proofModal, setProofModal] = useState(null);

  const load = async () => {
    try {
      const res = await registrationAPI.getOrdersForEvent(eventId);
      setOrders(res.data);
    } catch { setMsg('Failed to load orders'); }
    setLoading(false);
  };

  useEffect(() => { load(); }, [eventId]);

  const handleAction = async (orderId, action) => {
    setActing(orderId);
    try {
      if (action === 'approve') await registrationAPI.approvePayment(orderId);
      else await registrationAPI.rejectPayment(orderId);
      await load();
      setMsg(`Order ${action}d successfully`);
      setTimeout(() => setMsg(''), 3000);
    } catch (err) {
      setMsg(err.response?.data?.message || 'Action failed');
    }
    setActing(null);
  };

  const filtered = filter === 'all' ? orders : orders.filter(o => o.paymentStatus === filter);

  return (
    <div className="card mb-24" style={{ border: '2px solid #111' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16, flexWrap: 'wrap', gap: 8 }}>
        <h2 style={{ fontSize: '1.1rem', fontWeight: 800 }}>📋 Payment Orders</h2>
        <div style={{ display: 'flex', gap: 6 }}>
          {['all', 'PendingApproval', 'Paid', 'Rejected'].map(f => (
            <button key={f} className={`btn btn-ghost`}
              style={{
                padding: '4px 12px', fontSize: '0.78rem', fontWeight: 600,
                background: filter === f ? '#111' : '#f7f7f7',
                color: filter === f ? '#fff' : '#333',
                borderRadius: 99,
              }}
              onClick={() => setFilter(f)}>
              {f === 'all' ? 'All' : f === 'PendingApproval' ? 'Pending' : f}
            </button>
          ))}
        </div>
      </div>

      {msg && <div className="alert alert-success mb-16">{msg}</div>}

      {loading ? (
        <p style={{ color: '#999' }}>Loading orders…</p>
      ) : filtered.length === 0 ? (
        <p className="text-secondary" style={{ fontSize: '0.88rem' }}>No orders found.</p>
      ) : (
        <div style={{ display: 'grid', gap: 12 }}>
          {filtered.map(order => {
            const ps = PAYMENT_STATUS_STYLE[order.paymentStatus] || PAYMENT_STATUS_STYLE.Free;
            const participant = order.participantId;
            return (
              <div key={order._id} style={{
                padding: '16px 18px', border: '1px solid #e0e0e0', borderRadius: 8, background: '#fff',
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 12 }}>
                  <div>
                    <div style={{ fontWeight: 700, fontSize: '0.95rem' }}>
                      {participant?.firstName} {participant?.lastName}
                    </div>
                    <div style={{ fontSize: '0.82rem', color: '#777', marginTop: 2 }}>
                      {order.merchandiseOrder?.itemName} &nbsp;·&nbsp;
                      Qty: {order.merchandiseOrder?.quantity} &nbsp;·&nbsp;
                      ₹{(order.merchandiseOrder?.priceAtPurchase || 0) * (order.merchandiseOrder?.quantity || 1)}
                    </div>
                    {order.merchandiseOrder && (
                      <div style={{ fontSize: '0.78rem', color: '#999', marginTop: 2 }}>
                        {[order.merchandiseOrder.size, order.merchandiseOrder.color, order.merchandiseOrder.variant].filter(Boolean).join(' · ')}
                      </div>
                    )}
                    <div style={{ fontSize: '0.78rem', color: '#999', marginTop: 4 }}>
                      Ticket: {order.ticketId} &nbsp;·&nbsp; {new Date(order.createdAt).toLocaleString()}
                    </div>
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 8 }}>
                    <span style={{
                      background: ps.bg, color: ps.color,
                      padding: '3px 12px', borderRadius: 99, fontSize: '0.78rem', fontWeight: 600,
                      border: `1px solid ${ps.color}30`,
                    }}>{ps.label}</span>

                    {order.paymentProofUrl && (
                      <button className="btn btn-ghost" style={{ padding: '4px 10px', fontSize: '0.78rem' }}
                        onClick={() => setProofModal(order.paymentProofUrl)}>
                        View Proof
                      </button>
                    )}

                    {order.paymentStatus === 'PendingApproval' && (
                      <div style={{ display: 'flex', gap: 6 }}>
                        <button className="btn btn-primary" style={{ padding: '5px 14px', fontSize: '0.8rem' }}
                          disabled={acting === order._id}
                          onClick={() => handleAction(order._id, 'approve')}>
                          {acting === order._id ? '…' : 'Approve'}
                        </button>
                        <button className="btn btn-ghost" style={{
                          padding: '5px 14px', fontSize: '0.8rem',
                          color: '#991b1b', borderColor: '#991b1b',
                        }}
                          disabled={acting === order._id}
                          onClick={() => handleAction(order._id, 'reject')}>
                          Reject
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Proof image modal */}
      {proofModal && (
        <div style={{
          position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999,
        }} onClick={() => setProofModal(null)}>
          <div style={{ background: '#fff', borderRadius: 12, padding: 20, maxWidth: 500, width: '90%' }}
            onClick={e => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 12 }}>
              <strong>Payment Proof</strong>
              <button className="btn btn-ghost" style={{ padding: '2px 8px' }} onClick={() => setProofModal(null)}>✕</button>
            </div>
            <img
              src={`${process.env.REACT_APP_API_URL?.replace('/api', '') || 'http://localhost:5000'}${proofModal}`}
              alt="Payment proof"
              style={{ width: '100%', borderRadius: 8 }}
            />
          </div>
        </div>
      )}
    </div>
  );
};

export default OrganizerEventDetail;
