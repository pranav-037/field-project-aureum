# Test Plan & Acceptance Tests Document
## Aureum: Artchain Provenance Trail

### 1. Introduction
This document outlines the testing strategy, test levels, test cases, and acceptance criteria for Aureum, a blockchain-based chain-of-custody platform for high-value artworks. The test plan ensures that all functional and non-functional requirements specified in the Product Requirement Document (PRD) are met, and that the system is secure, performant, and ready for pilot deployment on Polygon testnet.

### 2. Testing Objectives
- Verify that all MVP features (P0 priorities) function as specified
- Validate non-functional requirements: performance, security, scalability, usability
- Ensure regulatory compliance (GDPR/DPDP, AML considerations)
- Confirm smart contract correctness and security
- Validate end-to-end user workflows for institutions and collectors
- Ensure system reliability and fault tolerance
- Prepare for independent audit and penetration testing

### 3. Test Levels & Types

#### 3.1 Unit Testing
- **Scope**: Individual functions, methods, smart contract functions, utility functions
- **Responsibility**: Developers
- **Tools**: Jest (TS/JS), Hardhat/Waffle (Solidity), pytest (if Python scripts used)
- **Coverage Target**: >90% for critical paths (authentication, core business logic, smart contract functions)
- **Frequency**: On every commit via CI pipeline

#### 3.2 Integration Testing
- **Scope**: Interactions between components (API <-> DB, API <-> Smart Contracts, Frontend <-> API, Indexer <-> Blockchain <-> DB)
- **Responsibility**: Developers/QA Engineers
- **Tools**: Supertest (API), Hardhat network forks, Docker-compose test environments
- **Focus**: Data flow correctness, error handling, transaction atomicity, event emission/listening
- **Frequency**: Nightly builds, pre-release

#### 3.3 System Testing
- **Scope**: End-to-end workflows on a staging environment mirroring production
- **Responsibility**: QA Team
- **Environment**: Dedicated staging cluster (frontend, backend, PostgreSQL, IPFS pinning service, Polygon Mumbai testnet)
- **Focus**: Complete user journeys, cross-component integrations, configuration validation
- **Frequency**: Per release candidate

#### 3.4 Acceptance Testing (UAT)
- **Scope**: Business requirement validation by stakeholder representatives
- **Responsibility**: Product Owner, Pilot Institutions, Collector Representatives
- **Environment**: Staging or dedicated UAT environment (can be production-like testnet)
- **Focus**: PRD acceptance criteria, usability, value realization
- **Frequency**: After system testing sign-off, before production promotion

#### 3.5 Performance Testing
- **Scope**: Response times, throughput, resource utilization under load
- **Responsibility**: Performance Engineer/QA
- **Tools**: k6, JMeter, Gatling, Lighthouse (frontend)
- **Metrics**: 
  - Provenance lookup latency (p95 ≤3s, p99 ≤6s for ≤20 transfers)
  - Search results latency (p95 ≤1s)
  - Transaction submission acknowledged ≤2s
  - Indexing lag ≤30s at p95
  - Support 50 concurrent institutions, 1,000 concurrent verification requests
- **Frequency**: Per major release, before performance SLAs are finalized

#### 3.6 Security Testing
- **Scope**: Vulnerability assessment, penetration testing, compliance validation
- **Responsibility**: Security Team / External Auditors
- **Tools**: OWASP ZAP, Burp Suite, Nessus, Snyk, npm audit, Trivy, Slither, Echidna, MythX
- **Types**:
  - Static Application Security Testing (SAST)
  - Dynamic Application Security Testing (DAST)
  - Infrastructure as Code (IaC) scanning
  - Container scanning
  - Smart contract audit (independent third-party)
  - Network penetration testing
  - Social engineering resistance (phishing simulations)
- **Frequency**: 
  - SAST/IaC/container: on every commit
  - DAST: weekly on staging
  - Smart contract audit: before mainnet, after significant changes
  - Full penetration test: quarterly, before major releases

#### 3.7 Usability Testing
- **Scope**: User experience, task success rates, accessibility
- **Responsibility**: UX Researcher/QA
- **Methods**: Moderated/unmoderated remote testing, surveys, heuristic evaluation
- **Metrics**:
  - Task success rate (onboarding → first Genesis record) ≥80%
  - System Usability Scale (SUS) target ≥68
  - Accessibility: WCAG 2.1 AA compliance
- **Frequency**: Per major UI change, during pilot feedback cycles

#### 3.8 Compliance Testing
- **Scope**: Adherence to GDPR, India's DPDP Act, AML/KYC guidelines
- **Responsibility**: Compliance Officer/Legal Team with QA support
- **Methods**: 
  - Data flow diagrams and data inventory review
  - Consent mechanism testing
  - Right to erasure/data portability validation
  - Audit log completeness and immutability checks
  - KYB process validation for institution onboarding
- **Frequency**: Pre-launch, annually, or when regulations change

#### 3.9 Regression Testing
- **Scope**: Ensure new changes don't break existing functionality
- **Responsibility**: QA Engineers (automated where possible)
- **Tools**: Cypress/TestCafe (frontend e2e), Jest/TestCafe (API ee)
- **Frequency**: Every release, nightly for active development branches

#### 3.10 Smoke / Sanity Testing
- **Scope**: Basic functionality check after build/deployment
- **Responsibility**: DevOps/QA
- **Features**: 
  - Application loads
  - Authentication works (institution & wallet)
  - Basic read operations (verify artwork)
  - Database connectivity
  - Blockchain node connectivity
- **Frequency**: Every build/deployment

### 4. Test Environment Strategy

#### 4.1 Development Environment
- Local developer machines with Docker compose:
  - Frontend (hot-reload)
  - backend API
  - PostgreSQL
  - IPFS node (local or Pinata dev key)
  - Hardhat network (in-memory or local fork of Mumbai)
- Used for unit and basic integration testing

#### 4.2 Continuous Integration (CI) Environment
- GitHub Actions runners:
  - Matrix: Node.js versions, browser tests (Chrome/Firefox headless)
  - Services: PostgreSQL, IPFS mock, Hardhat network
  - Steps: lint, unit tests, integration tests, security scans (SAST, SCA), build Docker images
  - Deploy to ephemeral preview environment for pull request validation

#### 4.3 Staging Environment
- Mirror of production architecture:
  - Frontend: Vercel preview deployment or equivalent
  - Backend: Render/AWS ECS service (separate from prod)
  - Database: Managed PostgreSQL staging instance
  - Storage: Pinata with dev/test API keys, optional secondary pinning
  - Blockchain: Polygon Mumbai testnet (shared testnet, but with dedicated contract deployment)
  - Indexer, Notifications services
- Used for system testing, performance testing, security scanning, UAT prep

#### 4.4 UAT / Pilot Environment
- Can be staging or a distinct environment:
  - Accessible to invited pilot institutions and collector representatives
  - Same configuration as staging, possibly with pilot-specific data seeds
  - Used for acceptance testing and pilot execution (Phase 5 of implementation plan)

#### 4.5 Production Environment
- Post-launch: Polygon Mainnet (after audit and compliance)
- MVP initial launch: Polygon Mumbai testnet for pilot
- Monitoring, alerting, backup procedures active

### 5. Test Data Management

#### 5.1 Data Types
- **Synthetic Data**: Generated for load/performance testing (artworks, transfers, users)
- **Anonymized Production-like Data**: Derived from real-world patterns but without actual PII
- **Pilot Data**: Real data from participating institutions (with consent and anonymization where needed)
- **Edge Case Data**: Specifically crafted to test boundary conditions, error handling, security tests

#### 5.2 Data Handling Principles
- **Privacy**: No real personal data in non-pilot environments; use synthetic or anonymized
- **Consent**: For pilot data, explicit institutional consent for testing usage
- **Security**: Test data stored securely, access controlled, purged after test cycles where appropriate
- **Consistency**: Database seeds and blockchain state versioned for repeatable tests
- **Cleanup**: Strategies for cleaning test data between test runs (transactions, database truncate, blockchain state reset via redeployment or snapshots)

### 6. Acceptance Criteria (Derived from PRD)

Acceptance testing will verify that the system meets all PRD-specified acceptance criteria. Below is a mapping of PRD sections to testable criteria.

#### 6.1 Epic 1 — Identity, Onboarding & Access Control

**FR-1.1 Institutional Registration and Verification**
- AC1: Institution can submit name, jurisdiction, registration number, authorised signatories, supporting documents → **Test**: End-to-end registration flow, verify document upload to IPFS, metadata stored, status PENDING
- AC2: Account remains PENDING with no write permissions until admin approval → **Test**: Attempt to create Genesis record while PENDING → expect rejection; check institutional status via API
- AC3: On approval, institution's wallet address added to authenticator registry (role: AUTHENTICATOR) → **Test**: After admin approval, query contract for AUTHENTICATOR role, attempt Genesis → success
- AC4: Admin can revoke institution; revocation blocks new writes immediately, logged → **Test**: Admin revoke → attempt new Genesis → failure; check audit log entry
- AC5: All approval, rejection, revocation actions written to audit log with actor, timestamp, reason → **Test**: Perform each action, fetch audit log via API, verify fields

**FR-1.2 Institutional Login (JWT)**
- AC1: Login requires email/password and TOTP → **Test**: Login missing TOTP → failure; with valid TOTP → success
- AC2: Access tokens expire within 15 minutes; refresh tokens rotatable and revocable → **Test**: Token expiry check, refresh token usage, refresh token revocation on logout/password change
- AC3: Role-based access distinguishes ADMIN, AUTHENTICATOR, VIEWER → **Test**: Login with each role, attempt role-specific endpoints, verify access/denial
- AC4: Five consecutive failed attempts trigger temporary lockout and audit-log entry → **Test**: 5 failed logins → lockout, 6th still locked; verify audit log
- AC5: On-chain write by institution requires wallet signature from approved signer (compromised JWT alone insufficient) → **Test**: Obtain JWT, try to call Genesis endpoint without wallet sig → failure; with proper wallet sig → success

**FR-1.3 Wallet-Signature Authentication (Individuals)**
- AC1: Backend issues single-use, time-limited nonce per login attempt → **Test**: Request nonce twice → different each time; reuse old nonce → rejection
- AC2: Signature verified server-side against claimed address; replayed/expired nonces rejected → **Test**: Valid signature → success; reused nonce → failure; wrong address signature → failure
- AC3: Successful login issues session token scoped to wallet address → **Test**: Login, receive token, attempt wallet-restricted endpoint → success; token mismatch → failure
- AC4: Users can connect MetaMask and at least one WalletConnect-compatible wallet → **Test**: Manual UAT with both wallet types
- AC5: Network mismatch (not Polygon) prompts user to switch network before write action → **Test**: Attempt write on wrong network → UI prompts to switch; blocked until correct network

#### 6.2 Epic 2 — Artwork Authentication & Genesis Record

**FR-2.1 Artwork Intake and Authentication Record**
- AC1: Required fields validated (title, artist, medium, dimensions, authentication method, authenticator, date, at least one image+document) → **Test**: Submit missing each field → specific validation errors
- AC2: System rejects likely duplicate (same artist+title+dimensions, or identical image hash) and requires explicit override with reason → **Test**: Create artwork A; attempt duplicate → rejection with override option; provide reason → accepted
- AC3: Draft can be saved and edited off-chain; once submitted for on-chain write, fields immutable → **Test**: Save draft, edit, submit → changes persisted; after submit, edit attempt → blocked or creates new draft
- AC4: Authentication method is controlled vocabulary (assumed list) → **Test**: Attempt invalid method → validation error; valid from list → accepted

**FR-2.2 Genesis Block Creation**
- AC1: Only wallets holding AUTHENTICATOR role can invoke Genesis → **Test**: Non-authenticator wallet → rejection; authenticator → success
- AC2: Each artwork gets unique non-reusable ID; second Genesis for same ID reverts → **Test**: Create artwork with ID X; attempt another with ID X → failure
- AC3: Genesis event emits fields for indexing, txHash stored/displayed → **Test**: Listen to event, verify metadata matches input; check UI shows txHash with link to block explorer
- AC4: Record appears in UI within 30s of block confirmation (NFR Performance) → **Test**: Measure time from submission to UI display (with confirmation depth 1) → ≤30s
- AC5: Genesis record cannot be edited/deleted by any role; corrections via amendment record → **Test**: Attempt edit via API → failure; create amendment → new record references original, both visible

**FR-2.3 Physical-to-Digital Binding Reference**
- AC1: Authenticator must upload defined minimum image set (full front, back, signature, details, label/verso) → **Test**: UI enforces minimum number/images; acceptance only if met
- AC2: Binding method and image-set hashes included in Genesis record → **Test**: Check Genesis event/data includes binding reference field and image CIDs
- AC3: Verification page displays binding method/image set prominently for buyer comparison → **Test**: UAT: verify page shows images and description; ability to zoom/compare

#### 6.3 Epic 3 — Document & Media Storage

**FR-3.1 IPFS Upload with On-Chain Integrity Anchoring**
- AC1: Files up to configurable size (default 50MB images, 20MB docs) accepted; allowed types JPEG, PNG, TIFF, PDF → **Test**: Upload each type at max size → success; exceed size → error; disallowed type (exe) → error
- AC2: Files scanned for malware before pinning → **Test**: Upload EICAR test file → rejection; clean file → success
- AC3: CID deterministic; on-chain record stores CID and hash → **Test**: Upload same file twice → same CID; verify on-chain stores CID and SHA-256 matches file content
- AC4: If pinning fails, on-chain transaction not submitted; user receives retriable error → **Test**: Simulate Pinata failure → API returns error, no tx sent; retry after fix → success
- AC5: Pins replicated to secondary provider/self-hosted node → **Test**: Verify file retrievable from two independent gateways/IPFS nodes

**FR-3.2 Confidential Document Handling**
- AC1: Each document tagged PUBLIC or RESTRICTED; RESTRICTED encrypted (AES-256-GCM) before upload → **Test**: Tag document RESTRICTED → verify uploaded blob is ciphertext; decrypt with proper key → original; wrong key → failure
- AC2: Keys wrapped to public keys of authorised parties, never stored plaintext on server → **Test**: Attempt to retrieve key from server/logs → not found; verify only encrypted key blobs stored
- AC3: Public verification view shows existence, hash, timestamp of restricted documents but not contents → **Test**: API/query returns metadata for restricted doc (size, CID, hash) but no decrypted content; decryption only possible with authorised key
- AC4: Granting/revoking document access logged; revocation prevents future key delivery → **Test**: Grant access to user B → user B can decrypt; revoke → subsequent decrypt attempt fails; audit log shows grant/revoke events

#### 6.4 Epic 4 — Ownership Transfer & Chain of Custody

**FR-4.1 Record Ownership Transfer**
- AC1: Only current recorded owner (or delegated institution) can initiate transfer → **Test**: Non-owner attempt → failure; owner/delegated → success
- AC2: Transfer remains PENDING until buyer signs acceptance within window (default 14 days); otherwise expires → **Test**: Initiate transfer, wait >14d → status EXPIRED, no owner change; within window, buyer accepts → FINALIZED, owner updated
- AC3: On finalisation, contract updates current owner, appends record with pointer to prior record, emits event → **Test**: Verify transfer event includes prev record pointer; check owner change; event emitted
- AC4: Transfer for artwork already in PENDING transfer or DISPUTED status rejected → **Test**: Have PENDING transfer → attempt new → failure; set DISPUTED flag → attempt transfer → failure
- AC5: Sequence strictly linear: no insert/remove/reorder; contract tests demonstrate reconstructable history → **Test**: Create artwork, perform 3 transfers, attempt to insert transfer between 1&2 → failure; verify chain from genesis to latest is contiguous via API
- AC6: Duplicate-sale prevention: same artwork cannot show two concurrent current owners; second transfer from non-current owner reverts → **Test**: After transfer finalized, attempt another transfer from old owner (not current) → failure

**FR-4.2 Institution-Brokered Transfers**
- AC1: Owner delegation (signed message, scoped to artwork and time-limit) required and stored with record → **Test**: Create delegation sig off-chain, API accepts with sig; without sig → rejection; stored delegation visible in transfer record
- AC2: Intermediary institution address stored on record and displayed in chain view → **Test**: Initiate brokered transfer → verify intermediary field set and shown in UI
- AC3: Broker cannot transfer without valid, unexpired delegation → **Test**: Use expired delegation → failure; valid → success

**FR-4.3 Amendment and Correction Records**
- AC1: Only original issuer (or admin with documented reason under multisig approval) can append amendment → **Test**: Non-issuer attempt → failure; original issuer → success; admin attempt without multisig reason → failure; with multisig approval → success
- AC2: Amended blocks visibly marked in UI with link to amendment and reason → **Test**: After amendment, view artwork → amendment indicator, click → shows reason and links to amendment tx
- AC3: Amendments never alter original block's hash or data → **Test**: Compare hash of original block pre/post amendment → identical; original data unchanged in UI

**FR-4.4 Price and Commercial Data Visibility**
- AC1: Options: PUBLIC, PARTIES_AND_AUTHORISED (default), HIDDEN → **Test**: Create transfer with each option → verify on-chain/storage handling
- AC2: For non-public options, chain stores salted hash commitment of price; plaintext held encrypted off-chain → **Test**: Set HIDDEN → on-chain shows commitment (bytes32), off-chain encrypted price recoverable only by parties; SET PUBLIC → plaintext visible (or at least not hidden)
- AC3: Authorised party can verify disclosed price matches on-chain commitment → **Test**: Provide price and salt → recompute hash → matches on-chain commitment

#### 6.5 Epic 5 — Verification & Discovery

**FR-5.1 Instant Provenance Verification**
- AC1: Public lookup (no login) displays: Genesis record, authenticator status, ordered list of transfers, timestamps, txHashes with block links, doc hashes, amendments, active flags → **Test**: Query public endpoint for known artwork → verify all fields present and correctly formatted
- AC2: System recomputes and displays chain integrity status (VERIFIED, BROKEN, UNVERIFIABLE) by comparing on-chain data and off-chain document hashes → **Test**: 
  - VERIFIED: all hashes match, chain intact
  - BROKEN: tamper with IPFS file (or change CID) → status BROKEN
  - UNVERIFIABLE: pending transfer without buyer acceptance → status UNVERIFIABLE
- AC3: Provenance for typical artwork (≤20 transfers) renders in under 3 seconds at p95 → **Test**: Load test with 20-transfer artwork, measure 95th percentile lookup time → ≤3s
- AC4: View states what is/is not guaranteed (records tamper-evident; authenticity depends on named authenticator) → **Test**: UI footer/modal shows disclaimer
- AC5: Anyone can independently verify using public chain data and documented procedure → **Test**: Provide verification kit (script or steps) to external validator → they can confirm integrity using only blockchain explorer and IPFS Gateways

**FR-5.2 Search and Dashboards**
- AC1: Search by artist, title, artwork ID, owner address, authenticator, date range, results <1s for catalogs up to 100k → **Test**: Seed DB with 100k artworks, perform each search type → measure 95th percentile latency → ≤1s
- AC2: Collector dashboard shows owned artworks and pending incoming/outgoing transfers → **Test**: Login as collector, verify dashboard lists owned assets and pending transfers (separate in/out)
- AC3: Pagination, sorting, CSV export of user's own data → **Test**: Perform search with pagination, sorting (asc/desc on multiple fields), export CSV → verify correct data and format

**FR-5.3 Provenance Report Export**
- AC1: Report includes all chain data, hashes, transaction links, verification status at generation time, QR code linking to live record → **Test**: Generate report → verify all fields present; QR code scans to artwork verification URL
- AC2: Reports reproducible: regenerating same block height yields identical content → **Test**: Generate report at block N; later at same block N (no new transfers) → byte-for-byte identical
- AC3: Restricted documents excluded unless requester holds decryption rights → **Test**: User without decryption right → report omits restricted doc metadata; with right → includes metadata (but not content)

#### 6.6 Epic 6 — Disputes, Flags & Governance

**FR-6.1 Dispute / Stolen-Artwork Flag**
- AC1: Flag creation requires reason, evidence reference, flagger's role; signed and recorded on-chain → **Test**: Attempt flag without reason → failure; with all fields → success; check event includes signer
- AC2: While flag active, new transfers blocked; verification view shows prominent warning → **Test**: Set FLAG_DISPUTED → attempt transfer → failure; UI shows warning banner
- AC3: Flags cleared only by appended resolution record from authorised party (or admin multisig) → **Test**: Non-authorised attempt to clear → failure; authorised with reason → success; status cleared, resolution recorded
- AC4: Abuse controls: flagging by unauthorised parties rejected; repeated frivolous flags trigger admin review → **Test**: Random user attempt flag → failure; same user flags 5x quickly → admin notification/log for review

**FR-6.2 Admin Console and Audit Log**
- AC1: Sensitive admin actions (authenticator revocation, flag override) require multi-signature approval (min 2 of N admins) → **Test**: Single admin attempt → failure; two admins (via multisig sig) → success
- AC2: Every admin action logged with actor, timestamp, reason, before/after state → **Test**: Perform admin action (e.g., revoke institution) → fetch audit log → verify all fields present
- AC3: Audit logs exportable and periodically hash-anchored on-chain → **Test**: Export logs → verify format; check that a hash of logs appears on-chain periodically (e.g., daily)

### 7. Non-Functional Requirements Testing

#### 7.1 Performance (PRD Section 5.1)
- **Read Latency**: 
  - Test: Provenance lookup endpoint under load (simulating 1k concurrent verification requests)
  - Success: p95 ≤3s, p99 ≤6s (for ≤20 transfers)
- **Search Latency**: 
  - Test: Search endpoint with various filters under load
  - Success: p95 ≤1s
- **Write Latency**: 
  - Test: Measure time from transfer submission UI to "Pending" acknowledgment
  - Success: ≤2s
- **Confirmation Time**: 
  - Test: Monitor UI states Pending → Confirmed (1 confirmation) → Final (config depth)
  - Success: UI reflects states appropriately; time bounded by Polygon block times
- **Indexing Lag**: 
  - Test: Submit transaction, measure time until indexed in DB and searchable
  - Success: ≤30s at p95
- **Throughput**: 
  - Test: Sustain 50 concurrent institutions submitting transfers (mixed auth); 1k concurrent verification requests
  - Success: No degradation (error rate <1%, latency within targets)
- **IPFS Retrieval**: 
  - Test: Time to first byte for cached vs uncached content via gateway
  - Success: p95 first-byte ≤2s for cached content
- **Gas Efficiency**: 
  - Test: Record gas used for Genesis, transfer, amendment, flag
  - Success: Costs tracked and deemed economically trivial relative to artwork value (e.g., <$0.01 per transaction on Mumbai)

#### 7.2 Security & Privacy (PRD Section 5.2)
- **Smart Contract Security**: 
  - Test: Independent third-party audit (before mainnet); Slither/Echidna in CI; property-based testing
  - Success: No critical/high findings; all medium/low addressed per risk
- **Key Management**: 
  - Test: Verify no private keys in logs or server-side storage; HSM recommendation communicated
- **Authentication**: 
  - Test: MFA enforcement, SIWE nonce usage, token expiration, CSRF protection
  - Success: All mechanisms functioning as designed
- **Data Protection**: 
  - Test: TLS 1.2+ everywhere; DB encryption at rest; client-side encryption for restricted docs; secrets management
  - Success: All in place
- **Application Security**: 
  - Test: OWASP Top 10 mitigation via dependency scanning, input validation, WAF, secure headers
  - Success: No high-risk vulnerabilities found in pen test
- **Privacy & Compliance**: 
  - Test: No plaintext personal data on-chain; GDPR/DPDP rights supported; KYB process for institutions; AML screening program outlined
  - Success: Legal review completion confirming defensibility
- **Governance of Trust**: 
  - Test: Published authenticator criteria; revocation status visible in UI; process for handling fraudulent authenticators documented
  - Success: Documentation and UI elements present
- **Availability & Resilience**: 
  - Test: Daily encrypted backup restore tested; infrastructure monitoring with alerting; RPC redundancy (≥2 providers)
  - Success: Restores work; alerts fire appropriately; failover functional
- **Auditability**: 
  - Test: Immutable audit log of admin/security events; log retention design ≥7 years
  - Success: Logs append-only, hash-anchored, retention policy configured

#### 7.3 Scalability (PRD Section 5.3)
- **Architecture**: 
  - Test: Horizontal scaling of API instances; statelessness verified
  - Success: Adding instances improves load handling without session affinity issues
- **Database**: 
  - Test: Read replicas for scaling read load; connection pooling
  - Success: Read queries offloaded; no connection exhaustion under load
- **CDN & IPFS Gateway Caching**: 
  - Test: Static assets served via CDN; IPFS gateway with caching
  - Success: Reduced latency for repeat asset/document requests
- **Chain-Level Scaling**: 
  - Test: Contract design keeps per-artwork state minimal; uses events for history
  - Success: Storage growth mostly in events/IPFS, not contract storage
- **Storage Growth**: 
  - Test: IPFS pinning cost model documented; retention/tiering policy defined
  - Success: Policy in place, configurable limits
- **Multi-jurisdiction Readiness**: 
  - Test: i18n framework in place (strings externalized); multi-currency display support in data model
  - Success: Framework ready, en/other locale stubs present
- **Interoperability**: 
  - Test: Data mapped to art-world standards where feasible (CIDOC-CRM/Object ID) 
  - Success: Mapping documentation and adaptation layer designed

### 8. Test Deliverables

#### 8.1 Test Artifacts
- **Test Plan**: This document
- **Test Cases**: Detailed in test management tool (e.g., TestRail, Zephyr) or markdown files per feature
- **Test Scripts**: Automated test code (Jest, Cypress, Hardhat test)
- **Test Data**: Seeds, scripts for synthetic data generation, anonymized data sets
- **Environment Specs**: Docker-compose files, Terraform/CloudFormation scripts for staging/prod
- **Traceability Matrix**: Mapping PRD requirements → test cases → test results
- **Test Reports**: 
  - Unit test coverage reports
  - Integration test execution logs
  - System test summary
  - UAT sign-off sheets
  - Performance test reports (graphs, statistics)
  - Security scan reports (SAST, DAST, pentest)
  - Usability test findings
  - Compliance checklists
- **Defect logs**: Tracked in issue tracker (Jira, GitHub Issues) with severity/priority
- **Release Test Summary**: Go/No-Go recommendation for each release candidate

#### 8.2 Acceptance Test Artifacts (UAT)
- **UAT Test Scripts**: Step-by-step guides for pilot institutions and collectors
- **UAT Environment Readiness Checklist**: Verification of staging/prod-like setup
- **UAT Execution Log**: Screenshots, video recordings, tester comments
- **UAT Issue Log**: Defects found during UAT with resolution status
- **UAT Sign-off Form**: Formal acceptance by Product Owner and pilot representatives
- **Lessons Learned Document**: Feedback for future improvements

### 9. Entry & Exit Criteria

#### 9.1 Unit Testing
- **Entry**: Code complete, compiles, lints clean
- **Exit**: 
  - ≥90% coverage on new/modified code
  - All unit tests pass
  - No new critical/high security flaws introduced (SAST)
  - Code review approved

#### 9.2 Integration Testing
- **Entry**: Unit testing exit criteria met; test environment ready
- **Exit**: 
  - All integration tests pass (critical paths)
  - Data consistency between components verified
  - Performance baseline within 20% of target
  - No blocking defects

#### 9.3 System Testing
- **Entry**: Integration testing exit; staging environment stable; smoke test passes
- **Exit**: 
  - All system test cases pass (or waived with justification)
  - Performance meets ≥90% of targets
  - Security scan (DAST) shows no critical/high findings
  - Usability heuristic review passes major issues
  - No severity ≥P1 defects open

#### 9.4 Acceptance Testing (UAT)
- **Entry**: System testing exit; UAT environment ready; pilot participants trained
- **Exit**: 
  - All agreed-upon acceptance test scenarios pass
  - Critical workflows (register → Genesis → transfer → verify) demonstrated successfully by pilots
  - No severity ≥P1 defects open from UAT
  - Product Owner signs off
  - Pilot feedback collected and reviewed

#### 9.5 Performance Testing
- **Entry**: System testing exit; isolated performance environment available
- **Exit**: 
  - All performance metrics meet or exceed PRD targets
  - No unrecoverable degradation under stress
  - Bottlenecks identified and mitigation planned if near threshold

#### 9.6 Security Testing
- **Entry**: Code freeze for release; security test environment ready
- **Exit**: 
  - Independent smart contract audit report received (for mainnet candidates)
  - Penetration test report: no critical/high vulnerabilities open
  - SAST/DAST scans show no new critical/high issues
  - All known critical/high findings from prior tests resolved

#### 9.7 Regression Testing
- **Entry**: New code ready for release
- **Exit**: 
  - Regression test suite passes (or impacted areas re-tested and passed)
  - No re-introduction of fixed defects
  - Performance within 5% of baseline

#### 9.8 Smoke/Sanity Testing
- **Entry**: New build/deployment available
- **Exit**: 
  - Application loads and responds to health checks
  - Core authentication flows work (institution login, wallet connect)
  - Basic read operations functional
  - No obvious showstopper defects

### 10. Roles & Responsibilities

- **Product Owner**: Define acceptance criteria, prioritize features, approve UAT test plan, sign off UAT
- **Project Manager**: Oversee test schedule, resource allocation, risk management, communicate status
- **Development Team**: Write unit tests, integration tests, fix defects, ensure testability
- **QA Lead/Test Manager**: Design test strategy, write test cases, manage test execution, track metrics, report status
- **QA Engineers**: Execute manual tests, maintain automated test suites, performance testing, usability testing support
- **Automation Engineer**: Develop and maintain test automation frameworks (API, UI, contract)
- **Security Engineer/Legal Advisor**: Conduct threat modeling, review security tests, coordinate pentest/audit, ensure compliance
- **Performance Engineer**: Design and execute load/stress tests, monitor metrics, identify bottlenecks
- **UX Researcher**: Plan and conduct usability tests, analyze results, recommend improvements
- **DevOps Engineer**: Provision and maintain test environments, CI/CD pipelines, infrastructure as code
- **Pilot Institutions/Collector Representatives**: Execute UAT, provide feedback, validate business value
- **Independent Auditors**: Perform smart contract audit, penetration test, compliance assessment

### 11. Test Schedule (Aligned with Implementation Plan Phases)

#### Phase 1: Foundation (Weeks 1-3)
- Unit test framework setup (Jest, Hardhat)
- CI pipeline with basic linting and unit tests
- Smoke test scripts for dev environments
- Initial integration tests (DB connection, API routes)
- Security: SAST, dependency scanning in CI

#### Phase 2: Core MVP Features (Weeks 4-8)
- Unit tests for new features (auth, artwork, transfer, verification)
- Integration tests for API-DB, API-contract, frontend-API
- System test environment ready by week 6
- Performance baseline tests (lookup latency, submission time)
- Security: DAST weekly on staging, smart contract static analysis
- Usability: heuristic evaluations on emerging UI

#### Phase 3: Enhanced MVP Features (Weeks 9-12)
- Expand unit/test coverage to new features (search, reports, admin, notifications)
- System testing of full workflows
- UAT test script preparation
- Performance testing against PRD targets
- Security: prepare for independent audit, remediate findings
- Usability: moderated testing with internal stakeholders

#### Phase 4: Testing, Security, Audit Prep (Weeks 13-16)
- Focus: regression, performance, security, usability, compliance
- Full system test suite execution
- Performance tuning to meet targets
- Independent smart contract audit (if scheduling allows)
- Penetration test execution
- Compliance checks (GDPR, DPDP)
- UAT execution with pilot institutions
- Usability testing and accessibility audit (WCAG)

#### Phase 5: Testnet Pilot and Mainnet Prep (Weeks 17-20)
- Focus: UAT finalization, performance validation, security validation, release prep
- Final UAT sign-off
- Performance test confirmation (meeting all PRD metrics)
- Security: address audit/pentest findings, confirm mitigations
- Compliance: legal review sign-off
- Release candidate testing: smoke, sanity, regression
- Go/No-Go decision for mainnet launch

### 12. Metrics & Reporting

#### 12.1 Test Metrics
- **Test Execution**: % test cases passed/failed/blocked
- **Defect Density**: Defects per KLOC (thousand lines of code)
- **Mean Time to Detect (MTTD)**: Average time from defect introduction to detection
- **Mean Time to Resolve (MTTR)**: Average time from defect assignment to resolution
- **Test Automation Ratio**: % of test cases automated
- **Coverage**: Unit test coverage %, integration test coverage %
- **Escaped Defects**: Defects found in production or UAT that passed earlier test levels
- **Build Success Rate**: % of CI builds that pass all tests

#### 12.2 Reporting Cadence
- **Daily**: Test execution summary (pass/fail counts), new defects, blockers (to dev team)
- **Weekly**: Test metrics report, defect trend analysis, test coverage report (to PO/PM)
- **Per Milestone**: Comprehensive test report (coverage, performance, security, usability) (to stakeholders)
- **Per Release**: Release test summary with Go/No-Go recommendation (to PM/PO/leadership)
- **Post-UAT**: UAT results report, feedback summary, lessons learned (to PO/PM/dev)

### 13. Risks & Contingencies

| Risk | Impact | Likelihood | Mitigation | Contingency |
|------|--------|------------|------------|-------------|
| Test environment instability (flaky tests) | Medium | Medium | Use containerized ephemeral environments; deterministic data seeds; retry logic | Run critical tests multiple times; isolate and fix flaky tests |
| Performance test results miss targets | High | Medium | Early perf testing in Phase 2; profiling; optimize queries/contracts; consider caching | Phase & descoped features if necessary; performance tuning sprint |
| Security testing reveals critical findings late | High | Low | Shift-left security: SAST in CI, threat modeling early, regular pentest | Security sprint to fix; delay release if critical |
| UAT participant availability | Medium | Medium | Schedule early; provide training slots; record sessions for asynchronous feedback | Extend UAT window; use surrogate testers with business SME review |
| Test data management complexity | Low | Medium | Automated data seeding scripts; versioned seeds; cleanup hooks | Manual data setup for critical tests; invest in test data management tool |
| Regulatory changes mid-project | Medium | Low | Legal review early; modular compliance design; configurable policies | Impact assessment; phased compliance updates |

### 14. Approvals
This test plan is approved by:

- **Product Owner**: ________________________ Date: __________
- **Project Manager**: ________________________ Date: __________
- **QA Lead**: ________________________ Date: __________
- **Security Lead**: ________________________ Date: __________
- **Lead Architect**: ________________________ Date: __________

---
*Document Version: 1.0*
*Last Updated: 2026-10-08*
*Next Review: 2027-04-08 (6 months)*