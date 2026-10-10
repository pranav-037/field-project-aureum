# Product Requirement Document (PRD): Aureum: Artchain Provenance Trail

**Team:** Token Force (Pranav Thakur, Team Lead; Alex Sam; Vishnu Teja)
**Document status:** Draft v1.0 — derived from the Aureum investment pitch deck
**Convention:** Items marked **[Assumption]** are not stated in the pitch and are industry-standard inferences that must be validated before build.

---

## 1. Executive Summary

- **Product Overview:** Aureum (ArtChain Provenance Trail) is a blockchain-based chain-of-custody platform for high-value artworks. Trusted authenticators verify a physical artwork and anchor its identity on a decentralized ledger (the "Genesis" record). Every later ownership transfer is appended as an immutable, timestamped record linked to the previous one. Collectors, galleries, auction houses, insurers and museums can then verify full provenance through a single interface.

- **Problem Statement:** Provenance data is fragmented across paper certificates, gallery invoices, auction records, insurance files and private databases, with no shared standard. Verification is slow, costly and error-prone, particularly across borders. Sellers can disclose records selectively, so buyers rely on trust rather than independently verifiable proof. This produces forged documentation, duplicate sales, prolonged ownership disputes and expensive manual due diligence.

- **Value Proposition:**
  - *Fraud reduction:* Immutable, append-only records make fabricated histories and retroactive edits detectable.
  - *Radical transparency:* One verifiable source replaces selectively shared archives.
  - *Faster transactions:* Provenance checks drop from a manual, multi-party process to seconds.
  - *Stronger confidence:* Counterparties transact on cryptographic proof rather than reputation alone.
  - *Differentiator:* Authentication is a gate **before** an artwork enters the chain, and all subsequent transfers extend one unbroken trail.

- **Critical product-integrity note (for the engineering and product team):** An immutable ledger guarantees that a record cannot be changed after it is written. It does **not** guarantee that the record was true when written. The pitch's claim that immutable records "close the door on forged papers" is only valid if (a) authenticators are rigorously vetted and accountable, and (b) the physical-to-digital link (artwork ↔ on-chain identity) is robust. Both are treated as first-class requirements in this PRD (see FR-2, FR-3, NFR Security, and Section 6 risks). A forged document that is authenticated and then written to the chain becomes a permanent, *trusted-looking* forgery. The product must be designed around this failure mode, not around the ledger alone.

---

## 2. Target Audience & Personas

### 2.1 Primary User

**Persona A — The Authenticating Institution (Gallery, Auction House, Certification Lab)**
- **Role in system:** Verified issuer. Authenticates the physical artwork, creates the Genesis record, and records subsequent sales it brokers.
- **Goals:** Issue credible, portable authenticity records; reduce manual verification workload; protect institutional reputation; speed up sales.
- **Pain points:** Paper-based certificates are forgeable and non-portable; due diligence consumes staff time; disputes damage reputation and create liability.
- **Auth model (from pitch):** JWT-based institutional authentication. **[Assumption]** Backed by an organisation onboarding and KYB (know-your-business) process and role-based access control.

**Persona B — The Collector / Buyer**
- **Role in system:** Verifies provenance before purchase; owns artworks and participates in transfers.
- **Goals:** Independently confirm an artwork's full history before paying; hold a verifiable record of ownership; resell with confidence.
- **Pain points:** Dependence on seller-supplied documents; fear of forgery, duplicate sales and unclear title; cost of third-party due diligence.
- **Auth model (from pitch):** Wallet-signature authentication (Ethers.js).

### 2.2 Secondary Users

| Persona | Role in system | Key need |
|---|---|---|
| **Insurer / Underwriter** | Read-only verifier; **[Assumption]** may attach insurance attestations | Rapid provenance confirmation to price risk and process claims |
| **Museum / Institutional Collector** | Verifier and recipient in transfers (acquisitions, loans, donations) | Defensible acquisition history; due diligence on contested provenance |
| **Seller / Artist** | Initiates transfers; **[Assumption]** artists may be registered as origin party | Easy, credible proof of authenticity to command trust and price |
| **Legal / Compliance Reviewer** | Read-only; exports evidence | Court- and audit-ready provenance reports for disputes |
| **Platform Administrator (Aureum staff)** | Approves institutions, manages authenticator registry, handles flags **[Assumption]** | Governance, abuse handling, operational visibility |

---

## 3. Scope & Feature Roadmap

### 3.1 In-Scope (MVP) — Prioritised

| Priority | Feature | Rationale |
|---|---|---|
| P0 | Institutional onboarding, verification and JWT authentication | Only vetted authenticators can create Genesis records; the entire trust model depends on this |
| P0 | Wallet-signature authentication for individuals | Pitch-specified identity model for collectors |
| P0 | Artwork authentication workflow and Genesis record creation (on-chain) | Core of the product; anchors artwork identity |
| P0 | Document and image storage on IPFS with on-chain content hashes | Pitch-specified; supports certificates and images |
| P0 | Ownership transfer recording (append-only chain of custody) | Core value: unbroken, timestamped trail |
| P0 | Provenance verification and public lookup interface | "Instant verification… through one interface" |
| P1 | Artwork and provenance search / dashboards (institution and collector views) | Usability; required for daily operation |
| P1 | Document integrity check (re-hash and compare to on-chain value) | Detects tampered off-chain documents |
| P1 | Provenance report export (PDF / JSON) | Supports insurers, legal and due diligence use |
| P1 | Admin console (institution approval, authenticator revocation) | Needed to operate the trust model safely |
| P2 | Dispute / stolen-artwork flag (non-destructive annotation on chain) | Directly addresses "ownership disputes" and "duplicate sales" |
| P2 | Event notifications (email) for transfers and flags | Operational awareness |

**MVP deployment target:** Polygon **testnet** for pilot; mainnet only after security audit (see NFR). **[Assumption]**

### 3.2 Out-of-Scope (V2 and Later)

- Fractional ownership, tokenisation of artworks as tradeable securities, or any on-chain payment/escrow. The pitch positions Aureum as a record system, not a marketplace or "another token or speculative asset."
- Built-in marketplace, auction engine or fiat/crypto settlement.
- Direct integrations with auction-house, gallery-management or insurer systems (APIs/connectors).
- Automated forgery detection using AI/image analysis. **[Assumption]** Reasonable future differentiator.
- Physical-world binding technologies (NFC tags, tamper-evident seals, forensic fingerprinting/microscopic surface signatures). Highly relevant to the physical-to-digital link problem; deferred but strongly recommended for V2 (see risks).
- Multi-chain support and cross-chain bridging.
- Mobile native applications (responsive web only in MVP). **[Assumption]**
- Zero-knowledge proofs for private verification (e.g., prove "chain is unbroken" without revealing price).
- Backfilling of historical (pre-Aureum) provenance beyond a manual, authenticator-attested import in MVP.
- Regulatory integrations (AML/sanctions screening automation, cultural-property / export-registry checks).

---

## 4. Functional Requirements

### Epic 1 — Identity, Onboarding & Access Control

#### FR-1.1 Institutional Registration and Verification
- **Description:** Galleries, auction houses and certification labs register, submit KYB documents, and are approved by an Aureum administrator before gaining authenticator privileges. Approved institutions are recorded in an on-chain (or admin-controlled) registry. **[Assumption]**
- **User Story:** As an authenticating institution, I want to be verified and registered on the platform so that my authentications are recognised as trustworthy by buyers and insurers.
- **Acceptance Criteria:**
  1. An institution can submit name, jurisdiction, registration number, authorised signatories and supporting documents.
  2. The account remains in `PENDING` state with no write permissions until an admin approves it.
  3. On approval, the institution's authorised wallet address is added to the authenticator registry in the smart contract (role: `AUTHENTICATOR`).
  4. Admin can revoke an institution; revocation blocks **new** writes immediately and is itself logged. Previously written records remain unchanged but display the issuer's current status.
  5. All approval, rejection and revocation actions are written to an audit log with actor, timestamp and reason.

#### FR-1.2 Institutional Login (JWT)
- **Description:** Institutional users authenticate with credentials plus MFA and receive a short-lived JWT. **[Assumption: MFA, refresh tokens]**
- **User Story:** As an institution staff member, I want to sign in securely so that only authorised staff can create or transfer records on behalf of my organisation.
- **Acceptance Criteria:**
  1. Login requires email/password and a second factor (TOTP).
  2. Access tokens expire within 15 minutes; refresh tokens are rotated and revocable.
  3. Role-based access control distinguishes `ADMIN`, `AUTHENTICATOR`, `VIEWER` within an institution.
  4. Five consecutive failed attempts trigger a temporary lockout and an audit-log entry.
  5. Any on-chain write initiated by an institution additionally requires a wallet signature from an approved signer, so that a compromised JWT alone cannot alter the ledger.

#### FR-1.3 Wallet-Signature Authentication (Individuals)
- **Description:** Collectors authenticate by signing a server-issued nonce with their wallet (Sign-In with Ethereum style). **[Assumption: EIP-4361]**
- **User Story:** As a collector, I want to log in by connecting my wallet so that I do not need a password and my identity is tied to my ownership address.
- **Acceptance Criteria:**
  1. Backend issues a single-use, time-limited nonce per login attempt.
  2. Signature is verified server-side against the claimed address; replayed or expired nonces are rejected.
  3. A successful login issues a session token scoped to that wallet address.
  4. Users can connect MetaMask and at least one WalletConnect-compatible wallet.
  5. Network mismatch (not Polygon) prompts the user to switch network before any write action.

---

### Epic 2 — Artwork Authentication & Genesis Record

#### FR-2.1 Artwork Intake and Authentication Record
- **Description:** An approved authenticator creates an artwork record containing identifying attributes (title, artist, year, medium, dimensions, edition if any), high-resolution images, and supporting certificates, then submits an authentication attestation.
- **User Story:** As an authenticator, I want to record the verified identity of a physical artwork so that it can enter the chain with a trusted starting point.
- **Acceptance Criteria:**
  1. Required fields are validated (title, artist, medium, dimensions, authentication method, authenticator, date of authentication, at least one image and one supporting document).
  2. The system rejects submission if a likely duplicate exists (same artist + title + dimensions, or identical image hash) and requires explicit authenticator override with a stated reason, which is logged.
  3. A draft can be saved and edited off-chain; once submitted for on-chain write, fields become immutable.
  4. Authentication method is a controlled vocabulary (e.g., connoisseurship review, scientific analysis, catalogue raisonné match). **[Assumption]**

#### FR-2.2 Genesis Block Creation
- **Description:** The smart contract mints a unique artwork ID and writes the Genesis record: artwork metadata hash, document/image content hashes (IPFS CIDs), authenticator address, timestamp and initial owner.
- **User Story:** As an authenticator, I want my authentication anchored on-chain so that the artwork's identity cannot be altered or disputed later.
- **Acceptance Criteria:**
  1. Only wallets holding `AUTHENTICATOR` role can invoke Genesis creation; other callers revert.
  2. Each artwork receives a unique, non-reusable ID; attempting to create a second Genesis for the same ID reverts.
  3. The Genesis event emits all fields required for indexing, and the transaction hash is stored and displayed.
  4. After confirmation, the record appears in the UI within 30 seconds of block confirmation (see NFR Performance).
  5. The Genesis record cannot be edited or deleted by any role, including admins. Corrections are made by an appended **amendment** record referencing the original (see FR-4.3).

#### FR-2.3 Physical-to-Digital Binding Reference
- **Description:** The Genesis record includes a binding reference describing how the physical object is linked to its digital identity (e.g., authenticator-issued unique label ID, photographic fingerprint set of identifying features). In MVP this is an attested photographic and descriptive record; hardware binding is V2. **[Assumption]**
- **User Story:** As a buyer, I want to know how the digital record is tied to the physical object so that I can detect a record being reused for a different (forged) work.
- **Acceptance Criteria:**
  1. Authenticator must upload a defined minimum image set (e.g., full front, full back, signature, identifying details, label/verso marks).
  2. Binding method and image-set hashes are included in the Genesis record.
  3. The verification page displays the binding method and image set prominently so that buyers can compare against the physical object.

---

### Epic 3 — Document & Media Storage

#### FR-3.1 IPFS Upload with On-Chain Integrity Anchoring
- **Description:** Certificates and images are uploaded to IPFS via Pinata. Their content identifiers (CIDs) and SHA-256 hashes are recorded on-chain; searchable metadata is stored in PostgreSQL.
- **User Story:** As an authenticator, I want supporting documents stored immutably and linked to the on-chain record so that they cannot be silently swapped.
- **Acceptance Criteria:**
  1. Files up to a configurable size (default 50 MB for images, 20 MB for documents) are accepted; allowed types are JPEG, PNG, TIFF, PDF. **[Assumption]**
  2. Files are scanned for malware before pinning.
  3. The CID is deterministic of content; the on-chain record stores CID and hash.
  4. If pinning fails, the on-chain transaction is **not** submitted; the user receives a retriable error.
  5. Pins are replicated to at least one secondary pinning provider or a self-hosted node to reduce single-vendor dependence. **[Assumption]**

#### FR-3.2 Confidential Document Handling
- **Description:** Because IPFS content is publicly retrievable by anyone with the CID, sensitive documents (invoices, identity documents, insurance files, price data) are encrypted client-side before upload, with access keys shared only with authorised parties. **[Assumption — required to reconcile the pitch's "documents on IPFS" with privacy law and commercial confidentiality]**
- **User Story:** As a seller, I want sensitive documents protected so that only parties I authorise can read them while the public can still verify they exist and are unchanged.
- **Acceptance Criteria:**
  1. Each document is tagged `PUBLIC` or `RESTRICTED`; `RESTRICTED` documents are encrypted (AES-256-GCM) before upload.
  2. Keys are wrapped to the public keys of authorised parties and are never stored in plaintext on the server.
  3. The public verification view shows existence, hash and timestamp of restricted documents but not their contents.
  4. Granting and revoking document access is logged; revocation prevents future key delivery (it cannot recall already-decrypted copies, and the UI must state this).

---

### Epic 4 — Ownership Transfer & Chain of Custody

#### FR-4.1 Record Ownership Transfer
- **Description:** A transfer record is appended containing seller, buyer, transfer date, price (or price commitment, see FR-4.4), supporting document hashes, and a reference to the previous block. The seller must initiate and the buyer must countersign (two-party consent) before the contract finalises the transfer. **[Assumption: two-party consent to prevent unilateral false transfers]**
- **User Story:** As a seller, I want to record the sale of an artwork so that the buyer receives a verifiable, uninterrupted ownership trail.
- **Acceptance Criteria:**
  1. Only the current recorded owner (or an institution acting under that owner's signed delegation) can initiate a transfer.
  2. The transfer remains `PENDING` until the named buyer signs acceptance within a configurable window (default 14 days); otherwise it expires without effect.
  3. On finalisation, the contract updates the current owner, appends the record with a pointer to the prior record, and emits an event.
  4. A transfer for an artwork already in `PENDING` transfer, or in `DISPUTED` status (FR-5.1), is rejected.
  5. The sequence is strictly linear: no record can be inserted, removed or reordered. Contract tests must demonstrate that history from Genesis to latest can be reconstructed with no gaps.
  6. Duplicate-sale prevention: the same artwork cannot show two concurrent current owners; a second transfer attempt from a non-current owner reverts.

#### FR-4.2 Institution-Brokered Transfers
- **Description:** Galleries or auction houses can record sales they broker on behalf of consenting owners, with the institution identified as the intermediary.
- **User Story:** As an auction house, I want to record a hammer-price sale so that the winning buyer's ownership is immediately verifiable.
- **Acceptance Criteria:**
  1. Owner delegation (signed message, scoped to artwork and time-limited) is required and stored with the record.
  2. The intermediary institution address is stored on the record and displayed in the chain view.
  3. A broker cannot transfer an artwork without a valid, unexpired delegation.

#### FR-4.3 Amendment and Correction Records
- **Description:** Mistakes are corrected by appended amendment records that reference and annotate prior blocks. Original data remains visible.
- **User Story:** As an authenticator, I want to correct an erroneous entry without erasing history so that the chain remains trustworthy and the correction is transparent.
- **Acceptance Criteria:**
  1. Only the original issuer (or admin with a documented reason under multi-signature approval) can append an amendment.
  2. Amended blocks are visibly marked in the UI with a link to the amendment and reason.
  3. Amendments never alter the original block's hash or data.

#### FR-4.4 Price and Commercial Data Visibility
- **Description:** The pitch records price on-chain. Public recording of private sale prices is commercially and legally sensitive. MVP supports a per-transfer visibility setting. **[Assumption]**
- **User Story:** As a seller, I want to control who can see the sale price so that I meet confidentiality obligations while still proving the transfer occurred.
- **Acceptance Criteria:**
  1. Options: `PUBLIC`, `PARTIES_AND_AUTHORISED` (default), `HIDDEN`.
  2. For non-public options, the chain stores only a salted hash commitment of the price; the plaintext is held encrypted off-chain.
  3. An authorised party can verify that a disclosed price matches the on-chain commitment.

---

### Epic 5 — Verification & Discovery

#### FR-5.1 Instant Provenance Verification
- **Description:** Any stakeholder can look up an artwork by ID, QR/label ID, or wallet address and view the full chain of custody with cryptographic verification status.
- **User Story:** As a collector, I want to check an artwork's full provenance in seconds so that I can buy with confidence.
- **Acceptance Criteria:**
  1. Public lookup (no login) displays: Genesis record, authenticator and its current status, ordered list of transfers, timestamps, transaction hashes with block-explorer links, document hashes, amendments and any active flags.
  2. The system recomputes and displays a **chain integrity status** (`VERIFIED`, `BROKEN`, `UNVERIFIABLE`) by comparing on-chain data and off-chain document hashes.
  3. Provenance for a typical artwork (≤ 20 transfers) renders in under 3 seconds at p95 (see NFR).
  4. The view prominently states what is and is not guaranteed (e.g., "Records are tamper-evident. Authenticity depends on the named authenticator.").
  5. Anyone can independently verify the result using only public chain data and a documented verification procedure (no reliance on Aureum servers).

#### FR-5.2 Search and Dashboards
- **Description:** Institution and collector dashboards list artworks, pending actions (transfers awaiting signature) and recent activity, with search and filters.
- **User Story:** As an institution user, I want to find and manage the artworks we have authenticated so that I can handle my workload efficiently.
- **Acceptance Criteria:**
  1. Search by artist, title, artwork ID, owner address, authenticator and date range, with results in under 1 second for catalogues of up to 100,000 records.
  2. Collector dashboard shows owned artworks and pending incoming/outgoing transfers.
  3. Pagination, sorting and CSV export of the user's own data.

#### FR-5.3 Provenance Report Export
- **Description:** Generates a signed, timestamped PDF/JSON report of an artwork's chain of custody for due diligence, insurance or legal use.
- **User Story:** As an insurer, I want a portable provenance report so that I can attach it to a policy or claim file.
- **Acceptance Criteria:**
  1. Report includes all chain data, hashes, transaction links, verification status at generation time, and a QR code linking to the live record.
  2. Reports are reproducible: regenerating on the same block height yields identical content.
  3. Restricted documents are excluded unless the requester holds decryption rights.

---

### Epic 6 — Disputes, Flags & Governance

#### FR-6.1 Dispute / Stolen-Artwork Flag
- **Description:** Authorised parties (current owner, authenticator, or recognised authority) can attach a flag (`DISPUTED`, `REPORTED_STOLEN`, `UNDER_REVIEW`) to an artwork. Flags are annotations; they do not alter prior history.
- **User Story:** As an owner, I want to flag a suspicious or stolen artwork so that prospective buyers are warned and further transfers are paused.
- **Acceptance Criteria:**
  1. Flag creation requires a reason, evidence reference and the flagger's role; it is signed and recorded on-chain.
  2. While a flag is active, new transfers are blocked and the verification view shows a prominent warning.
  3. Flags are cleared only by an appended resolution record from an authorised party (or an admin multisig for contested cases), with full history retained.
  4. Abuse controls: flagging by unauthorised parties is rejected; repeated frivolous flags trigger admin review.

#### FR-6.2 Admin Console and Audit Log
- **Description:** Admin tools for institution approval, role management, flag review and system health, with a tamper-evident audit log.
- **User Story:** As a platform administrator, I want visibility and control over governance actions so that I can maintain integrity and respond to abuse.
- **Acceptance Criteria:**
  1. Sensitive administrative actions (authenticator revocation, flag override) require multi-signature approval (minimum 2 of N admins). **[Assumption]**
  2. Every administrative action is logged with actor, timestamp, reason, and before/after state.
  3. Audit logs are exportable and are periodically hash-anchored on-chain. **[Assumption]**

---

### Epic 7 — Platform Services

#### FR-7.1 REST API
- **Description:** Node.js (Express) REST API exposing artwork, transfer, verification and admin endpoints with OpenAPI documentation.
- **User Story:** As a developer at an integrating institution, I want a documented API so that I can connect existing systems later.
- **Acceptance Criteria:**
  1. All endpoints are specified in an OpenAPI 3 document and covered by automated contract tests.
  2. Public read endpoints are rate-limited; write endpoints require authentication.
  3. The API is versioned (`/v1`) with documented deprecation policy.

#### FR-7.2 Blockchain Indexer and Event Sync
- **Description:** A background service listens to contract events and synchronises PostgreSQL for fast search, handling reorgs and missed blocks. **[Assumption]**
- **User Story:** As a user, I want fast, accurate search results that always match the chain so that I can trust what I see.
- **Acceptance Criteria:**
  1. Indexer waits for a configurable confirmation depth before marking records final.
  2. Chain reorganisations are handled by rolling back and replaying affected blocks.
  3. A reconciliation job compares database state to chain state daily and alerts on any mismatch.

#### FR-7.3 Notifications
- **Description:** Email notifications for pending signatures, finalised transfers, flags and admin decisions.
- **User Story:** As a collector, I want to be told when something requires my action so that I do not miss deadlines.
- **Acceptance Criteria:**
  1. Notifications are triggered within 60 seconds of the relevant event.
  2. Users can manage notification preferences; security-critical notices cannot be disabled.

---

## 5. Non-Functional Requirements

### 5.1 Performance
- **Read latency:** Provenance lookup renders at p95 ≤ 3 s, p99 ≤ 6 s (≤ 20 transfers); search results p95 ≤ 1 s. **[Assumption]**
- **Write latency:** Transaction submission acknowledged to the user in ≤ 2 s; confirmation time bounded by Polygon block times, with the UI showing explicit `Pending` → `Confirmed` → `Final` states.
- **Indexing lag:** Confirmed on-chain events reflected in the UI within 30 s at p95.
- **Throughput:** Support 50 concurrent institutions and 1,000 concurrent verification requests in MVP without degradation. **[Assumption]**
- **IPFS retrieval:** Documents served via a gateway with caching; p95 first-byte ≤ 2 s for cached content.
- **Gas efficiency:** Store hashes and CIDs on-chain, not full documents; target Genesis creation and transfer transactions to remain economically trivial relative to artwork value, with a gas-cost budget tracked per transaction type.

### 5.2 Security & Privacy
- **Smart contract security:**
  - Role-based access control (OpenZeppelin `AccessControl`), upgradeability only through a timelocked multisig, or non-upgradeable contracts with versioned migration. **[Assumption]**
  - Full unit and property-based tests in Hardhat; static analysis (Slither) in CI; **independent third-party audit is a hard gate before mainnet deployment.**
  - Defined emergency pause for transfers (not for reads) controlled by multisig.
- **Key management:** Institutional signing keys held in HSM or managed key vault (or hardware wallets); no private keys in application servers or CI. Multisig for admin and treasury operations.
- **Authentication:** MFA for institutions; SIWE nonce-based wallet auth; short-lived tokens; secure, HTTP-only cookies or equivalent; CSRF and replay protection.
- **Data protection:** TLS 1.2+ everywhere; encryption at rest for PostgreSQL and backups; client-side encryption for restricted documents (FR-3.2); secrets in a managed secret store.
- **Application security:** OWASP Top 10 mitigations, dependency scanning, input validation, rate limiting, WAF on public endpoints, and pre-launch penetration testing.
- **Privacy and compliance (important design constraint):**
  - Blockchains are permanent. Personal data (names, addresses, identity documents, personal buyer details) must **not** be written on-chain in plaintext; use wallet addresses, hashes and encrypted off-chain storage. This is required to remain defensible under GDPR (right to erasure) and India's DPDP Act. **[Assumption]**
  - Pseudonymous wallet addresses can still constitute personal data when linkable to a person; legal review is required before launch.
  - KYB for institutions; AML/KYC obligations and sanctions screening to be assessed with counsel, since the art market is subject to AML regulation in several jurisdictions.
  - Legal admissibility: define how on-chain records and exported reports are positioned as evidence (they support, but do not replace, legal title). Terms of service must state this clearly.
- **Governance of trust:** Public, published authenticator admission criteria; visible issuer reputation and revocation status; documented process for what happens when an authenticator is later found to have been fraudulent or compromised.
- **Availability and resilience:** Daily encrypted backups of PostgreSQL with tested restore; target 99.9% availability for read services; infrastructure monitored with alerting (uptime, indexer lag, failed transactions); RPC provider redundancy (at least two). **[Assumption]**
- **Auditability:** Immutable audit logging of administrative and security events; log retention of at least 7 years. **[Assumption]**

### 5.3 Scalability
- **Market framing:** The pitch targets a global art market spanning multiple institutions and borders. MVP is a pilot-scale deployment; architecture must permit growth without redesign.
- **Capacity planning assumptions:** Year-1 target of 100 institutions, 10,000 artworks and 50,000 on-chain transactions; design for 10× headroom. **[Assumption]**
- **Architecture:** Stateless API instances (horizontal scaling on Render, containerised via Docker); read-optimised PostgreSQL with indexes and read replicas as needed; CDN for static assets (Vercel) and IPFS gateway caching.
- **Chain-level scaling:** Polygon provides low-cost throughput; the contract design should keep per-artwork state minimal and use events for history to control storage cost. Abstraction layer over the blockchain client to permit migration to another EVM chain or L2 if required.
- **Storage growth:** IPFS pinning costs grow with document volume; define retention and tiering policy, and cap per-artwork storage by default. **[Assumption]**
- **Multi-jurisdiction readiness:** Internationalisation (i18n) and multi-currency display support in the data model from day one, even if the MVP UI is English-only. **[Assumption]**
- **Interoperability:** Use open, documented data schemas (e.g., map metadata to existing art-world standards such as CIDOC-CRM / Object ID where feasible) to ease later integration with institutional systems. **[Assumption]**

---

## 6. Key Metrics & Success Criteria

### 6.1 Adoption and Network Metrics
| KPI | Definition | Initial Target (6 months post-launch) **[Assumption]** |
|---|---|---|
| Verified institutions onboarded | Approved authenticators active on platform | 10–15 pilot institutions |
| Artworks authenticated (Genesis records) | Total Genesis blocks written | 500+ |
| Transfers recorded | Finalised ownership transfers | 150+ |
| Active verifiers | Unique users/orgs performing lookups per month | 1,000+ |
| Institution retention | Institutions with ≥ 1 write in the trailing 30 days | ≥ 70% |

### 6.2 Product Value Metrics (tie directly to pitch claims)
| KPI | Definition | Target |
|---|---|---|
| Time to verify provenance | Median time from lookup to complete verified view | < 10 seconds (vs. days/weeks manual baseline; baseline to be measured in pilot interviews) |
| Due-diligence cost reduction | Self-reported or measured reduction in verification effort for pilot institutions | ≥ 40% reduction |
| Duplicate-sale attempts blocked | Rejected second-owner transfers | Tracked; goal of zero successful duplicates |
| Disputes resolved using on-chain record | Disputes where chain evidence was cited | Qualitative + counted |

### 6.3 Trust and Integrity Metrics
| KPI | Definition | Target |
|---|---|---|
| Chain integrity rate | % of records passing `VERIFIED` status | 100% |
| Indexer/chain reconciliation mismatches | Daily DB vs chain discrepancies | 0 unresolved > 24 h |
| Authenticator revocations | Count and time-to-action | Tracked; revocation actioned < 24 h |
| Flagged artworks | Flags raised and time-to-resolution | Tracked |
| Security incidents | Critical/high incidents | 0 |

### 6.4 Reliability and Experience Metrics
- Availability ≥ 99.9% (reads); p95 lookup latency ≤ 3 s; transaction failure rate < 1%.
- Task success rate (onboarding → first Genesis record) ≥ 80% in usability testing.
- Net Promoter Score from pilot institutions ≥ 40.

### 6.5 Launch Success Criteria (Go / No-Go for Mainnet)
1. Independent smart contract audit completed with all critical/high findings resolved.
2. Penetration test passed; no open critical/high vulnerabilities.
3. Legal review of privacy (GDPR/DPDP), AML, and evidentiary positioning completed.
4. At least 3 pilot institutions successfully complete the full flow (authenticate → transfer → verify) on testnet.
5. Verified end-to-end independent verification procedure (third party can validate provenance without Aureum's servers).
6. Disaster-recovery and key-compromise runbooks tested.

### 6.6 Principal Risks to Monitor (Blunt Assessment)
1. **Garbage-in, permanent-garbage-out:** Immutability preserves bad data as faithfully as good data. Mitigation: strict authenticator vetting, accountability, revocation visibility, and V2 physical binding.
2. **Cold-start / network effect:** Value depends on institutions adopting the standard; a chain with few records is of limited use. Mitigation: target a narrow pilot segment (e.g., one gallery network or regional auction house) and backfill with attested historical records.
3. **Privacy and confidentiality conflict:** The art market values discretion; public price and ownership data may deter adoption. Mitigation: FR-3.2 and FR-4.4.
4. **Regulatory and legal uncertainty:** On-chain records do not by themselves establish legal title; cross-border enforcement varies.
5. **Centralisation of trust:** The system trusts authenticators and admins, so "trust alone" is reduced, not eliminated. The product messaging should be accurate about this to avoid overclaiming.
6. **Key loss / compromise:** A lost collector wallet can strand ownership control. Mitigation: social recovery or institutional custodial option, planned for V2 and documented in MVP.
