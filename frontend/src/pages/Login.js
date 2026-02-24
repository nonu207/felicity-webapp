import React, { useState, useRef } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import ReCAPTCHA from 'react-google-recaptcha';
import { useAuth } from '../context/AuthContext';

const RECAPTCHA_SITE_KEY = process.env.REACT_APP_RECAPTCHA_SITE_KEY || '6LeIxAcTAAAAAJcZVRqyHh71UMIEGNQ_MXjiZKhI';

const Login = () => {
  const [formData, setFormData] = useState({ email: '', password: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [captchaToken, setCaptchaToken] = useState(null);
  const captchaRef = useRef(null);
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleChange = e => setFormData({ ...formData, [e.target.name]: e.target.value });

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!captchaToken) {
      setError('Please complete the CAPTCHA verification');
      return;
    }

    setLoading(true);
    const result = await login({ ...formData, captchaToken });
    setLoading(false);

    if (result.success) {
      navigate('/dashboard');
    } else {
      setError(result.error);
      if (captchaRef.current) captchaRef.current.reset();
      setCaptchaToken(null);
    }
  };

  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
      <div style={{ width: '100%', maxWidth: 420 }}>
        <div style={{ textAlign: 'center', marginBottom: 32 }}>
          <div style={{ marginBottom: 12, lineHeight: 1 }}>
            <svg width="28" height="28" viewBox="0 0 16 16" fill="#111" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
              <rect x="2" y="2" width="2" height="12"/>
              <rect x="2" y="2" width="10" height="2"/>
              <rect x="2" y="7" width="7" height="2"/>
            </svg>
          </div>
          <h1 className="page-title" style={{ fontSize: '2rem' }}>Welcome back</h1>
          <p className="text-secondary">Sign in to your Felicity account</p>
        </div>

        <div className="card card-lg">
          {error && <div className="alert alert-error mb-16">{error}</div>}
          <form onSubmit={handleSubmit}>
            <div className="form-group">
              <label>Email</label>
              <input type="email" name="email" value={formData.email}
                onChange={handleChange} required placeholder="you@example.com" />
            </div>
            <div className="form-group">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <label>Password</label>
                <Link to="/forgot-password" style={{ fontSize: '0.8rem', color: '#555' }}>Forgot password?</Link>
              </div>
              <input type="password" name="password" value={formData.password}
                onChange={handleChange} required placeholder="Enter your password" />
            </div>
            <div className="form-group" style={{ display: 'flex', justifyContent: 'center' }}>
              <ReCAPTCHA
                ref={captchaRef}
                sitekey={RECAPTCHA_SITE_KEY}
                onChange={(token) => setCaptchaToken(token)}
                onExpired={() => setCaptchaToken(null)}
              />
            </div>
            <button type="submit" className="btn btn-primary btn-full btn-lg" disabled={loading || !captchaToken}>
              {loading ? 'Signing in…' : 'Sign in'}
            </button>
          </form>
        </div>

        <p style={{ textAlign: 'center', marginTop: 20, color: '#555', fontSize: '0.9rem' }}>
          Don't have an account? <Link to="/register">Register here</Link>
        </p>
      </div>
    </div>
  );
};

export default Login;
