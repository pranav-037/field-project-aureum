import React from 'react';

const CollectorDashboard: React.FC = () => {
  return (
    <div className="collector-dashboard">
      <div className="dashboard-header">
        <h1>Collector Dashboard</h1>
        <p>Welcome back, collector</p>
      </div>

      <div className="dashboard-content">
        <div className="stats-grid">
          <div className="stat-card">
            <h3>Owned Artworks</h3>
            <p className="stat-value">5</p>
          </div>
          <div className="stat-card">
            <h3>Incoming Transfers</h3>
            <p className="stat-value">1</p>
          </div>
          <div className="stat-card">
            <h3>Outgoing Transfers</h3>
            <p className="stat-value">0</p>
          </div>
          <div className="stat-card">
            <h3>Verified Provenance</h3>
            <p className="stat-value">5</p>
          </div>
        </div>

        <div className="owned-artworks">
          <h2>My Collection</h2>
          <div className="artworks-grid">
            {/* Placeholder artwork cards */}
            <div className="artwork-card">
              <div className="artwork-info">
                <h3>Mona Lisa</h3>
                <p>Leonardo da Vinci</p>
                <p>1503–1506</p>
              </div>
              <div className="artwork-status verified">
                Verified Provenance
              </div>
            </div>
            <div className="artwork-card">
              <div className="artwork-info">
                <h3>The Persistence of Memory</h3>
                <p>Salvador Dalí</p>
                <p>1931</p>
              </div>
              <div className="artwork-status verified">
                Verified Provenance
              </div>
            </div>
          </div>
        </div>

        <div className="recent-transactions">
          <h2>Recent Transactions</h2>
          <div className="transactions-list">
            <div className="transaction-item">
              <div className="transaction-icon">📥</div>
              <div className="transaction-info">
                <h3>Incoming Transfer Pending</h3>
                <p>Waiting for your acceptance</p>
                <p className="transaction-time">1 day ago</p>
              </div>
              <button className="btn btn-sm btn-outline">Review</button>
            </div>
          </div>
        </div>

        <div className="quick-actions">
          <h2>Quick Actions</h2>
          <div className="actions-grid">
            <a href="/verify" className="btn btn-outline">
              Verify Artwork Provenance
            </a>
            <a href="/transfers/new" className="btn btn-outline">
              Initiate Transfer
            </a>
            <a href="/reports" className="btn btn-outline">
              Generate Provenance Report
            </a>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CollectorDashboard;