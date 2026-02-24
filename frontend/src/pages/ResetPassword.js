import React, { useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { authAPI } from '../services/api';

const ResetPassword = () => {
    const { token } = useParams();
    const navigate = useNavigate();
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirm] = useState('');
    const [loading, setLoading] = useState(false);
    const [done, setDone] = useState(false);
    const [error, setError] = useState('');

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');

        if (newPassword.length < 6) {
            return setError('Password must be at least 6 characters.');
        }
        if (newPassword !== confirmPassword) {
            return setError('Passwords do not match.');
        }

        setLoading(true);
        try {
            await authAPI.resetPassword(token, { newPassword });
            setDone(true);
            setTimeout(() => navigate('/login'), 3000);
        } catch (err) {
            setError(err.response?.data?.message || 'Reset link is invalid or has expired.');
        }
        setLoading(false);
    };

    return (
        <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
            <div style={{ width: '100%', maxWidth: 420 }}>
                <div style={{ textAlign: 'center', marginBottom: 32 }}>
                    <div style={{ fontSize: '2.8rem', marginBottom: 8 }}>🔒</div>
                    <h1 className="page-title" style={{ fontSize: '1.8rem' }}>Set New Password</h1>
                    <p className="text-secondary">Choose a strong new password for your account</p>
                </div>

                <div className="card card-lg">
                    {done ? (
                        <div style={{ textAlign: 'center' }}>
                            <div style={{ fontSize: '3rem', marginBottom: 16 }}>✅</div>
                            <div className="alert alert-success mb-16">
                                Password updated successfully!
                            </div>
                            <p className="text-secondary" style={{ fontSize: '0.88rem' }}>
                                Redirecting you to login in a moment…
                            </p>
                        </div>
                    ) : (
                        <>
                            {error && <div className="alert alert-error mb-16">{error}</div>}
                            <form onSubmit={handleSubmit}>
                                <div className="form-group">
                                    <label>New Password</label>
                                    <input
                                        type="password"
                                        value={newPassword}
                                        onChange={e => setNewPassword(e.target.value)}
                                        required
                                        minLength={6}
                                        placeholder="At least 6 characters"
                                        autoFocus
                                    />
                                </div>
                                <div className="form-group">
                                    <label>Confirm Password</label>
                                    <input
                                        type="password"
                                        value={confirmPassword}
                                        onChange={e => setConfirm(e.target.value)}
                                        required
                                        placeholder="Repeat your new password"
                                    />
                                </div>

                                {/* Strength hint */}
                                {newPassword && (
                                    <div style={{ marginBottom: 16 }}>
                                        {['Weak', 'Fair', 'Good', 'Strong'].map((label, i) => (
                                            <span key={label} style={{
                                                display: 'inline-block',
                                                width: '22%', height: 4, borderRadius: 99, marginRight: 4,
                                                background: newPassword.length > (i * 3 + 3)
                                                    ? ['#b91c1c', '#F59E0B', '#3B82F6', '#10B981'][i]
                                                    : '#e0e0e0'
                                            }} />
                                        ))}
                                        <span style={{ fontSize: '0.75rem', color: '#555', marginLeft: 4 }}>
                                            {newPassword.length < 6 ? 'Too short' : newPassword.length < 10 ? 'Fair' : newPassword.length < 14 ? 'Good' : 'Strong'}
                                        </span>
                                    </div>
                                )}

                                <button type="submit" className="btn btn-primary btn-full btn-lg" disabled={loading}>
                                    {loading ? 'Updating…' : 'Update Password'}
                                </button>
                            </form>
                        </>
                    )}
                </div>

                <p style={{ textAlign: 'center', marginTop: 20, color: '#555', fontSize: '0.9rem' }}>
                    <Link to="/login">← Back to Login</Link>
                </p>
            </div>
        </div>
    );
};

export default ResetPassword;
