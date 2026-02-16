import React from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import './Home.css';

const Home = () => {
  const { isAuthenticated } = useAuth();

  return (
    <div className="home">
      <div className="home-container">
        <h1>Welcome to Felicity Event Manager</h1>
        <p>Manage your college events with ease</p>

        {!isAuthenticated ? (
          <div className="home-actions">
            <Link to="/login" className="btn btn-primary">
              Login
            </Link>
            <Link to="/register" className="btn btn-secondary">
              Register
            </Link>
          </div>
        ) : (
          <div className="home-actions">
            <Link to="/dashboard" className="btn btn-primary">
              Go to Dashboard
            </Link>
          </div>
        )}

        <div className="home-features">
          <div className="feature">
            <h3>🎓 For Participants</h3>
            <p>Register for events and track your participation</p>
          </div>
          <div className="feature">
            <h3>📋 For Organizers</h3>
            <p>Create and manage events seamlessly</p>
          </div>
          <div className="feature">
            <h3>⚙️ For Admins</h3>
            <p>Oversee all activities and approve organizers</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Home;
