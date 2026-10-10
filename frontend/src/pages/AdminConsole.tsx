import React from 'react';

const AdminConsole: React.FC = () => {
  return (
    <div className="admin-console">
      <div className="admin-header">
        <h1>Aureum Admin Console</h1>
        <p>Manage institutions, users, and system settings</p>
      </div>

      <div className="admin-content">
        <div className="admin-navigation">
          <nav className="admin-nav">
            <ul>
              <li><a href="/admin/institutions" className="nav-link active">Institutions</a></li>
              <li><a href="/admin/users" className="nav-link">Users</a></li>
              <li><a href="/admin/flags" className="nav-link">Flags & Disputes</a></li>
              <li><a href="/admin/audit-log" className="nav-link">Audit Log</a></li>
              <li><a href="/admin/settings" className="nav-link">System Settings</a></li>
            </ul>
          </nav>

          <div className="admin-main">
            <div className="admin-welcome">
              <h2>Welcome to the Admin Console</h2>
              <p>
                Use the navigation panel to access different administrative functions.
                This interface allows platform administrators to manage the Aureum network,
                oversee institution approvals, monitor flags, and review audit trails.
              </p>

              <div className="admin-stats">
                <div className="stat-card">
                  <h3>Pending Institution Applications</h3>
                  <p className="stat-value">3</p>
                </div>
                <div className="stat-card">
                  <h3>Active Institutions</h3>
                  <p className="stat-value">12</p>
                </div>
                <div className="stat-card">
                  <h3>Total Artworks Registered</h3>
                  <p className="stat-value">456</p>
                </div>
                <div className="stat-card">
                  <h3>Active Flags</h3>
                  <p className="stat-value">0</p>
                </div>
              </div>

              <div className="admin-actions">
                <h2>Quick Actions</h2>
                <div className="actions-grid">
                  <a href="/admin/institutions?status=PENDING" className="btn btn-outline">
                    Review Applications
                  </a>
                  <a href="/admin/flags" className="btn btn-outline">
                    Monitor Flags
                  </a>
                  <a href="/admin/audit-log" className="btn btn-outline">
                    View Audit Log
                  </a>
                  <a href="/admin/settings" className="btn btn-outline">
                    System Settings
                  </a>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminConsole;