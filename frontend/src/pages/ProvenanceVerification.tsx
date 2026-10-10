import React, { useState } from 'react';

const ProvenanceVerification: React.FC = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const [searchBy, setSearchBy] = useState('artworkId'); // artworkId, wallet, qr
  const [artworkData, setArtworkData] = useState<any | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    // TODO: Implement actual search logic
    // This would call the backend API to get artwork provenance

    try {
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1500));

      // Mock data for demonstration
      if (searchQuery) {
        setArtworkData({
          id: 'AUR-1234',
          title: 'The Starry Night',
          artist: 'Vincent van Gogh',
          year: '1889',
          medium: 'Oil on canvas',
          dimensions: '73.7 cm × 92.1 cm',
          authenticator: 'Metropolitan Museum of Art',
          genesisTimestamp: '2023-05-15T10:30:00Z',
          genesisTxHash: '0x742d35Cc6634C0532925a3b8D4C0532950532950',
          status: 'VERIFIED',
          transfers: [
            {
              id: 'txf-001',
              date: '2023-06-01',
              from: 'Metropolitan Museum of Art',
              to: 'Private Collector',
              priceVisibility: 'PARTIES_AND_AUTHORISED',
              txHash: '0x742d35Cc6634C0532925a3b8D4C0532950532951',
              blockNumber: 12345678
            },
            {
              id: 'txf-002',
              date: '2024-01-15',
              from: 'Private Collector',
              to: 'Gallery XYZ',
              priceVisibility: 'PUBLIC',
              txHash: '0x742d35Cc6634C0532925a3b8D4C0532950532952',
              blockNumber: 12345679
            }
          ],
          documents: [
            {
              id: 'doc-001',
              name: 'Certificate of Authenticity',
              type: 'image',
              isPublic: true,
              ipfsCid: 'QmXyz...'
            }
          ],
          integrityStatus: 'VERIFIED'
        });
      } else {
        setError('Please enter a search query');
      }
    } catch (err) {
      setError('Search failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleQRScan = () => {
    // TODO: Implement QR scanner using a library or device camera
    alert('QR scanner would be implemented here');
    // For now, simulate scanning a known artwork ID
    setSearchQuery('AUR-1234');
    setSearchBy('artworkId');
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString();
  };

  return (
    <div className="provenance-verification">
      <div className="verification-header">
        <h1>Provenance Verification</h1>
        <p>Verify the authenticity and ownership history of artworks</p>
      </div>

      <div className="verification-content">
        <div className="search-section">
          <h2>Search for Artwork</h2>
          <form onSubmit={handleSearch} className="search-form">
            <div className="search-options">
              <label>
                <input
                  type="radio"
                  name="searchBy"
                  value="artworkId"
                  checked={searchBy === 'artworkId'}
                  onChange={(e) => setSearchBy(e.target.value)}
                />
                Artwork ID
              </label>
              <label>
                <input
                  type="radio"
                  name="searchBy"
                  value="wallet"
                  checked={searchBy === 'wallet'}
                  onChange={(e) => setSearchBy(e.target.value)}
                />
                Wallet Address
              </label>
              <label>
                <input
                  type="radio"
                  name="searchBy"
                  value="qr"
                  checked={searchBy === 'qr'}
                  onChange={(e) => setSearchBy(e.target.value)}
                />
                QR Code
              </label>
            </div>

            <div className="search-input-group">
              {searchBy === 'qr' ? (
                <button
                  type="button"
                  className="btn btn-outline btn-icon"
                  onClick={handleQRScan}
                >
                  Scan QR Code
                </button>
              ) : (
                <input
                  type="text"
                  placeholder={searchBy === 'artworkId' ? 'Enter Artwork ID (e.g., AUR-1234)' : 'Enter Wallet Address'}
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  required
                  disabled={loading}
                />
              )}
              <button
                type="submit"
                className="btn btn-primary"
                disabled={loading}
              >
                {loading ? 'Searching...' : 'Verify Provenance'}
              </button>
            </div>
          </form>

          {error && (
            <div className="alert alert-error">
              {error}
            </div>
          )}
        </div>

        {artworkData && (
          <div className="provenance-results">
            <div className="artwork-header">
              <h2>{artworkData.title}</h2>
              <p className="artwork-artist">by {artworkData.artist}</p>
              <p className="artwork-meta">
                {artworkData.year} • {artworkData.medium} • {artworkData.dimensions}
              </p>
              <div className="integrity-status">
                <span className={`status-${artworkData.integrityStatus.toLowerCase()}`}>
                  {artworkData.integrityStatus}
                </span>
              </div>
            </div>

            <div className="provenance-timeline">
              <h3>Ownership History</h3>
              <div className="timeline">
                {/* Genesis record */}
                <div className="timeline-item genesis">
                  <div className="timeline-icon">🏛️</div>
                  <div className="timeline-content">
                    <h4>Genesis Record</h4>
                    <p>
                      Authenticated by {artworkData.authenticator} on
                      {formatDate(artworkData.genesisTimestamp)}
                    </p>
                    <div className="timeline-details">
                      <p>Transaction: <code>{artworkData.genesisTxHash.slice(0, 10)}...</code></p>
                    </div>
                  </div>
                </div>

                {/* Transfers */}
                {artworkData.transfers.map((transfer: any, index: number) => (
                  <div key={transfer.id} className="timeline-item transfer">
                    <div className="timeline-icon">🔄</div>
                    <div className="timeline-content">
                      <h4>Transfer #{index + 1}</h4>
                      <p>
                        From: <strong>{transfer.from}</strong> → To: <strong>{transfer.to}</strong>
                      </p>
                      <p>Date: {formatDate(transfer.date)}</p>
                      <p>
                        Price Visibility:
                        <span className={`price-vis-${transfer.priceVisibility.toLowerCase().replace(/\s+/g, '_')}`}>
                          {transfer.priceVisibility}
                        </span>
                      </p>
                      <div className="timeline-details">
                        <p>Transaction: <code>{transfer.txHash.slice(0, 10)}...</code></p>
                        <p>Block: #{transfer.blockNumber}</p>
                      </div>
                    </div>
                  </div>
                ))}

                {/* Current status indicator */}
                <div className="timeline-item current">
                  <div className="timeline-icon">📍</div>
                  <div className="timeline-content">
                    <h4>Current Status</h4>
                    <p>{artworkData.transfers.length > 0 ?
                      `Currently with: ${artworkData.transfers[artworkData.transfers.length - 1].to}` :
                      `Still with original authenticator`}
                    </p>
                  </div>
                </div>
              </div>
            </div>

            <div className="verification-notes">
              <h3>Verification Notes</h3>
              <p>
                This provenance record is verified on the blockchain. The integrity status is
                <strong className={artworkData.integrityStatus === 'VERIFIED' ? 'status-verified' : 'status-broken'}>
                  {artworkData.integrityStatus}
                </strong>.
              </p>
              <p>
                <em>
                  Note: Blockchain records provide tamper-evident proof of ownership transfers and
                  authentication events, but do not replace legal title or expert authentication.
                </em>
              </p>
            </div>

            <div className="verification-actions">
              <button className="btn btn-outline">View Detailed Report</button>
              <button className="btn btn-primary">Verify Independently</button>
            </div>
          </div>
        )}

        {!artworkData && (
          <div className="empty-state">
            <h2>Enter search criteria above to verify an artwork</h2>
            <p>
              You can search by Artwork ID (provided by Aureum), wallet address that owns the
              artwork, or scan a QR code linked to the artwork's provenance record.
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default ProvenanceVerification;