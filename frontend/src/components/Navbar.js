import React, { useState, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { notificationAPI } from '../services/api';
import './Navbar.css';

const Navbar = () => {
  const { user, logout, isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [unreadCount, setUnreadCount] = useState(0);

  // Poll unread count when authenticated
  useEffect(() => {
    if (!isAuthenticated) { setUnreadCount(0); return; }
    const fetchCount = async () => {
      try {
        const res = await notificationAPI.getUnreadCount();
        setUnreadCount(res.unreadCount || 0);
      } catch { }
    };
    fetchCount();
    const interval = setInterval(fetchCount, 30000); // every 30s
    return () => clearInterval(interval);
  }, [isAuthenticated, location.pathname]);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const isActive = (path) => location.pathname === path;

  return (
    <nav className="navbar">
      <div className="navbar-inner">
        <Link to="/" className="navbar-brand">
          <span className="brand-icon">
            <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
              <rect x="2" y="2" width="2" height="12"/>
              <rect x="2" y="2" width="10" height="2"/>
              <rect x="2" y="7" width="7" height="2"/>
            </svg>
          </span>
          <span className="brand-text">Felicity</span>
        </Link>

        <div className="navbar-links">
          {!isAuthenticated && (
            <>
              <Link to="/login" className={`nav-link ${isActive('/login') ? 'active' : ''}`}>Login</Link>
              <Link to="/register" className={`nav-link ${isActive('/register') ? 'active' : ''}`}>Register</Link>
            </>
          )}

          {user?.role === 'participant' && (
            <>
              <Link to="/dashboard" className={`nav-link ${isActive('/dashboard') ? 'active' : ''}`}>Dashboard</Link>
              <Link to="/events" className={`nav-link ${isActive('/events') ? 'active' : ''}`}>Browse Events</Link>
              <Link to="/clubs" className={`nav-link ${isActive('/clubs') ? 'active' : ''}`}>Clubs</Link>
              <Link to="/profile" className={`nav-link ${isActive('/profile') ? 'active' : ''}`}>Profile</Link>
            </>
          )}

          {user?.role === 'organizer' && (
            <>
              <Link to="/dashboard" className={`nav-link ${isActive('/dashboard') ? 'active' : ''}`}>Dashboard</Link>
              <Link to="/events/create" className={`nav-link ${isActive('/events/create') ? 'active' : ''}`}>Create Event</Link>
              <Link to="/events" className={`nav-link ${isActive('/events') ? 'active' : ''}`}>Ongoing Events</Link>
              <Link to="/organizer/profile" className={`nav-link ${isActive('/organizer/profile') ? 'active' : ''}`}>Profile</Link>
            </>
          )}

          {user?.role === 'admin' && (
            <>
              <Link to="/dashboard" className={`nav-link ${isActive('/dashboard') ? 'active' : ''}`}>Dashboard</Link>
            </>
          )}

          {isAuthenticated && (
            <Link to="/inbox" className={`nav-link ${isActive('/inbox') ? 'active' : ''}`} style={{ position: 'relative' }}>
              Inbox
              {unreadCount > 0 && (
                <span style={{
                  position: 'absolute', top: -4, right: -10,
                  background: '#111', color: '#fff',
                  fontSize: '0.65rem', fontWeight: 700,
                  minWidth: 16, height: 16, borderRadius: 99,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  padding: '0 4px', lineHeight: 1,
                }}>{unreadCount > 99 ? '99+' : unreadCount}</span>
              )}
            </Link>
          )}

          {isAuthenticated && (
            <button className="btn-logout" onClick={handleLogout}>Logout</button>
          )}
        </div>
      </div>
    </nav>
  );
};

export default Navbar;
