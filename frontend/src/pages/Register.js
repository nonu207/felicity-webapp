import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import './Auth.css';

const Register = () => {
  const [userType, setUserType] = useState('participant');
  const [formData, setFormData] = useState({
    // Participant fields
    firstName: '',
    lastName: '',
    email: '',
    password: '',
    participantType: 'NON_IIIT',
    collegeName: '',
    contactNumber: '',
    interests: '',
    // Organizer fields
    organizerName: '',
    organizerDescription: '',
    organizerCategory: '',
    contactEmail: '',
  });
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);

  const { registerParticipant, registerOrganizer } = useAuth();
  const navigate = useNavigate();

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setLoading(true);

    let result;

    if (userType === 'participant') {
      const data = {
        firstName: formData.firstName,
        lastName: formData.lastName,
        email: formData.email,
        password: formData.password,
        participantType: formData.participantType,
        collegeName: formData.collegeName,
        contactNumber: formData.contactNumber,
        interests: formData.interests.split(',').map((i) => i.trim()).filter((i) => i),
      };
      result = await registerParticipant(data);
    } else {
      const data = {
        organizerName: formData.organizerName,
        organizerDescription: formData.organizerDescription,
        organizerCategory: formData.organizerCategory,
        contactEmail: formData.contactEmail,
        password: formData.password,
      };
      result = await registerOrganizer(data);
    }

    setLoading(false);

    if (result.success) {
      if (userType === 'organizer') {
        setSuccess('Registration successful! Awaiting admin approval.');
        setTimeout(() => navigate('/dashboard'), 2000);
      } else {
        navigate('/dashboard');
      }
    } else {
      setError(result.error);
    }
  };

  return (
    <div className="auth-page">
      <div className="auth-container">
        <h2>Register</h2>

        <div className="user-type-selector">
          <button
            className={userType === 'participant' ? 'active' : ''}
            onClick={() => setUserType('participant')}
          >
            Participant
          </button>
          <button
            className={userType === 'organizer' ? 'active' : ''}
            onClick={() => setUserType('organizer')}
          >
            Organizer
          </button>
        </div>

        {error && <div className="error-message">{error}</div>}
        {success && <div className="success-message">{success}</div>}

        <form onSubmit={handleSubmit} className="auth-form">
          {userType === 'participant' ? (
            <>
              <div className="form-group">
                <label>First Name</label>
                <input
                  type="text"
                  name="firstName"
                  value={formData.firstName}
                  onChange={handleChange}
                  required
                  placeholder="Enter first name"
                />
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
                />
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
                />
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
                />
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
                <label>College Name</label>
                <input
                  type="text"
                  name="collegeName"
                  value={formData.collegeName}
                  onChange={handleChange}
                  required
                  placeholder="Enter college name"
                />
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
                />
              </div>

              <div className="form-group">
                <label>Interests (comma-separated)</label>
                <input
                  type="text"
                  name="interests"
                  value={formData.interests}
                  onChange={handleChange}
                  placeholder="e.g. Music, Sports, Tech"
                />
              </div>
            </>
          ) : (
            <>
              <div className="form-group">
                <label>Organizer Name</label>
                <input
                  type="text"
                  name="organizerName"
                  value={formData.organizerName}
                  onChange={handleChange}
                  required
                  placeholder="Enter organizer name"
                />
              </div>

              <div className="form-group">
                <label>Description</label>
                <textarea
                  name="organizerDescription"
                  value={formData.organizerDescription}
                  onChange={handleChange}
                  required
                  placeholder="Describe your organization"
                  rows="3"
                />
              </div>

              <div className="form-group">
                <label>Category</label>
                <input
                  type="text"
                  name="organizerCategory"
                  value={formData.organizerCategory}
                  onChange={handleChange}
                  required
                  placeholder="e.g. Cultural, Technical, Sports"
                />
              </div>

              <div className="form-group">
                <label>Contact Email</label>
                <input
                  type="email"
                  name="contactEmail"
                  value={formData.contactEmail}
                  onChange={handleChange}
                  required
                  placeholder="Enter contact email"
                />
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
                />
              </div>
            </>
          )}

          <button type="submit" className="btn btn-primary" disabled={loading}>
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
