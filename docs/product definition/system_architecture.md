# System Architecture Document
## Aureum: Artchain Provenance Trail

### 1. Overview
Aureum is a blockchain-based provenance platform for high-value artworks. The system enables trusted authenticators to verify physical artwork identities and record ownership transfers on an immutable ledger, creating a verifiable chain of custody.

### 2. Architectural Goals
- **Security**: Robust authentication, encrypted data storage, and secure smart contracts.
- **Scalability**: Designed to handle increasing numbers of institutions, artworks, and transactions.
- **Interoperability**: Open APIs and adherence to art-world standards for future integration.
- **Transparency**: Public verification while respecting confidentiality requirements.
- **Immutability**: Trust in the permanence and tamper-evidence of records.

### 3. High-Level Architecture
Aureum follows a layered, modular architecture:

```
+-------------------+      +-------------------+      +-------------------+
|   Frontend (SPA)  |<---->|   API Gateway     |<---->|   Blockchain      |
| (React/Vite/TS)   | HTTPS| (Node/Express/TS) | JSON/RPC| (Solidity/Polygon)|
+-------------------+      +-------------------+      +-------------------+
          ^                         ^                         ^
          |                         |                         |
          |                         |                         |
+-------------------+      +-------------------+      +-------------------+
|   IPFS Storage    |      |   PostgreSQL DB   |      |   Indexing Service|
| (Pinata/GCM Enc)  |<---->| (Prisma ORM)     |<---->| (Event Listener)  |
+-------------------+      +-------------------+      +-------------------+
```

### 4. Component Details

#### 4.1 Frontend Layer
- **Technology**: React 18 with TypeScript, Vite build tool, Tailwind CSS
- **Responsibilities**:
  - User interface for institutions, collectors, administrators
  - Wallet integration (MetaMask, WalletConnect) for SIWE authentication
  - Form handling for artwork registration, transfers, reporting
  - Visualization of provenance chains and integrity status
  - Consumption of REST APIs via Axios/React Query
- **Key Features**:
  - Role-based views (Institution Dashboard, Collector Dashboard, Admin Console)
  - Secure handling of wallet signatures and JWT tokens
  - QR code generation for artwork lookup and report linking
  - Document preview and verification UI

#### 4.2 API Gateway / Backend Layer
- **Technology**: Node.js with Express, TypeScript
- **Responsibilities**:
  - Authentication services (JWT for institutions, SIWE for individuals)
  - Business logic for artwork registration, transfers, amendments, flags
  - IPFS integration (Pinata SDK) with client-side encryption for restricted documents
  - Request validation, rate limiting, and error handling
  - Multi-signature approval workflows for admin operations
  - Notification service (email via SMTP/SendGrid)
- **Security Measures**:
  - HTTPS enforcement, HTTP-only cookies, CSRF protection
  - Input validation and sanitization (OWASP Top 10)
  - Secrets management (environment variables, secret stores)
  - Role-based access control middleware
  - Audit logging for all administrative actions

#### 4.3 Blockchain Layer
- **Technology**: Solidity ^0.8.19, Hardhat framework, OpenZeppelin contracts
- **Network**: Polygon Mumbai testnet (MVP), Polygon Mainnet (post-audit)
- **Smart Contracts**:
  - **ArtchainRegistry.sol**: Core registry for artworks, Genesis records, transfers, amendments, flags
  - **AccessControl.sol**: Role-based access (ADMIN, AUTHENTICATOR, VIEWER) with multi-signature requirements
- **Key Functions**:
  - `createGenesisRecord()`: Restricted to AUTHENTICATOR role
  - `transferOwnership()`: Requires two-party consent (seller initiation + buyer acceptance)
  - `appendAmendmentRecord()`: For corrections, issued by original authenticator or admin multisig
  - `flagArtwork()`: For disputes/stolen artwork flags (authorized parties only)
  - `approveInstitution()` / `revokeInstitution()`: Admin functions with audit trail
- **Events**: Emitted for all state changes to enable off-chain indexing

#### 4.4 Storage Layer
- **Technology**: IPFS via Pinata (with optional secondary pinning/self-hosted node)
- **Responsibilities**:
  - Store artwork certificates, images, binding references
  - Client-side encryption (AES-256-GCM) for RESTRICTED documents before upload
  - Content addressing via CIDs; SHA-256 hashes stored on-chain for integrity verification
  - Malware scanning pre-upload
  - Configurable file size limits (50MB images, 20MB documents)
- **Data Model**:
  - Public documents: Stored plaintext on IPFS, CID/hash on-chain
  - Restricted documents: Encrypted client-side; only encrypted blob on IPFS; decryption keys shared via approved parties' public keys

#### 4.5 Database Layer
- **Technology**: PostgreSQL with Prisma ORM
- **Responsibilities**:
  - Index blockchain data for fast search and querying
  - Store user/institution profiles, authentication data, metadata
  - Cache frequently accessed provenance data to reduce blockchain read latency
  - Support for complex queries (search, filtering, pagination)
- **Schema** (as defined in implementation plan):
  - Institutions, Users, Artworks, Transfers, Amendments, Flags
  - Relationships and constraints reflecting business logic
- **Maintenance**:
  - Daily encrypted backups with tested restore procedures
  - Indexing lag target: <30s for confirmed on-chain events
  - Reconciliation job to detect DB/chain mismatches

#### 4.6 Indexing Service
- **Technology**: Node.js/TypeScript service using ethers.js providers
- **Responsibilities**:
  - Listen to blockchain events (Genesis, Transfer, Amendment, Flag, Institutional actions)
  - Wait for configurable confirmation depth before marking records final
  - Handle chain reorganizations via rollback/replay mechanisms
  - Synchronize event data to PostgreSQL database
  - Emit alerts on reconciliation mismatches
- **Reliability**:
  - Designed for horizontal scaling if needed
  - Dead-letter queue for failed event processing
  - Health checks and monitoring

### 5. Data Flow Scenarios

#### 5.1 Artwork Registration (Genesis Record Creation)
1. Authenticated institution logs in (JWT) or connects wallet (SIWE)
2. User fills artwork intake form (title, artist, medium, dimensions, binding reference, etc.)
3. System validates required fields and checks for duplicates (artist+title+dimensions or image hash)
4. User uploads images/documents to IPFS via Pinata:
   - Public documents: stored plaintext
   - Restricted documents: encrypted client-side (AES-256-GCM) before upload
5. Backend computes SHA-256 hashes of uploaded files and prepares metadata
6. User submits for on-chain Genesis record creation:
   - Backend triggers smart contract call via institution's AUTHENTICATOR wallet
   - Contract validates caller role, generates unique artwork ID
   - Contract stores: metadata CID, document CIDs, image CIDs, binding reference hash, authenticator address, timestamp, initial owner
   - Contract emits `GenesisRecordCreated` event
7. Indexing service catches event, writes to PostgreSQL with confirmation depth
8. Frontend displays success and provides QR code/link to live record

#### 5.2 Ownership Transfer
1. Current owner (or delegated institution) initiates transfer via frontend
2. Backend validates initiator is current recorded owner (read from blockchain via indexer or direct call)
3. Transfer details captured: seller, buyer address, date, price visibility setting, supporting document CIDs
4. For PUBLIC/PARTIES_AND_AUTHORISED price: plaintext price stored encrypted off-chain with commitment hash on-chain
5. Backend creates pending transfer record in database (status PENDING)
6. Backend triggers smart contract `initiateTransfer()` (seller signs transaction)
7. Contract validates seller is current owner, sets transfer PENDIENT, stores commitment hash if applicable
8. Event `TransferInitiated` emitted; indexing service processes
9. Buyer notified via email (or dApp notification) to accept transfer
10. Buyer signs acceptance transaction via wallet (SIWE)
11. Backend verifies signature, calls `acceptTransfer()` on contract
12. Contract validates buyer, updates current owner, appends transfer record with pointer to prior record, emits `TransferFinalized`
13. Indexing service updates transfer status to FINALIZED
14. Frontend shows completed transfer in provenance chain

#### 5.3 Provenance Verification
1. User enters artwork ID, scans QR code, or connects wallet to lookup owned artworks
2. Frontend calls `/api/v1/verify/{artworkId}` endpoint
3. Backend queries PostgreSQL for artwork metadata and transfer chain (ordered by block number/timestamp)
4. For each transfer, validates:
   - Transaction hash exists on-chain with correct block number
   - Document CIDs match IPFS content (re-compute SHA-256 and compare)
   - For restricted documents: verify requester has decryption rights
5. Computes chain integrity status:
   - VERIFIED: all hashes match, chain unbroken
   - BROKEN: hash mismatch or missing link
   - UNVERIFIABLE: insufficient data (e.g., pending transfer without buyer acceptance)
6. Returns chain data with integrity status, transaction links (to block explorer), document verification results
7. Frontend renders timeline view with integrity indicators and "Verify independently" instructions

### 6. Security Architecture

#### 6.1 Authentication & Authorization
- **Institutions**:
  - Email/password + TOTP (soft token via Authy/Twilio or similar)
  - JWT access token (15-min expiry) + refresh token (rotatable, revocable)
  - Role-based access: ADMIN (full), AUTHENTICATOR (can create Genesis/transfers), VIEWER (read-only)
  - All on-chain writes additionally require wallet signature from approved signer (prevents JWT-only compromise)
- **Individuals**:
  - SIWE (Sign-In with Ethereum) via EIP-4361: nonce-based wallet signature
  - Session token scoped to wallet address
  - Network mismatch detection (blocks non-Polygon write attempts)
- **Session Management**:
  - Secure, HTTP-only cookies
  - CSRF tokens for state-changing operations
  - Automatic logout on inactivity, token revocation on password change

#### 6.2 Data Protection
- **In Transit**: TLS 1.2+ for all communications
- **At Rest**:
  - PostgreSQL encryption at rest (via cloud provider or pgcrypto)
  - Encrypted backups with key management
  - IPFS: Public data is inherently public; sensitive data encrypted client-side before upload
- **Key Management**:
  - Institutional signing keys: recommended HSM or hardware wallet (Ledger/Trezor) – integration via ethers.js
  - Server-side secrets: stored in environment variables or secret manager (AWS Secrets Manager, HashiCorp Vault)
  - Encryption keys for restricted documents: never stored server-side; wrapped to recipients' public keys

#### 6.3 Application Security
- **OWASP Top 10 Mitigations**:
  - Injection: Parameterized queries (Prisma), input validation
  - Broken Auth: As described above
  - Sensitive Data Exposure: Encryption, minimal data on-chain
  - XXE: Disabled in XML parsers
  - Broken Access Control: RBAC middleware, least privilege
  - Security Misconfiguration: Hardened containers, least privilege principles
  - XSS: React auto-escaping, CSP headers
  - Insecure Deserialization: Avoid where possible, strict validation
  - Vulnerable Components: Dependency scanning (npm audit, Snyk)
  - Insufficient Logging: Audit logs for authz, admin actions, errors
- **Additional**:
  - Rate limiting on public endpoints (verification lookups)
  - Web Application Firewall (WAF) for public API
  - Dependency scanning in CI/CD pipeline
  - Regular dependency updates

#### 6.4 Smart Contract Security
- **Standards**: OpenZeppelin Audited Libraries (AccessControl, ReentrancyGuard, etc.)
- **Upgradeability**:
  - MVP: Non-upgradeable for simplicity and auditability
  - V2: Consider transparent proxy pattern with timelocked multisig governance if needed
- **Testing**:
  - Comprehensive unit tests (Hardhat, Waffle/Jest)
  - Property-based testing (echidna) for invariant validation
  - Static analysis (Slither) in CI
  - Formal verification for critical functions (if resources allow)
- **Access Control**:
  - Only AUTHENTICATOR role can create Genesis records
  - Transfers require seller initiation + buyer acceptance (two-party consent)
  - Admin functions (institution approval/revocation) require multi-signature approval (2-of-N)
  - Emergency pause for transfers (not reads) governed by multisig
- **Event Emissions**: All state changes emit events for off-chain verification and indexing

### 7. Deployment Architecture

#### 7.1 Environments
- **Development**: Local Docker compose (frontend, backend, db, IPFS node, blockchain mock)
- **Testing**: Dedicated testnet (Polygon Mumbai) with separate backend instance
- **Staging**: Mirror of production on Mumbai testnet for final validation
- **Production**: 
  - MVP: Polygon Mumbai testnet (for pilot)
  - Post-Launch: Polygon Mainnet (after audit and compliance)
  - Future: Potential multi-chain abstraction layer

#### 7.2 Infrastructure Components
- **Frontend**: 
  - Hosted on Vercel (or Netlify) with CDN, automatic HTTPS, preview deployments
  - Environment variables for API endpoints, auth settings
- **Backend**:
  - Containerized via Docker
  - Deployed to Render, AWS ECS/Fargate, or similar PaaS
  - Auto-scaling based on request load (CPU/memory)
  - Separate services possible: API, Indexer, Notifications, IPFS pinning worker
- **Database**:
  - Managed PostgreSQL (AWS RDS, Supabase, or similar) with automated backups
  - Read replica for heavy query loads if needed
  - Connection pooling (Prisma compatible)
- **Blockchain**:
  - RPC endpoints via Alchemy/Infura (with fallback)
  - Dedicated service account for contract interactions (with limited funds)
- **Storage**:
  - Primary: Pinata IPFS API (with secret key)
  - Secondary: Self-hosted IPFS cluster or Filecoin pinning service for redundancy
- **Monitoring & Logging**:
  - Error tracking: Sentry (backend and frontend)
  - Performance monitoring: LogRocket (frontend), backend custom metrics
  - Infrastructure monitoring: Uptime, latency, resource utilization (Datadog/Prometheus/Grafana)
  - Alerting: Email/SMS on critical errors, high latency, failed transactions, indexer lag
- **CI/CD**:
  - GitHub Actions pipeline:
    - Linting (ESLint, Prettier)
    - Unit tests (frontend Jest, backend Jest, hardhat test)
    - Security scans (npm audit, Snyk, Trivy for containers)
    - Build Docker images
    - Deploy to staging on push to main
    - Manual approval for production deployment

#### 7.3 Scalability Considerations
- **Horizontal Scaling**:
  - Stateless API instances behind load balancer
  - Indexer service can be partitioned by contract address or event type if needed
  - IPFS pinning can be distributed across multiple nodes
- **Caching**:
  - CDN for static assets (Vercel handles this)
  - Application-level caching for frequent queries (Redis optional for phase 2)
  - Browser caching with proper cache-control headers
- **Database**:
  - Read replicas for reporting/analytics queries
  - Connection pooling, query optimization via Prisma
  - Archival strategy for old data if needed (rare due to permanence goal)
- **Blockchain**:
  - Minimizing on-chain storage: only hashes/CIDs, not full documents
  - Using events for history rather than storing large arrays in contract storage
  - Confirmation depth tuning to balance security vs latency

### 8. Integration Points

#### 8.1 External Services
- **Pinata**: IPFS pinning and gateway (primary storage)
- **Email Provider**: SMTP/SendGrid for notifications (transfer pending/signature, finalization, flags, admin actions)
- **Wallet Providers**: MetaMask, WalletConnect (via WalletConnect v2) for SIWE
- **Blockchain Explorers**: Polygonscan, Blockscout for transaction linking in UI
- **Auth Providers**: TOTP via Authy/Twilio or similar for institutional MFA
- **Secret Management**: AWS Secrets Manager / HashiCorp Vault (planned for V2)
- **Monitoring**: Sentry, LogRocket, Datadog/Prometheus

#### 8.2 Future Integration (V2+)
- **Auction House/Gallery APIs**: REST/Webhook integration for automatic transfer recording upon sale
- **Insurance Systems**: API for proof of provenance attachment to policies
- **Museum Collection APIs**: Integration with CMS for loan/acquisition tracking
- **Legal/Evidence Systems**: APIs for exporting court-admissible reports
- **Physical World Binding**: NFC/tag readers for automated binding verification during transfers

### 9. Standards & Compliance

#### 9.1 Data Standards
- **Artwork Metadata**: Map to CIDOC-CRM and Object ID where feasible (future work)
- **Document Formats**: JPEG, PNG, TIFF for images; PDF for documents (PDF/A for archival consideration)
- **Hashing Algorithm**: SHA-256 for content integrity (standard, widely supported)
- **Encoding**: UTF-8 for text, base64 for binary where required in JSON

#### 9.2 Regulatory Compliance
- **GDPR / India's DPDP**: 
  - No personal data stored on-chain in plaintext (use wallet addresses, hashes)
  - Right to erasure supported via off-chain data deletion (encrypted blobs can be deleted; on-chain hashes remain but are meaningless without ciphertext)
  - Consent management for data sharing (restricted document access)
- **AML/KYC**: 
  - Institutional KYB during onboarding (verified by admin)
  - Transaction monitoring for suspicious patterns (flagging mechanism)
  - Prepared for future integration with sanctions screening services
- **Evidentiary Positioning**: 
  - Terms of service clarify Aureum records support but do not replace legal title
  - Exportable reports include QR code, timestamps, transaction hashes, verification procedure

#### 9.3 Accessibility
- **WCAG 2.1 AA**: Target for frontend components
  - Semantic HTML, ARIA labels, sufficient color contrast
  - Keyboard navigable forms and controls
  - Screen reader friendly error messages and dynamic content

### 10. Operational Procedures

#### 10.1 Backup & Disaster Recovery
- **Database**: Daily encrypted snapshots, point-in-time recovery tested quarterly
- **Configuration**: Infrastructure-as-code (Terraform/CDK) stored in version control
- **Secrets**: Backup of secret management configurations (encrypted)
- **Smart Contracts**: Contract source and artifacts stored in decentralized storage (IPFS/Filecoin) with content hash
- **Runbooks**: Documented procedures for:
  - Database restoration
  - Failover to secondary RPC provider
  - IPFS pinning recovery
  - Key compromise response (rotate institutional signing keys, notify users)
  - Emergency pause activation (transfer pausing via multisig)

#### 10.2 Monitoring & Alerting Thresholds
- **API Latency**: 95th percentile < 2s for internal API, <3s for provenance verification
- **Error Rate**: <1% 5xx responses
- **Indexer Lag**: <30s behind chain head
- **Failed Transactions**: Alert on >5% failure rate in hour window
- **Storage Utilization**: Warn at 80% IPFS pinned storage capacity
- **Security Events**: Immediate alert on:
  - Multiple failed login attempts (brute force)
  - Unauthorized contract call attempts
  - Unexpected admin multisig initiations
  - Signature verification failures indicating replay attacks

#### 10.3 Maintenance Windows
- **Planned Upgrades**: 
  - Smart contract upgrades (if multi-sig timelock adopted): announced 72h in advance, executed during low-usage window (weekend nights UTC)
  - Database schema changes: backward-compatible migrations, zero-downtime where possible
  - Dependency updates: weekly security patch scheduling
- **Incident Response**:
  - Runbook-defined roles (Incident Commander, Comms Lead, Technical Lead)
  - Communication channels: Status page, email alerts, in-app banners
  - Post-mortem blameless analysis within 5 business days

### 11. Diagrams (Refer to accompanying files)
- **Component Interaction Diagram**: Shows data flow between frontend, API, blockchain, IPFS, database
- **Deployment Diagram**: Illustrates Docker containers, managed services, CDN, edge locations
- **Security Zones Diagram**: Public internet, DMZ (API gateway), application subnet, data subnet
- **Sequence Diagrams**: For key scenarios (Genesis creation, transfer, verification)

### 12. Conclusion
This System Architecture Document defines a secure, scalable, and maintainable architecture for Aureum that satisfies the functional and non-functional requirements outlined in the PRD. By separating concerns across layers, leveraging blockchain immutability for trust while using off-chain storage and databases for performance and privacy, and implementing defense-in-depth security practices, Aureum is positioned to deliver a robust provenance trail platform for the high-value art market.

The architecture supports the phased MVP approach while providing clear extension points for V2 features such as physical-world binding, multi-chain support, and deeper institutional integrations, ensuring long-term viability and adaptability to evolving market needs.