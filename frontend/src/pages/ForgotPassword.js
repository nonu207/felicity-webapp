import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { authAPI } from '../services/api';

const ForgotPassword = () => {
    const [email, setEmail] = useState('');
    const [loading, setLoading] = useState(false);
    const [sent, setSent] = useState(false);
    const [error, setError] = useState('');

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        setLoading(true);
        try {
            await authAPI.forgotPassword({ email });
            setSent(true);
        } catch (err) {
            setError(err.response?.data?.message || 'Something went wrong. Please try again.');
        }
        setLoading(false);
    };

    return (
        <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
            <div style={{ width: '100%', maxWidth: 420 }}>
                <div style={{ textAlign: 'center', marginBottom: 32 }}>
                    <h1 className="page-title" style={{ fontSize: '1.8rem' }}>Forgot Password</h1>
                    <p className="text-secondary">
                        {sent ? "Check your inbox!" : "Enter your email and we'll send you a reset link"}
                    </p>
                </div>

                <div className="card card-lg">
                    {sent ? (
                        <div style={{ textAlign: 'center' }}>
                            <div className="alert alert-success mb-16">
                                If an account is registered under that email, check your inbox for a reset link. (Also check spam.)
                            </div>
                            <p className="text-secondary" style={{ fontSize: '0.88rem', marginBottom: 20 }}>
                                The link expires in <strong>1 hour</strong>. Didn't receive it?
                            </p>
                            <button className="btn btn-ghost btn-full" onClick={() => setSent(false)}>
                                Resend email
                            </button>
                        </div>
                    ) : (
                        <>
                            {error && <div className="alert alert-error mb-16">{error}</div>}
                            <form onSubmit={handleSubmit}>
                                <div className="form-group">
                                    <label>Email Address</label>
                                    <input
                                        type="email"
                                        value={email}
                                        onChange={e => setEmail(e.target.value)}
                                        required
                                        placeholder="you@example.com"
                                        autoFocus
                                    />
                                </div>
                                <button type="submit" className="btn btn-primary btn-full btn-lg" disabled={loading}>
                                    {loading ? 'Sending…' : 'Send Reset Link'}
                                </button>
                            </form>
                        </>
                    )}
                </div>

                <p style={{ textAlign: 'center', marginTop: 20, color: '#555', fontSize: '0.9rem' }}>
                    Remember your password? <Link to="/login">Sign in</Link>
                </p>
            </div>
        </div>
    );
};

export default ForgotPassword;
