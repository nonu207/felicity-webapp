import React, { useState, useEffect } from 'react';
import { participantAPI, authAPI } from '../services/api';
import { useAuth } from '../context/AuthContext';

const Profile = () => {
    const { user } = useAuth();
    const [profile, setProfile] = useState(null);
    const [form, setForm] = useState({});
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [message, setMessage] = useState({ text: '', type: '' });
    const [pwForm, setPwForm] = useState({ currentPassword: '', newPassword: '' });
    const [pwMsg, setPwMsg] = useState({ text: '', type: '' });
    const [changingPw, setChangingPw] = useState(false);

    const INTERESTS = ['Music', 'Dance', 'Drama', 'Art', 'Photography', 'Technology', 'Coding', 'Robotics', 'Science', 'Sports', 'Fitness', 'Gaming', 'Literature', 'Debate', 'Film'];

    useEffect(() => { fetchProfile(); }, []);

    const fetchProfile = async () => {
        try {
            const res = await participantAPI.getProfile();
            setProfile(res.data);
            setForm({
                firstName: res.data.firstName || '',
                lastName: res.data.lastName || '',
                contactNumber: res.data.contactNumber || '',
                collegeName: res.data.collegeName || '',
                interests: res.data.interests || [],
            });
        } catch { }
        setLoading(false);
    };

    const handleSave = async (e) => {
        e.preventDefault();
        setSaving(true);
        try {
            await participantAPI.updateProfile(form);
            setMessage({ text: 'Profile updated!', type: 'success' });
            fetchProfile();
        } catch {
            setMessage({ text: 'Failed to update profile', type: 'error' });
        }
        setSaving(false);
        setTimeout(() => setMessage({ text: '', type: '' }), 3000);
    };

    const toggleInterest = (i) => {
        setForm(f => ({
            ...f,
            interests: f.interests.includes(i) ? f.interests.filter(x => x !== i) : [...f.interests, i]
        }));
    };

    const handlePwChange = async (e) => {
        e.preventDefault();
        setChangingPw(true);
        try {
            await authAPI.changePassword(pwForm);
            setPwMsg({ text: 'Password changed!', type: 'success' });
            setPwForm({ currentPassword: '', newPassword: '' });
        } catch (err) {
            setPwMsg({ text: err.response?.data?.message || 'Failed', type: 'error' });
        }
        setChangingPw(false);
        setTimeout(() => setPwMsg({ text: '', type: '' }), 3000);
    };

    if (loading) return <div className="spinner" />;

    return (
        <div className="page" style={{ maxWidth: 700, paddingTop: 32 }}>
            <h1 className="page-title">My Profile</h1>
            <p className="text-secondary mb-24">Manage your account information and preferences</p>

            {message.text && <div className={`alert alert-${message.type} mb-16`}>{message.text}</div>}

            <div className="card mb-24">
                <h2 className="section-title">Account Info</h2>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 16 }}>
                    <div>
                        <p className="text-muted">Email</p>
                        <p style={{ fontWeight: 500 }}>{user?.email}</p>
                    </div>
                    <div>
                        <p className="text-muted">Participant Type</p>
                        <span className={`badge ${profile?.participantType === 'IIIT' ? 'badge-purple' : 'badge-pink'}`}>
                            {profile?.participantType}
                        </span>
                    </div>
                </div>

                <form onSubmit={handleSave}>
                    <div className="grid-2">
                        <div className="form-group">
                            <label>First Name</label>
                            <input value={form.firstName} onChange={e => setForm({ ...form, firstName: e.target.value })} required />
                        </div>
                        <div className="form-group">
                            <label>Last Name</label>
                            <input value={form.lastName} onChange={e => setForm({ ...form, lastName: e.target.value })} required />
                        </div>
                    </div>
                    <div className="grid-2">
                        <div className="form-group">
                            <label>Contact Number</label>
                            <input value={form.contactNumber} onChange={e => setForm({ ...form, contactNumber: e.target.value })} />
                        </div>
                        <div className="form-group">
                            <label>College / Org Name</label>
                            <input value={form.collegeName} onChange={e => setForm({ ...form, collegeName: e.target.value })} />
                        </div>
                    </div>

                    <div className="form-group">
                        <label>Interests</label>
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginTop: 4 }}>
                            {INTERESTS.map(i => (
                                <button key={i} type="button" onClick={() => toggleInterest(i)}
                                    style={{
                                        padding: '6px 14px', borderRadius: 99, font: '500 0.83rem Inter, sans-serif',
                                        border: form.interests.includes(i) ? '1.5px solid #111' : '1.5px solid #e0e0e0',
                                        background: form.interests.includes(i) ? '#111' : '#f7f7f7',
                                        color: form.interests.includes(i) ? '#fff' : '#555',
                                        cursor: 'pointer', transition: 'all 0.18s'
                                    }}>{i}</button>
                            ))}
                        </div>
                    </div>

                    <button type="submit" className="btn btn-primary" disabled={saving}>
                        {saving ? 'Saving…' : 'Save Changes'}
                    </button>
                </form>
            </div>

            {/* Change Password */}
            <div className="card">
                <h2 className="section-title">Change Password</h2>
                {pwMsg.text && <div className={`alert alert-${pwMsg.type} mb-16`}>{pwMsg.text}</div>}
                <form onSubmit={handlePwChange}>
                    <div className="form-group">
                        <label>Current Password</label>
                        <input type="password" value={pwForm.currentPassword}
                            onChange={e => setPwForm({ ...pwForm, currentPassword: e.target.value })} required />
                    </div>
                    <div className="form-group">
                        <label>New Password</label>
                        <input type="password" value={pwForm.newPassword} minLength={6}
                            onChange={e => setPwForm({ ...pwForm, newPassword: e.target.value })} required />
                    </div>
                    <button type="submit" className="btn btn-ghost" disabled={changingPw}>
                        {changingPw ? 'Updating…' : 'Update Password'}
                    </button>
                </form>
            </div>
        </div>
    );
};

export default Profile;
