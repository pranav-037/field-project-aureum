import React from 'react';

const InstitutionDashboard: React.FC = () => {
  return (
    <div className="institution-dashboard">
      <div className="dashboard-header">
        <h1>Institution Dashboard</h1>
        <p>Welcome back, institution user</p>
      </div>

      <div className="dashboard-content">
        <div className="stats-grid">
          <div className="stat-card">
            <h3>Authenticated Artworks</h3>
            <p className="stat-value">12</p>
          </div>
          <div className="stat-card">
            <h3>Pending Transfers</h3>
            <p className="stat-value">3</p>
          </div>
          <div className="stat-card">
            <h3>Completed Transfers</h3>
            <p className="stat-value">45</p>
          </div>
          <div className="stat-card">
            <h3>Active Flags</h3>
            <p className="stat-value">0</p>
          </div>
        </div>

        <div className="recent-activity">
          <h2>Recent Activity</h2>
          <div className="activity-list">
            <div className="activity-item">
              <div className="activity-icon">🎨</div>
              <div className="activity-info">
                <h3>Genesis Record Created</h3>
                <p>"Starry Night" by Vincent van Gogh</p>
                <p className="activity-time">2 hours ago</p>
              </div>
            </div>
            <div className="activity-item">
              <div className="activity-icon">🔄</div>
              <div className="activity-info">
                <h3>Transfer Initiated</h3>
                <p>Artwork #AUR-7890</p>
                <p className="activity-time">5 hours ago</p>
              </div>
            </div>
          </div>
        </div>

        <div className="quick-actions">
          <h2>Quick Actions</h2>
          <div className="actions-grid">
            <a href="/artwork/register" className="btn btn-outline">
              Register New Artwork
            </a>
            <a href="/transfers/new" className="btn btn-outline">
              Initiate Transfer
            </a>
            <a href="/verify" className="btn btn-outline">
              Verify Provenance
            </a>
            <a href="/admin" className="btn btn-outline">
              Admin Console
            </a>
          </div>
        </div>
      </div>
    </div>
  );
};

export default InstitutionDashboard;