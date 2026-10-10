# Aureum Implementation Plan
## 1. Executive Summary

Aureum is a blockchain-based chain-of-custody platform for high-value artworks that enables trusted authenticators to verify physical artwork identities and anchor them on a decentralized ledger. Every ownership transfer is appended as an immutable, timestamped record, creating a verifiable provenance trail.

## 2. Architecture Overview

### 2.1 System Architecture
Aureum follows a layered architecture:
- **Frontend**: React web application (Vite, TypeScript, Tailwind CSS)
- **Backend**: Node.js/Express REST API with TypeScript
- **Blockchain**: Solidity smart contracts on Polygon
- **Storage**: IPFS via Pinata for documents/media
- **Database**: PostgreSQL with Prisma ORM for indexing
- **Authentication**: JWT for institutions, SIWE (Sign-In with Ethereum) for individuals
- **Indexing**: Background service syncing blockchain events to database

### 2.2 Key Components
1. **Smart Contracts Module**: Core blockchain logic
2. **Backend Services Module**: API services and business logic
3. **Frontend Module**: User interface and experience
4. **DevOps & Infrastructure**: Deployment, monitoring, and scaling

## 3. Technology Stack

### Frontend
- React 18 with TypeScript
- Vite build tool
- Tailwind CSS for styling
- Ethers.js for blockchain interaction
- WalletConnect for wallet integration
- React Query for state management
- Axios for HTTP requests

### Backend
- Node.js with Express
- TypeScript
- PostgreSQL database
- Prisma ORM
- JWT authentication (jsonwebtoken)
- SIWE (ethers.js) for wallet auth
- Pinata SDK for IPFS
- OpenAPI/Swagger for API documentation

### Blockchain
- Solidity ^0.8.19
- Hardhat development framework
- OpenZeppelin contracts (AccessControl, etc.)
- Polygon Mumbai testnet (MVP)
- Alchemy/Infura for RPC
- Ethers.js for contract interaction

### DevOps & Infrastructure
- Docker containerization
- GitHub Actions CI/CD
- Vercel frontend hosting
- Render/AWS backend hosting
- Sentry error monitoring
- LogRocket frontend monitoring

## 4. MVP Features (P0 Priorities)

Based on PRD Section 3.1, the MVP includes:
1. Institutional onboarding, verification and JWT authentication
2. Wallet-signature authentication for individuals
3. Artwork authentication workflow and Genesis record creation
4. Document and image storage on IPFS with on-chain content hashes
5. Ownership transfer recording (append-only chain of custody)
6. Provenance verification and public lookup interface

## 5. Module Details

### 5.1 Smart Contracts Module

#### Core Contracts
1. **ArtchainRegistry.sol**
   - Artwork registration (Genesis records)
   - Ownership transfer recording
   - Access control management
   - Amendment and correction handling
   - Dispute/flagging system
   - Event emissions for indexing

2. **AccessControl.sol** (using OpenZeppelin)
   - Roles: ADMIN, AUTHENTICATOR, VIEWER
   - Multi-signature requirements for sensitive operations

#### Key Functions
- `createGenesisRecord()` - AUTHENTICATOR-only
- `transferOwnership()` - Two-party consent
- `appendAmendmentRecord()` - Corrections
- `flagArtwork()` - Dispute/stolen artwork flags
- `approveInstitution()` - Admin function
- `revokeInstitution()` - Admin with multi-sig
- `verifyProvenance()` - Public view function

### 5.2 Backend Services Module

#### Authentication Service
- Institutional login (email/password + TOTP → JWT)
- Wallet-signature authentication (SIWE/EIP-4361)
- Role-based access control middleware
- Refresh token rotation and revocation
- Account lockout after failed attempts

#### IPFS Service
- File upload to Pinata (50MB images, 20MB docs)
- Malware scanning pre-upload
- Client-side encryption for restricted docs (AES-256-GCM)
- CID/SHA-256 hash anchoring on-chain
- Replication to secondary pinning provider

#### Artwork Service
- Genesis record creation workflow
- Required field validation (title, artist, medium, etc.)
- Duplicate detection (artist+title+dimensions or image hash)
- Draft saving and editing off-chain
- Immutable record after submission

#### Transfer Service
- Transfer initiation with seller authentication
- Two-party consent mechanism (buyer acceptance)
- 14-day expiration window for pending transfers
- Institution-brokered transfers with delegation
- Price visibility controls (PUBLIC/PARTIES_AND_AUTHORISED/HIDDEN)
- Linear chain enforcement (no gaps/reordering)

#### Verification Service
- Provenance lookup by artwork ID/wallet/QR
- Chain integrity status computation (VERIFIED/BROKEN/UNVERIFIABLE)
- Transaction hash verification with block explorer links
- Document hash verification against IPFS
- <3 second lookup time for ≤20 transfers (p95)

#### Admin Service
- Institution approval/revocation workflow
- Multi-signature approval (2-of-N) for sensitive actions
- Audit logging with actor/timestamp/reason
- Flag management and resolution
- System health monitoring

#### Indexer Service
- Blockchain event listening (ethers.js providers)
- PostgreSQL synchronization with confirmation depth
- Chain reorganization handling (rollback/replay)
- Daily reconciliation job (DB vs chain state)
- Alerting on mismatches

### 5.3 Frontend Module

#### Pages & Components
1. **Landing Page** - Value proposition and product overview
2. **Authentication**
   - Institutional login (email/password + TOTP)
   - Wallet connect/sign-in (MetaMask, WalletConnect)
3. **Institution Dashboard**
   - Authenticated artworks list
   - Pending transfers requiring action
   - Recent activity feed
   - Artist/title/date search and filters
4. **Collector Dashboard**
   - Owned artworks display
   - Pending incoming/outgoing transfers
   - Search by artist/title/ID/date range
5. **Artwork Registration Flow**
   - Intake form (title, artist, year, medium, etc.)
   - Authentication method selection
   - Image/document upload (JPEG, PNG, TIFF, PDF)
   - Binding reference upload (photos/fingerprints)
   - Genesis record submission workflow
6. **Transfer Flow**
   - Transfer initiation form
   - Buyer acceptance notification/signing
   - Price visibility setting
   - Delegation handling for institution-brokered transfers
7. **Provenance Verification**
   - Artwork lookup by ID/wallet/QR
   - Chain of custody visualization
   - Integrity status display
   - Document verification UI
   - "Verify independently" instructions
8. **Report Export**
   - PDF/JSON report generation
   - QR code linking to live record
   - Reproducible reports (same block height = same content)
9. **Admin Console** (platform administrators only)
   - Institution management (approval/revocation)
   - Flag review and resolution
   - Audit log viewing/export
   - System health metrics

## 6. Database Schema (Prisma ORM)

```prisma
model Institution {
  id            String   @id @default(cuid())
  name          String
  jurisdiction  String
  registrationNumber String
  authorizedSignatories String[]
  status        InstitutionStatus @default(PENDING)
  walletAddress String          @unique
  adminUserId   String
  createdAt     DateTime @default(now())
  updatedAt     DateTime @updatedAt
  admin         User?        @relation(fields: [adminUserId], references: [id])
  artworks      Artwork[]
  transfers     Transfer[]
}

enum InstitutionStatus {
  PENDING
  APPROVED
  REVOKED
}

model User {
  id            String   @id @default(cuid())
  email         String   @unique
  passwordHash  String
  institutionId String?
  institution   Institution? @relation(fields: [institutionId], references: [id])
  role          UserRole   @default(VIEWER)
  walletAddress String?    @unique
  createdAt     DateTime @default(now())
  updatedAt     DateTime @updatedAt
}

enum UserRole {
  ADMIN
  AUTHENTICATOR
  VIEWER
}

model Artwork {
  id               String   @id @default(cuid())
  artworkId        String   @unique // On-chain unique ID
  title            String
  artist           String
  year             String?
  medium           String
  dimensions       String
  edition          String?
  authenticationMethod String
  authenticatorId  String
  authenticator    Institution @relation(fields: [authenticatorId], references: [id])
  initialOwnerId   String
  initialOwner     User @relation(fields: [initialOwnerId], references: [id])
  genesisTimestamp DateTime
  genesisTxHash    String
  metadataCid      String
  documentCids     String[]
  imageCids        String[]
  bindingReference String
  status           ArtworkStatus @default(VERIFIED)
  createdAt        DateTime @default(now())
  updatedAt        DateTime @updatedAt
  transfers        Transfer[]
  amendments       Amendment[]
  flags            Flag[]
}

enum ArtworkStatus {
  VERIFIED
  BROKEN
  UNVERIFIABLE
  DISPUTED
}

model Transfer {
  id            String   @id @default(cuid())
  artworkId     String
  artwork       Artwork @relation(fields: [artworkId], references: [id])
  sellerId      String
  seller        User @relation(fields: [sellerId], references: [id])
  buyerId       String?
  buyer         User @relation(fields: [buyerId], references: [id])
  intermediaryId String?
  intermediary  Institution? @relation(fields: [intermediaryId], references: [id])
  transferDate  DateTime
  priceVisibility PriceVisibility
  priceCommitment String?
  supportingDocCids String[]
  txHash        String
  blockNumber   Int
  status        TransferStatus @default(PENDING)
  createdAt     DateTime @default(now())
  updatedAt     DateTime @updatedAt
}

enum PriceVisibility {
  PUBLIC
  PARTIES_AND_AUTHORISED
  HIDDEN
}

enum TransferStatus {
  PENDING
  FINALIZED
  EXPIRED
  CANCELLED
}

model Amendment {
  id            String   @id @default(cuid())
  artworkId     String
  artwork       Artwork @relation(fields: [artworkId], references: [id])
  issuerId      String
  issuer        Institution @relation(fields: [issuerId], references: [id])
  referencedBlock String
  reason        String
  createdAt     DateTime @default(now())
}

model Flag {
  id            String   @id @default(cuid())
  artworkId     String
  artwork       Artwork @relation(fields: [artworkId], references: [id])
  flaggerId     String
  flagger       User @relation(fields: [flaggerId], references: [id])
  type          FlagType
  reason        String
  evidenceRef   String?
  createdAt     DateTime @default(now())
  resolvedAt    DateTime?
}

enum FlagType {
  DISPUTED
  REPORTED_STOLEN
  UNDER_REVIEW
}
```

## 7. API Endpoints

### 7.1 Authentication Endpoints
- `POST /api/v1/auth/institution/login` - Institutional login (email/password + TOTP)
- `POST /api/v1/auth/wallet/challenge` - Get wallet-signature nonce
- `POST /api/v1/auth/wallet/verify` - Verify wallet signature
- `POST /api/v1/auth/refresh` - Refresh access token
- `POST /api/v1/auth/logout` - Invalidate session

### 7.2 Institution Management Endpoints
- `POST /api/v1/institutions/register` - Institution registration
- `GET /api/v1/institutions/{id}` - Get institution details
- `PUT /api/v1/institutions/{id}/approve` - Admin approval
- `PUT /api/v1/institutions/{id}/revoke` - Admin revocation (multi-sig)
- `GET /api/v1/institutions` - List institutions (admin only)

### 7.3 Artwork Endpoints
- `POST /api/v1/artworks` - Create artwork draft
- `GET /api/v1/artworks/{id}` - Get artwork details
- `PUT /api/v1/artworks/{id}` - Update artwork draft
- `POST /api/v1/artworks/{id}/submit` - Submit for Genesis record
- `GET /api/v1/artworks` - Search artworks (filtered/paginated)

### 7.4 Transfer Endpoints
- `POST /api/v1/transfers` - Initiate transfer
- `POST /api/v1/transfers/{id}/accept` - Buyer acceptance
- `GET /api/v1/transfers/{id}` - Get transfer details
- `GET /api/v1/transfers` - List transfers (filtered/paginated)
- `DELETE /api/v1/transfers/{id}` - Cancel pending transfer

### 7.5 Verification Endpoints
- `GET /api/v1/verify/{artworkId}` - Get provenance and integrity status
- `GET /api/v1/verify/{artworkId}/report` - Generate PDF/JSON report
- `GET /api/v1/verify/qr/{qrCode}` - Lookup by QR code

### 7.6 Admin Endpoints
- `POST /api/v1/admin/flags` - Create flag
- `PUT /api/v1/admin/flags/{id}/resolve` - Resolve flag
- `GET /api/v1/admin/audit-log` - Get audit logs
- `POST /api/v1/admin/multisig/approve` - Multi-signature approval

## 8. Development Phases

### Phase 1: Foundation (Weeks 1-3)
**Goals**: Set up development environment, core smart contracts, basic backend
- Initialize repo with monorepo structure (frontend/backend/contracts)
- Set up Hardhat environment with Polygon Mumbai testnet
- Implement core AccessControl and ArtchainRegistry contracts
- Set up Node.js/Express server with TypeScript
- Configure PostgreSQL database with Prisma ORM
- Implement basic JWT authentication
- Set up IPFS service with Pinata integration
- Create basic frontend structure with React/Vite
- Implement wallet connection (MetaMask/WalletConnect)

### Phase 2: Core MVP Features (Weeks 4-8)
**Goals**: Implement all P0 features from PRD
**Institutional Auth (FR-1.1, FR-1.2)**
- Complete institutional registration workflow
- Implement email/password + TOTP authentication
- Add role-based access control (ADMIN/AUTHENTICATOR/VIEWER)
- Create institution approval/revocation workflow
- Implement audit logging for admin actions

**Individual Auth (FR-1.3)**
- Implement SIWE (Sign-In with Ethereum) authentication
- Add nonce-based wallet signature verification
- Implement session management for wallet users
- Add network mismatch detection (Polygon required)

**Artwork Authentication (FR-2.1, FR-2.2, FR-2.3)**
- Create artwork intake form with validation
- Implement duplicate detection logic
- Add draft saving/editing off-chain
- Create Genesis record submission workflow
- Implement IPFS upload with CID/hash anchoring
- Add binding reference upload and storage
- Create smart contract functions for Genesis records

**Ownership Transfer (FR-4.1, FR-4.2)**
- Implement transfer initiation workflow
- Add two-party consent mechanism (buyer acceptance)
- Create 14-day expiration for pending transfers
- Implement institution-brokered transfers with delegation
- Add price visibility controls (PUBLIC/PARTIES_AND_AUTHORISED/HIDDEN)
- Implement linear chain enforcement
- Create smart contract transfer functions

**Provenance Verification (FR-5.1)**
- Build artwork lookup by ID/wallet/QR
- Implement chain integrity status computation
- Add transaction hash verification with block explorer links
- Create document hash verification against IPFS
- Build provenance verification UI with integrity display
- Add "independent verification" instructions
- Optimize for <3 second lookup time (≤20 transfers)

### Phase 3: Enhanced MVP Features (Weeks 9-12)
**Goals**: Implement P1 features for usability and operational needs
**Search and Dashboards (FR-5.2)**
- Implement artwork search (artist, title, ID, owner, authenticator, date)
- Create institution dashboard with authenticated artworks
- Create collector dashboard with owned artworks
- Add pending transfers visualization
- Implement pagination, sorting, and CSV export

**Document Integrity (FR-5.1 Acceptance Criteria 6)**
- Implement document integrity check (re-hash compare)
- Add tampered document detection UI

**Report Export (FR-5.3)**
- Implement PDF/JSON report generation
- Add QR code linking to live record
- Ensure reproducible reports (same block height)
- Implement restricted document exclusion logic

**Admin Console (FR-6.2)**
- Build admin institution management interface
- Create flag management and resolution workflow
- Implement multi-signature approval UI
- Add audit log viewing and export
- Build system health monitoring dashboard

**Notifications (FR-7.3)**
- Implement email notifications for:
  - Pending signatures (transfers)
  - Finalized transfers
  - Flag creations/resolutions
  - Admin decisions
- Add user notification preferences
- Ensure security-critical notices cannot be disabled

### Phase 4: Testing, Security, and Preparation for Audit (Weeks 13-16)
**Goals**: Comprehensive testing, security review, audit preparation
**Testing**
- Implement unit tests for smart contracts (Hardhat)
- Add integration tests for backend services
- Create end-to-end tests for critical user flows
- Implement automated contract tests for API endpoints
- Add performance testing for lookup latency

**Security**
- Conduct internal security review (OWASP Top 10)
- Run dependency scanning
- Implement input validation and sanitization
- Add rate limiting on public endpoints
- Configure WAF for public endpoints
- Implement secrets management (no hardcoded keys)

**Audit Preparation**
- Prepare documentation for independent audit
- Implement upgradeability controls (timelocked multisig or versioned)
- Add emergency pause functionality for transfers
- Prepare penetration test scope
- Complete legal review preparation (GDPR/DPDP, AML)

### Phase 5: Testnet Pilot and Mainnet Preparation (Weeks 17-20)
**Goals**: Run pilot with institutions, prepare for mainnet launch
**Pilot Execution**
- Onboard 3+ pilot institutions on Polygon testnet
- Guide institutions through full flow (authenticate → transfer → verify)
- Collect feedback and metrics
- Fix issues discovered during pilot

**Mainnet Preparation**
- Address all audit findings
- Complete penetration testing
- Finish legal review (privacy, AML, evidentiary positioning)
- Test disaster recovery and key compromise procedures
- Prepare mainnet deployment scripts
- Create launch documentation and runbooks

## 9. Key Risks and Mitigations

Based on PRD Section 6.6:

### 9.1 Garbage-in, Permanent-garbage-out
**Risk**: Immutability preserves bad data as faithfully as good data
**Mitigation**:
- Strict authenticator vetting and KYB process
- Clear accountability mechanisms
- Authenticator revocation visibility
- Plan for V2 physical-world binding (NFC tags, forensic signatures)

### 9.2 Cold-start / Network Effect
**Risk**: Limited value with few records
**Mitigation**:
- Target narrow pilot segment (specific gallery network/regional auction house)
- Backfill with attested historical records (manual import in MVP)
- Focus on high-value use cases where provenance is critical

### 9.3 Privacy and Confidentiality Conflict
**Risk**: Public price/ownership data may deter adoption
**Mitigation**:
- Implement FR-3.2 (client-side encryption for restricted documents)
- Implement FR-4.4 (price visibility controls: PUBLIC/PARTIES_AND_AUTHORISED/HIDDEN)
- Default to PARTIES_AND_AUTHORISED for price data

### 9.4 Regulatory and Legal Uncertainty
**Risk**: On-chain records don't establish legal title
**Mitigation**:
- Clear positioning as evidence supporter (not replacer)
- Complete legal review of GDPR/DPDP compliance
- Define evidentiary positioning in terms of service
- Monitor cross-border enforcement developments

### 9.5 Centralization of Trust
**Risk**: System still relies on authenticators/admins
**Mitigation**:
- Accurate product messaging about trust model
- Published authenticator admission criteria
- Visible issuer reputation and revocation status
- Documented process for handling fraudulent authenticators

### 9.6 Key Loss / Compromise
**Risk**: Lost collector wallet strands ownership
**Mitigation**:
- Document mitigation strategy for V2 (social recovery/institutional custodial)
- Provide clear wallet security best practices
- Consider multi-signature wallet options for high-value artworks

## 10. Success Metrics

Based on PRD Section 6:

### 10.1 Adoption Metrics (6-month targets)
- Verified institutions onboarded: 10-15 pilot institutions
- Artworks authenticated (Genesis): 500+
- Transfers recorded: 150+
- Active verifiers: 1,000+ unique users/orgs/month
- Institution retention: ≥70% with ≥1 write in trailing 30 days

### 10.2 Product Value Metrics
- Time to verify provenance: <10 seconds (vs. days/weeks manual)
- Due-diligence cost reduction: ≥40% reduction for pilot institutions
- Duplicate-sale attempts blocked: Goal of zero successful duplicates
- Disputes resolved using on-chain record: Qualitative + counted

### 10.3 Trust and Integrity Metrics
- Chain integrity rate: 100% of records passing VERIFIED status
- Indexer/chain reconciliation mismatches: 0 unresolved >24h
- Authenticator revocations: Tracked, actioned <24h
- Flagged artworks: Tracked with time-to-resolution
- Security incidents: 0 critical/high incidents

### 10.4 Reliability Metrics
- Availability: ≥99.9% for read services
- Lookup latency: p95 ≤3 seconds
- Transaction failure rate: <1%
- Task success rate: ≥80% (onboarding → first Genesis record)
- NPS from pilot institutions: ≥40

## 11. Launch Success Criteria (Go/No-Go for Mainnet)

Per PRD Section 6.5, mainnet launch requires:
1. Independent smart contract audit completed with all critical/high findings resolved
2. Penetration test passed; no open critical/high vulnerabilities
3. Legal review of privacy (GDPR/DPDP), AML, and evidentiary positioning completed
4. At least 3 pilot institutions successfully complete full flow (authenticate → transfer → verify) on testnet
5. Verified end-to-end independent verification procedure (third party can validate without Aureum's servers)
6. Disaster-recovery and key-compromise runbooks tested

## 12. Conclusion

This implementation plan provides a comprehensive roadmap for building Aureum as specified in the PRD. By following this phased approach, prioritizing MVP features, and addressing key risks proactively, the Token Force team can deliver a secure, usable provenance trail platform that addresses the core problems of fragmented provenance data, verification inefficiency, and fraud susceptibility in the art market.

The plan emphasizes security, regulatory compliance, and user experience while maintaining focus on the core value proposition: creating an immutable, verifiable chain of custody for high-value artworks that reduces fraud, increases transparency, speeds up transactions, and builds confidence through cryptographic proof rather than reputation alone.
