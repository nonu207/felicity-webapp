import React, { useState, useEffect } from 'react';
import { adminAPI } from '../services/api';

const AdminDashboardView = () => {
    const [organizers, setOrganizers] = useState([]);
    const [orphanedUsers, setOrphanedUsers] = useState([]);
    const [participants, setParticipants] = useState([]);
    const [resetRequests, setResetRequests] = useState([]);
    const [generatedPassword, setGeneratedPassword] = useState(null); // { organizerName, loginEmail, newPassword }
    const [loading, setLoading] = useState(false);
    const [message, setMessage] = useState('');
    const [showCreateOrg, setShowCreateOrg] = useState(false);
    const [orgForm, setOrgForm] = useState({
        organizerName: '', organizerDescription: '',
        organizerCategory: '', contactEmail: ''
    });
    const [creating, setCreating] = useState(false);

    useEffect(() => { loadAdminData(); }, []);

    const loadAdminData = async () => {
        setLoading(true);
        try {
            const [orgData, partData, resetData] = await Promise.all([
                adminAPI.getAllOrganizers(),
                adminAPI.getAllParticipants(),
                adminAPI.getPendingPasswordResets(),
            ]);
            setOrganizers(orgData.data || []);
            setOrphanedUsers(orgData.orphanedUsers || []);
            setParticipants(partData.data || []);
            setResetRequests(resetData.data || []);
        } catch { setMessage('Error loading data'); }
        setLoading(false);
    };

    const flash = (msg) => { setMessage(msg); setTimeout(() => setMessage(''), 3000); };

    const handleApprove = async (id, approve) => {
        try { await adminAPI.approveOrganizer(id, approve); flash(`Organizer ${approve ? 'approved' : 'deactivated'}`); loadAdminData(); }
        catch { flash('Error processing request'); }
    };

    const handleDelete = async (userId) => {
        if (!window.confirm('Delete this user permanently?')) return;
        try { await adminAPI.deleteUser(userId); flash('User deleted'); loadAdminData(); }
        catch { flash('Error deleting user'); }
    };

    const handleToggleActive = async (userId, currentlyActive) => {
        const action = currentlyActive ? 'deactivate' : 'activate';
        if (!window.confirm(`Are you sure you want to ${action} this user?`)) return;
        try { await adminAPI.toggleUserActive(userId); flash(`User ${action}d successfully`); loadAdminData(); }
        catch { flash(`Error ${action.slice(0, -1)}ing user`); }
    };

    const handleApproveReset = async (userId) => {
        const comment = window.prompt('Add a comment for the organizer (optional):');
        if (comment === null) return; // cancelled
        try {
            const res = await adminAPI.approvePasswordReset(userId, comment || undefined);
            setGeneratedPassword(res.data);
            loadAdminData();
        }
        catch (err) { flash(err.response?.data?.message || 'Error approving request'); }
    };

    const handleRejectReset = async (userId) => {
        const comment = window.prompt('Reason for rejection (optional):');
        if (comment === null) return; // cancelled
        try { await adminAPI.rejectPasswordReset(userId, comment); flash('Password reset request rejected.'); loadAdminData(); }
        catch (err) { flash(err.response?.data?.message || 'Error rejecting request'); }
    };

    const handleCreateOrg = async (e) => {
        e.preventDefault();
        setCreating(true);
        try {
            const res = await adminAPI.createOrganizer(orgForm);
            flash(res.message || 'Organizer created! Credentials emailed to the contact address.');
            setShowCreateOrg(false);
            setOrgForm({ organizerName: '', organizerDescription: '', organizerCategory: '', contactEmail: '' });
            loadAdminData();
        } catch (err) { flash(err.response?.data?.message || 'Failed to create organizer'); }
        setCreating(false);
    };

    return (
        <div className="page" style={{ paddingTop: 32 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24, flexWrap: 'wrap', gap: 12 }}>
                <div>
                    <h1 className="page-title">Admin Dashboard</h1>
                    <p className="text-secondary">Manage organizers and participants</p>
                </div>
                <div style={{ display: 'flex', gap: 8 }}>
                    <button className="btn btn-ghost" onClick={loadAdminData} title="Refresh data">
                        🔄 Refresh
                    </button>
                    <button className="btn btn-primary" onClick={() => setShowCreateOrg(!showCreateOrg)}>
                        {showCreateOrg ? 'Cancel' : '+ New Organizer'}
                    </button>
                </div>
            </div>

            {message && <div className="alert alert-success mb-16">{message}</div>}

            {/* Generated Password Modal */}
            {generatedPassword && (
                <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
                    <div style={{ background: '#fff', borderRadius: 8, padding: 32, maxWidth: 440, width: '90%', border: '1px solid #e0e0e0' }}>
                        <h3 style={{ fontSize: 18, fontWeight: 700, marginBottom: 16, color: '#111' }}>Password Reset Complete</h3>
                        <p style={{ fontSize: 14, color: '#555', marginBottom: 16 }}>Share these credentials with the organizer:</p>
                        <div style={{ background: '#f7f7f7', border: '1px solid #e0e0e0', borderRadius: 4, padding: 16, marginBottom: 16 }}>
                            <div style={{ marginBottom: 8 }}><span style={{ fontWeight: 600, color: '#111' }}>Club: </span>{generatedPassword.organizerName}</div>
                            <div style={{ marginBottom: 8 }}><span style={{ fontWeight: 600, color: '#111' }}>Login Email: </span><span style={{ fontFamily: 'monospace' }}>{generatedPassword.loginEmail}</span></div>
                            <div><span style={{ fontWeight: 600, color: '#111' }}>New Password: </span><span style={{ fontFamily: 'monospace', fontSize: 16, fontWeight: 700 }}>{generatedPassword.newPassword}</span></div>
                        </div>
                        <p style={{ fontSize: 12, color: '#999', marginBottom: 16 }}>This password will not be shown again. Make sure to share it securely.</p>
                        <button className="btn btn-primary" onClick={() => setGeneratedPassword(null)} style={{ width: '100%' }}>Done</button>
                    </div>
                </div>
            )}

            {/* Create Organizer Form */}
            {showCreateOrg && (
                <div className="card mb-24">
                    <h2 className="section-title">Create Organizer Account</h2>
                    <form onSubmit={handleCreateOrg}>
                        <div className="grid-2">
                            <div className="form-group"><label>Club Name</label><input value={orgForm.organizerName} required onChange={e => setOrgForm({ ...orgForm, organizerName: e.target.value })} placeholder="e.g. Felicity Tech Team" /></div>
                            <div className="form-group"><label>Category</label><input value={orgForm.organizerCategory} required onChange={e => setOrgForm({ ...orgForm, organizerCategory: e.target.value })} placeholder="e.g. Technical" /></div>
                            <div className="form-group"><label>Contact Email <span style={{ fontSize: '0.78rem', color: '#999', fontWeight: 400 }}>(login credentials will be sent here)</span></label><input type="email" value={orgForm.contactEmail} required onChange={e => setOrgForm({ ...orgForm, contactEmail: e.target.value })} placeholder="contact@club.com" /></div>
                        </div>
                        <div className="form-group"><label>Description</label><textarea value={orgForm.organizerDescription} required onChange={e => setOrgForm({ ...orgForm, organizerDescription: e.target.value })} placeholder="Describe the club…" /></div>
                        <button type="submit" className="btn btn-primary" disabled={creating}>{creating ? 'Creating…' : 'Create Organizer'}</button>
                    </form>
                </div>
            )}

            {loading ? <div className="spinner" /> : (
                <>
                    {/* Pending Password Reset Requests */}
                    {resetRequests.length > 0 && (
                        <div className="card mb-24" style={{ borderColor: '#e0e0e0' }}>
                            <h2 className="section-title">Pending Password Reset Requests ({resetRequests.length})</h2>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                                {resetRequests.map(req => (
                                    <div key={req.userId} style={{ padding: '16px', background: '#f7f7f7', borderRadius: 4, border: '1px solid #e0e0e0' }}>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 12 }}>
                                            <div style={{ flex: 1, minWidth: 200 }}>
                                                <div style={{ fontWeight: 600, color: '#111', fontSize: 15 }}>{req.organizer?.organizerName || 'Unknown'}</div>
                                                <div style={{ fontSize: '0.83rem', color: '#555', marginTop: 2 }}>{req.email} · {req.organizer?.organizerCategory}</div>
                                                <div style={{ fontSize: '0.78rem', color: '#999', marginTop: 4 }}>Requested: {req.requestedAt ? new Date(req.requestedAt).toLocaleString() : '—'}</div>
                                                {req.reason && (
                                                    <div style={{ marginTop: 8, padding: '8px 12px', background: '#fff', border: '1px solid #e0e0e0', borderRadius: 4, fontSize: 13, color: '#333' }}>
                                                        <span style={{ fontWeight: 600 }}>Reason:</span> {req.reason}
                                                    </div>
                                                )}
                                            </div>
                                            <div style={{ display: 'flex', gap: 8, alignItems: 'flex-start' }}>
                                                <button className="btn btn-sm btn-primary" onClick={() => handleApproveReset(req.userId)}>
                                                    Approve &amp; Reset
                                                </button>
                                                <button className="btn btn-sm btn-ghost" style={{ color: '#b91c1c', borderColor: '#b91c1c' }} onClick={() => handleRejectReset(req.userId)}>
                                                    Reject
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Orphaned Organizer Users Warning */}
                    {orphanedUsers.length > 0 && (
                        <div className="card mb-24" style={{ borderColor: '#f59e0b', background: '#fffbeb' }}>
                            <h2 className="section-title" style={{ color: '#b45309' }}>
                                ⚠️ Incomplete Organizer Accounts ({orphanedUsers.length})
                            </h2>
                            <p style={{ fontSize: '0.85rem', color: '#92400e', marginBottom: 12 }}>
                                These users have role "organizer" but no organizer profile was created. They won't appear as clubs. Delete them and re-create via "+ New Organizer".
                            </p>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                                {orphanedUsers.map(u => (
                                    <div key={u._id} style={{
                                        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                                        padding: '10px 14px', background: '#fff', borderRadius: 4, border: '1px solid #fde68a'
                                    }}>
                                        <div>
                                            <span style={{ fontWeight: 600, color: '#111' }}>{u.email}</span>
                                            <span className="text-muted" style={{ marginLeft: 8, fontSize: '0.78rem' }}>
                                                Created: {new Date(u.createdAt).toLocaleDateString()}
                                            </span>
                                        </div>
                                        <button className="btn btn-danger btn-sm" onClick={() => handleDelete(u._id)}>
                                            Delete
                                        </button>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Organizers Table */}
                    <div className="card mb-24">
                        <h2 className="section-title">Organizers ({organizers.length})</h2>
                        <div style={{ overflowX: 'auto' }}>
                            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                                <thead>
                                    <tr style={{ borderBottom: '1px solid #e0e0e0' }}>
                                        {['Name', 'Email', 'Category', 'Status', 'Actions'].map(h => (
                                            <th key={h} style={{ padding: '10px 12px', textAlign: 'left', fontSize: '0.78rem', color: '#999', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>{h}</th>
                                        ))}
                                    </tr>
                                </thead>
                                <tbody>
                                    {organizers.map(org => (
                                        <tr key={org._id} style={{ borderBottom: '1px solid #e8e8e8' }}>
                                            <td style={{ padding: '12px' }}>{org.organizerName}</td>
                                            <td style={{ padding: '12px', color: '#555', fontSize: '0.88rem' }}>{org.contactEmail}</td>
                                            <td style={{ padding: '12px' }}><span className="badge badge-purple">{org.organizerCategory}</span></td>
                                            <td style={{ padding: '12px' }}>
                                                <span className={`badge ${org.userId?.isActive ? 'badge-green' : 'badge-red'}`}>
                                                    {org.userId?.isActive ? 'Active' : 'Inactive'}
                                                </span>
                                            </td>
                                            <td style={{ padding: '12px' }}>
                                                <div style={{ display: 'flex', gap: 8 }}>
                                                    {!org.userId?.isActive
                                                        ? <button className="btn btn-success btn-sm" onClick={() => handleApprove(org._id, true)}>Approve</button>
                                                        : <button className="btn btn-danger btn-sm" onClick={() => handleApprove(org._id, false)}>Deactivate</button>
                                                    }
                                                    <button className="btn btn-danger btn-sm" onClick={() => handleDelete(org.userId?._id)}>Delete</button>
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                    {organizers.length === 0 && <tr><td colSpan={5} style={{ padding: '24px', textAlign: 'center', color: '#999' }}>No organizers yet</td></tr>}
                                </tbody>
                            </table>
                        </div>
                    </div>

                    {/* Participants Table */}
                    <div className="card">
                        <h2 className="section-title">Participants ({participants.length})</h2>
                        <div style={{ overflowX: 'auto' }}>
                            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                                <thead>
                                    <tr style={{ borderBottom: '1px solid #e0e0e0' }}>
                                        {['Name', 'Email', 'College', 'Type', 'Status'].map(h => (
                                            <th key={h} style={{ padding: '10px 12px', textAlign: 'left', fontSize: '0.78rem', color: '#999', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>{h}</th>
                                        ))}
                                    </tr>
                                </thead>
                                <tbody>
                                    {participants.map(p => (
                                        <tr key={p._id} style={{ borderBottom: '1px solid #e8e8e8' }}>
                                            <td style={{ padding: '12px', fontWeight: 500 }}>{p.firstName} {p.lastName}</td>
                                            <td style={{ padding: '12px', color: '#555', fontSize: '0.88rem' }}>{p.userId?.email}</td>
                                            <td style={{ padding: '12px', fontSize: '0.9rem' }}>{p.collegeName}</td>
                                            <td style={{ padding: '12px' }}><span className={`badge ${p.participantType === 'IIIT' ? 'badge-purple' : 'badge-gray'}`}>{p.participantType}</span></td>
                                            <td style={{ padding: '12px' }}>
                                                <span className={`badge ${p.userId?.isActive ? 'badge-green' : 'badge-red'}`}>
                                                    {p.userId?.isActive ? 'Active' : 'Inactive'}
                                                </span>
                                            </td>
                                        </tr>
                                    ))}
                                    {participants.length === 0 && <tr><td colSpan={5} style={{ padding: '24px', textAlign: 'center', color: '#999' }}>No participants yet</td></tr>}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </>
            )}
        </div>
    );
};

export default AdminDashboardView;
