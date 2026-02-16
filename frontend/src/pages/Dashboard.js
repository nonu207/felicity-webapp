import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { adminAPI } from '../services/api';
import './Dashboard.css';

const Dashboard = () => {
  const { user, profile } = useAuth();
  const [organizers, setOrganizers] = useState([]);
  const [participants, setParticipants] = useState([]);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');

  useEffect(() => {
    if (user?.role === 'admin') {
      loadAdminData();
    }
  }, [user]);

  const loadAdminData = async () => {
    setLoading(true);
    try {
      const [orgData, partData] = await Promise.all([
        adminAPI.getAllOrganizers(),
        adminAPI.getAllParticipants(),
      ]);
      setOrganizers(orgData.data);
      setParticipants(partData.data);
    } catch (error) {
      console.error('Error loading admin data:', error);
      setMessage('Error loading data');
    } finally {
      setLoading(false);
    }
  };

  const handleApproveOrganizer = async (id, approve) => {
    try {
      await adminAPI.approveOrganizer(id, approve);
      setMessage(`Organizer ${approve ? 'approved' : 'rejected'} successfully`);
      loadAdminData();
      setTimeout(() => setMessage(''), 3000);
    } catch (error) {
      console.error('Error approving organizer:', error);
      setMessage('Error processing request');
    }
  };

  const handleDeleteUser = async (id) => {
    if (!window.confirm('Are you sure you want to delete this user?')) return;

    try {
      await adminAPI.deleteUser(id);
      setMessage('User deleted successfully');
      loadAdminData();
      setTimeout(() => setMessage(''), 3000);
    } catch (error) {
      console.error('Error deleting user:', error);
      setMessage('Error deleting user');
    }
  };

  if (!user) return null;

  return (
    <div className="dashboard">
      <div className="dashboard-container">
        <h1>Dashboard</h1>

        {message && <div className="dashboard-message">{message}</div>}

        {/* Participant Dashboard */}
        {user.role === 'participant' && profile && (
          <div className="dashboard-content">
            <div className="profile-card">
              <h2>Welcome, {profile.firstName} {profile.lastName}!</h2>
              <div className="profile-info">
                <p><strong>Email:</strong> {user.email}</p>
                <p><strong>College:</strong> {profile.collegeName}</p>
                <p><strong>Type:</strong> {profile.participantType}</p>
                <p><strong>Contact:</strong> {profile.contactNumber}</p>
                {profile.interests && profile.interests.length > 0 && (
                  <p><strong>Interests:</strong> {profile.interests.join(', ')}</p>
                )}
              </div>
            </div>

            <div className="info-card">
              <h3>Quick Info</h3>
              <p>Browse and register for events coming soon!</p>
            </div>
          </div>
        )}

        {/* Organizer Dashboard */}
        {user.role === 'organizer' && profile && (
          <div className="dashboard-content">
            <div className="profile-card">
              <h2>Welcome, {profile.organizerName}!</h2>
              <div className="profile-info">
                <p><strong>Email:</strong> {profile.contactEmail}</p>
                <p><strong>Category:</strong> {profile.organizerCategory}</p>
                <p><strong>Description:</strong> {profile.organizerDescription}</p>
                <p><strong>Status:</strong> {user.isActive ? '✅ Active' : '⏳ Awaiting Approval'}</p>
              </div>
            </div>

            {!user.isActive && (
              <div className="info-card warning">
                <h3>Account Pending Approval</h3>
                <p>Your organizer account is awaiting admin approval. You'll be able to create events once approved.</p>
              </div>
            )}

            {user.isActive && (
              <div className="info-card">
                <h3>Quick Info</h3>
                <p>Event creation and management features coming soon!</p>
              </div>
            )}
          </div>
        )}

        {/* Admin Dashboard */}
        {user.role === 'admin' && (
          <div className="dashboard-content">
            <div className="profile-card">
              <h2>Admin Dashboard</h2>
              <p>Manage organizers and participants</p>
            </div>

            {loading ? (
              <div className="loading">Loading...</div>
            ) : (
              <>
                {/* Organizers Section */}
                <div className="admin-section">
                  <h3>Organizers ({organizers.length})</h3>
                  <div className="table-container">
                    <table>
                      <thead>
                        <tr>
                          <th>Name</th>
                          <th>Email</th>
                          <th>Category</th>
                          <th>Status</th>
                          <th>Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {organizers.map((org) => (
                          <tr key={org._id}>
                            <td>{org.organizerName}</td>
                            <td>{org.contactEmail}</td>
                            <td>{org.organizerCategory}</td>
                            <td>
                              <span className={`status ${org.userId?.isActive ? 'active' : 'inactive'}`}>
                                {org.userId?.isActive ? 'Active' : 'Inactive'}
                              </span>
                            </td>
                            <td>
                              {!org.userId?.isActive && (
                                <button
                                  className="btn-approve"
                                  onClick={() => handleApproveOrganizer(org._id, true)}
                                >
                                  Approve
                                </button>
                              )}
                              {org.userId?.isActive && (
                                <button
                                  className="btn-reject"
                                  onClick={() => handleApproveOrganizer(org._id, false)}
                                >
                                  Deactivate
                                </button>
                              )}
                              <button
                                className="btn-delete"
                                onClick={() => handleDeleteUser(org.userId?._id)}
                              >
                                Delete
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* Participants Section */}
                <div className="admin-section">
                  <h3>Participants ({participants.length})</h3>
                  <div className="table-container">
                    <table>
                      <thead>
                        <tr>
                          <th>Name</th>
                          <th>Email</th>
                          <th>College</th>
                          <th>Type</th>
                          <th>Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {participants.map((part) => (
                          <tr key={part._id}>
                            <td>{part.firstName} {part.lastName}</td>
                            <td>{part.userId?.email}</td>
                            <td>{part.collegeName}</td>
                            <td>{part.participantType}</td>
                            <td>
                              <button
                                className="btn-delete"
                                onClick={() => handleDeleteUser(part.userId?._id)}
                              >
                                Delete
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default Dashboard;
