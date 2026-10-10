import React from 'react';

const LandingPage: React.FC = () => {
  return (
    <div className="landing-page">
      <section className="hero">
        <div className="hero-content">
          <h1>Aureum: Artchain Provenance Trail</h1>
          <p>
            A blockchain-based chain-of-custody platform for high-value artworks
            that enables trusted authenticators to verify physical artwork
            identities and create an immutable, verifiable provenance trail.
          </p>
          <div className="hero-actions">
            <a href="/login" className="btn btn-primary">
              Login
            </a>
            <a href="/register" className="btn btn-secondary">
              Get Started
            </a>
          </div>
        </div>
      </section>

      <section className="features">
        <h2>How Aureum Works</h2>
        <div className="features-grid">
          <div className="feature-card">
            <h3>1. Artwork Authentication</h3>
            <p>
              Trusted authenticators verify physical artworks and create Genesis
              records on the blockchain, anchoring the artwork's identity.
            </p>
          </div>
          <div className="feature-card">
            <h3>2. Ownership Transfer</h3>
            <p>
              Every ownership transfer is recorded as an immutable, timestamped
              record on the chain, creating an unbroken provenance trail.
            </p>
          </div>
          <div className="feature-card">
            <h3>3. Provenance Verification</h3>
            <p>
              Collectors, galleries, insurers, and museums can instantly verify
              an artwork's full history through a single interface.
            </p>
          </div>
        </div>
      </section>

      <section className="cta">
        <h2>Ready to transform art provenance?</h2>
        <p>
          Join our network of trusted authenticators and collectors to ensure
          the authenticity and integrity of high-value artworks.
        </p>
        <a href="/register" className="btn btn-primary btn-large">
          Get Started Today
        </a>
      </section>
    </div>
  );
};

export default LandingPage;