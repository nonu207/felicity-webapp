import React, { useState, useRef } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import ReCAPTCHA from 'react-google-recaptcha';
import { useAuth } from '../context/AuthContext';
import './Auth.css';

const RECAPTCHA_SITE_KEY = process.env.REACT_APP_RECAPTCHA_SITE_KEY || '6LeIxAcTAAAAAJcZVRqyHh71UMIEGNQ_MXjiZKhI';

const INTEREST_OPTIONS = [
  'Music', 'Dance', 'Drama', 'Theatre', 'Fine Arts', 'Photography', 'Film & Media',
  'Technology', 'Coding', 'Robotics', 'AI & ML', 'Cybersecurity', 'Science',
  'Literature', 'Creative Writing', 'Debate', 'Public Speaking', 'Quiz',
  'Sports', 'Fitness', 'Yoga', 'Gaming', 'E-Sports',
  'Finance', 'Entrepreneurship', 'Social Service', 'Environment', 'Astronomy',
];

const Register = () => {
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    password: '',
    participantType: 'NON_IIIT',
    collegeName: '',
    contactNumber: '',
    interests: [],
  });
  const [error, setError] = useState('');
  const [fieldErrors, setFieldErrors] = useState({});
  const [loading, setLoading] = useState(false);
  const [captchaToken, setCaptchaToken] = useState(null);
  const captchaRef = useRef(null);
  const { registerParticipant } = useAuth();
  const navigate = useNavigate();

  const handleChange = (e) => {
    const { name, value } = e.target;
    if (name === 'participantType') {
      setFormData(prev => ({
        ...prev,
        participantType: value,
        collegeName: value === 'IIIT' ? 'IIIT Hyderabad' : '',
      }));
    } else if (name === 'email') {
      const isIIIT = value.toLowerCase().endsWith('iiit.ac.in');
      setFormData(prev => ({
        ...prev,
        email: value,
        ...(isIIIT ? { participantType: 'IIIT', collegeName: 'IIIT Hyderabad' } : {}),
        ...(!isIIIT && prev.participantType === 'IIIT' ? { participantType: 'NON_IIIT', collegeName: '' } : {}),
      }));
    } else {
      setFormData(prev => ({ ...prev, [name]: value }));
    }
  };

  const toggleInterest = (interest) => {
    setFormData(prev => ({
      ...prev,
      interests: prev.interests.includes(interest)
        ? prev.interests.filter(i => i !== interest)
        : [...prev.interests, interest],
    }));
  };

  const validateForm = () => {
    const errs = {};
    if (!formData.firstName.trim()) errs.firstName = 'First name is required';
    if (!formData.lastName.trim()) errs.lastName = 'Last name is required';
    if (!formData.email.trim()) errs.email = 'Email address is required';
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) errs.email = 'Please enter a valid email address';
    if (!formData.password) errs.password = 'Password is required';
    else if (formData.password.length < 6) errs.password = 'Password must be at least 6 characters';
    if (!formData.collegeName.trim() && formData.participantType !== 'IIIT') errs.collegeName = 'College / institution name is required';
    if (!formData.contactNumber.trim()) errs.contactNumber = 'Contact number is required';
    else if (!/^\+?[\d\s\-()]{7,15}$/.test(formData.contactNumber)) errs.contactNumber = 'Enter a valid phone number (7-15 digits)';
    if (formData.participantType === 'IIIT' && !formData.email.endsWith('iiit.ac.in')) errs.email = 'IIIT participants must use their IIIT email (iiit.ac.in)';
    return errs;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setFieldErrors({});

    const errs = validateForm();
    if (Object.keys(errs).length > 0) {
      setFieldErrors(errs);
      setError(Object.values(errs)[0]);
      return;
    }

    if (!captchaToken) {
      setError('Please complete the CAPTCHA verification');
      return;
    }

    setLoading(true);

    const data = {
      firstName: formData.firstName,
      lastName: formData.lastName,
      email: formData.email,
      password: formData.password,
      participantType: formData.participantType,
      collegeName: formData.collegeName,
      contactNumber: formData.contactNumber,
      interests: formData.interests,
      captchaToken,
    };

    const result = await registerParticipant(data);
    setLoading(false);

    if (result.success) {
      navigate('/onboarding');
    } else {
      setError(result.error);
      if (captchaRef.current) captchaRef.current.reset();
      setCaptchaToken(null);
    }
  };

  return (
    <div className="auth-page">
      <div className="auth-container">
        <h2>Register</h2>

        {error && <div className="error-message">{error}</div>}

        <form onSubmit={handleSubmit} className="auth-form">
          <div className="form-group">
            <label>First Name</label>
            <input
              type="text"
              name="firstName"
              value={formData.firstName}
              onChange={handleChange}
              required
              placeholder="Enter first name"
              style={fieldErrors.firstName ? { borderColor: '#dc2626' } : {}}
            />
            {fieldErrors.firstName && <span style={{ color: '#dc2626', fontSize: '0.78rem' }}>{fieldErrors.firstName}</span>}
          </div>

          <div className="form-group">
            <label>Last Name</label>
            <input
              type="text"
              name="lastName"
              value={formData.lastName}
              onChange={handleChange}
              required
              placeholder="Enter last name"
              style={fieldErrors.lastName ? { borderColor: '#dc2626' } : {}}
            />
            {fieldErrors.lastName && <span style={{ color: '#dc2626', fontSize: '0.78rem' }}>{fieldErrors.lastName}</span>}
          </div>

          <div className="form-group">
            <label>Email</label>
            <input
              type="email"
              name="email"
              value={formData.email}
              onChange={handleChange}
              required
              placeholder="Enter your email"
              style={fieldErrors.email ? { borderColor: '#dc2626' } : {}}
            />
            {fieldErrors.email && <span style={{ color: '#dc2626', fontSize: '0.78rem' }}>{fieldErrors.email}</span>}
          </div>

          <div className="form-group">
            <label>Password</label>
            <input
              type="password"
              name="password"
              value={formData.password}
              onChange={handleChange}
              required
              minLength="6"
              placeholder="Enter password (min 6 characters)"
              style={fieldErrors.password ? { borderColor: '#dc2626' } : {}}
            />
            {fieldErrors.password && <span style={{ color: '#dc2626', fontSize: '0.78rem' }}>{fieldErrors.password}</span>}
          </div>

          <div className="form-group">
            <label>Participant Type</label>
            <select
              name="participantType"
              value={formData.participantType}
              onChange={handleChange}
              required
            >
              <option value="NON_IIIT">Non-IIIT</option>
              <option value="IIIT">IIIT</option>
            </select>
          </div>

          <div className="form-group">
            <label>College / Institution</label>
            {formData.participantType === 'IIIT' ? (
              <input
                type="text"
                value="IIIT Hyderabad"
                disabled
                style={{ opacity: 0.6, cursor: 'not-allowed' }}
              />
            ) : (
              <>
                <input
                  type="text"
                  name="collegeName"
                  value={formData.collegeName}
                  onChange={handleChange}
                  required
                  placeholder="Enter your college or institution name"
                  style={fieldErrors.collegeName ? { borderColor: '#dc2626' } : {}}
                />
                {fieldErrors.collegeName && <span style={{ color: '#dc2626', fontSize: '0.78rem' }}>{fieldErrors.collegeName}</span>}
              </>
            )}
          </div>

          <div className="form-group">
            <label>Contact Number</label>
            <input
              type="tel"
              name="contactNumber"
              value={formData.contactNumber}
              onChange={handleChange}
              required
              placeholder="Enter contact number"
              style={fieldErrors.contactNumber ? { borderColor: '#dc2626' } : {}}
            />
            {fieldErrors.contactNumber && <span style={{ color: '#dc2626', fontSize: '0.78rem' }}>{fieldErrors.contactNumber}</span>}
          </div>

          <div className="form-group">
            <label>
              Interests
              {formData.interests.length > 0 && (
                <span style={{ fontWeight: 400, color: '#A78BFA', fontSize: '0.82rem', marginLeft: 8 }}>
                  {formData.interests.length} selected
                </span>
              )}
            </label>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginTop: 4 }}>
              {INTEREST_OPTIONS.map(interest => (
                <button
                  key={interest}
                  type="button"
                  onClick={() => toggleInterest(interest)}
                  style={{
                    padding: '6px 14px',
                    borderRadius: 99,
                    border: formData.interests.includes(interest)
                      ? '1.5px solid #7C3AED' : '1.5px solid rgba(255,255,255,0.15)',
                    background: formData.interests.includes(interest)
                      ? 'rgba(124,58,237,0.2)' : 'rgba(255,255,255,0.04)',
                    color: formData.interests.includes(interest) ? '#A78BFA' : '#9B9BB4',
                    font: '500 0.83rem Inter, sans-serif',
                    cursor: 'pointer',
                    transition: 'all 0.15s',
                  }}
                >
                  {interest}
                </button>
              ))}
            </div>
          </div>

          <div className="form-group" style={{ display: 'flex', justifyContent: 'center' }}>
            <ReCAPTCHA
              ref={captchaRef}
              sitekey={RECAPTCHA_SITE_KEY}
              onChange={(token) => setCaptchaToken(token)}
              onExpired={() => setCaptchaToken(null)}
            />
          </div>

          <button type="submit" className="btn btn-primary" disabled={loading || !captchaToken}>
            {loading ? 'Registering...' : 'Register'}
          </button>
        </form>

        <p className="auth-link">
          Already have an account? <Link to="/login">Login here</Link>
        </p>
      </div>
    </div>
  );
};

export default Register;
