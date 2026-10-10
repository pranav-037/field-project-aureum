# Data Model and API Specification
## Aureum: Artchain Provenance Trail

### 1. Introduction
This document specifies the data model and API for Aureum, a blockchain-based chain-of-custody platform for high-value artworks. It details the Prisma ORM schema used for indexing blockchain data and storing user/institution profiles, and provides a comprehensive specification of the RESTful API endpoints.

### 2. Data Model

The data model is implemented using Prisma ORM with a PostgreSQL database. It indexes data from the blockchain smart contracts for efficient querying and stores user/authentication data.

#### 2.1 Prisma Schema

```prisma
// Prisma schema for Aureum
// This schema is used to generate the Prisma Client and database migrations.

generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

enum InstitutionStatus {
  PENDING
  APPROVED
  REVOKED
}

enum UserRole {
  ADMIN
  AUTHENTICATOR
  VIEWER
}

enum ArtworkStatus {
  VERIFIED
  BROKEN
  UNVERIFIABLE
  DISPUTED
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

enum FlagType {
  DISPUTED
  REPORTED_STOLEN
  UNDER_REVIEW
}

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
  // Note: The Institution model stores basic profile info; detailed KYB documents are stored off-chain (IPFS) with hashes on-chain/admin-controlled storage.
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
  // Note: Password is hashed (bcrypt) before storage. walletAddress is the user's Ethereum/Polygon address for SIWE authentication.
}

model Artwork {
  id               String   @id @default(cuid())
  artworkId        String   @unique // On-chain unique ID (auto-increment from contract)
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
  // Note: 
  // - artworkId is the unique identifier from the smart contract (simple incrementing integer).
  // - documentCids and imageCids store IPFS CIDs (bytes32 format stored as string for simplicity; in practice bytes32).
  // - bindingReference is a description of how the physical artwork is linked to its digital identity.
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
  priceCommitment String? // Keccak256(salt, price) for non-PUBLIC; null for PUBLIC
  supportingDocCids String[]
  txHash        String
  blockNumber   Int
  status        TransferStatus @default(PENDING)
  createdAt     DateTime @default(now())
  updatedAt     DateTime @updatedAt
  // Note:
  // - buyerId is null for pending transfers (buyer not yet accepted); set upon acceptance.
  // - priceCommitment stores the commitment hash; plaintext price is stored encrypted off-chain (not in DB) when not PUBLIC.
  // - supportingDocCids stores IPFS CIDs of transfer-related documents (e.g., bill of sale).
  // - txHash and blockNumber reference the finalization transaction on-chain.
}

model Amendment {
  id            String   @id @default(cuid())
  artworkId     String
  artwork       Artwork @relation(fields: [artworkId], references: [id])
  issuerId      String
  issuer        Institution @relation(fields: [issuerId], references: [id])
  referencedBlock String // Could be transferId or genesis block reference; for simplicity, we store a string description or ID.
  reason        String
  createdAt     DateTime @default(now())
  // Note: 
  // - referencedBlock could be improved to reference a specific transfer or genesis by ID, but as a string it's flexible.
  // - Amendments are appended; original data remains unchanged in Artwork and related records.
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
  // Note: 
  // - Flagged artworks have transfers blocked while flag is active (resolvedAt is null).
  // - Multiple flags can exist on an artwork; each tracked separately.
}

model AuditLog {
  id            String   @id @default(cuid())
  actor         String   // Email or wallet address of the performer
  action        String   // Description of the action (e.g., "APPROVED_INSTITUTION", "CREATED_GENESIS")
  targetType    String   // "INSTITUTION", "ARTWORK", "TRANSFER", etc.
  targetId      String   // ID of the target (institutionId, artworkId, etc.)
  timestamp     DateTime @default(now())
  reason        String
  beforeState   Json     // Optional: JSON snapshot of state before change (for admin actions)
  afterState    Json     // Optional: JSON snapshot of state after change
  ipAddress     String?
  userAgent     String?
  // Note: 
  // - Audit logs are append-only and periodically hash-anchored to the blockchain for tamper evidence.
  // - beforeState/afterState are optional and may be large; consider storing only diffs or references in practice.
}
```

#### 2.2 Key Design Notes
- **Relationships**: 
  - An Institution can have many Artworks (via authenticator) and many Transfers (as intermediary or via users within institution).
  - A User belongs to at most one Institution (nullable for collector-only users).
  - An Artwork has one Authenticator (Institution) and one InitialOwner (User).
  - Transfers link Artwork to Seller (User), Buyer (User, nullable until accepted), and optional Intermediary (Institution).
  - Amendments and Flags link to Artwork and the issuing Institution/User.
- **Data Types**:
  - String fields use appropriate lengths; CIDs are stored as strings (hex representation of bytes32).
  - DateTime fields use Prisma's DateTime mapping to PostgreSQL TIMESTAMP.
  - Json type for audit log snapshots (PostgreSQL JSONB).
- **Indexes** (implicitly created by Prisma for @id, @unique, and relations; explicit indexes can be added via `@@index` if needed for query performance).
- **Constraints**: 
  - `@unique` on Institution.walletAddress, User.email, User.walletAddress, Artwork.artworkId.
  - Relations enforce referential integrity.
- **Off-Chain Data**: 
  - Full artwork metadata, certificates, images, and encrypted documents are stored in IPFS.
  - Only CIDs and SHA-256 hashes are stored on-chain and mirrored in this database for indexing.
  - Encrypted document decryption keys are never stored in this database; they are managed via user wallet encryption (public key cryptography).

### 3. API Specification

Aureum provides a RESTful API (versioned as `/v1`) for client applications (frontend, integrations) to interact with the platform. All API requests and responses are JSON. The API is secured via authentication middleware (JWT for institutions, SIWE for individuals).

#### 3.1 Common Patterns
- **Base URL**: `https://api.aureum.art` (example; environment-specific)
- **Versioning**: All endpoints are prefixed with `/api/v1`
- **Authentication**: 
  - Institutional endpoints: Require `Authorization: Bearer <jwt_token>` header.
  - Individual/wallet endpoints: Require `Authorization: Bearer <siwe_session_token>` or wallet signature in header (see specific endpoints).
  - Public endpoints (e.g., artwork verification): No authentication required.
- **Content-Type**: `application/json` for requests and responses.
- **Responses**: 
  - Success: HTTP 2xx with JSON body.
  - Client Error: HTTP 4xx with JSON error object.
  - Server Error: HTTP 5xx with JSON error object.
- **Error Object** (standard across API):
  ```json
  {
    "error": {
      "code": "ERROR_CODE",
      "message": "Human-readable error message",
      "details": {} // Optional: additional context
    }
  }
  ```
- **Pagination**: Endpoints returning lists support `page` (default 1) and `limit` (default 20, max 100) query parameters. Response includes `data` array and `pagination` object.
  ```json
  {
    "data": [...],
    "pagination": {
      "page": 1,
      "limit": 20,
      "totalPages": 5,
      "totalItems": 93
    }
  }
  ```
- **Filtering & Sorting**: List endpoints support filter and sort query parameters (specific to each endpoint).
- **Rate Limiting**: Public endpoints (verification, search) are rate-limited (e.g., 100 requests/minute per IP). Authenticated endpoints have higher limits.

#### 3.2 Authentication Endpoints

##### 3.2.1 Institutional Login
- **Endpoint**: `POST /api/v1/auth/institution/login`
- **Description**: Authenticate institution staff with email/password and TOTP.
- **Request Body**:
  ```json
  {
    "email": "user@example.com",
    "password": "securePassword123",
    "totpToken": "123456"
  }
  ```
- **Success Response** (HTTP 200):
  ```json
  {
    "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "refreshToken": "dGhpcyBpcyByZWZyZXNoIHRva2Vu...",
    "user": {
      "id": "usr_123",
      "email": "user@example.com",
      "role": "AUTHENTICATOR",
      "institution": {
        "id": "inst_456",
        "name": "Example Gallery",
        "status": "APPROVED"
      }
    }
  }
  ```
- **Errors**:
  - 400: Missing or invalid fields
  - 401: Invalid credentials or TOTP token
  - 429: Too many requests (rate limiting)
  - 500: Internal server error

##### 3.2.2 Refresh Token
- **Endpoint**: `POST /api/v1/auth/refresh`
- **Description**: Obtain a new access token using a refresh token.
- **Request Body**:
  ```json
  {
    "refreshToken": "dGhpcyBpcyByZWZyZXNoIHRva2Vu..."
  }
  ```
- **Success Response** (HTTP 200):
  ```json
  {
    "accessToken": "new_access_token_here",
    "refreshToken": "new_refresh_token_here" // Rotated refresh token
  }
  ```
- **Errors**:
  - 400: Missing refresh token
  - 401: Invalid or expired refresh token
  - 429: Too many requests

##### 3.2.3 Logout
- **Endpoint**: `POST /api/v1/auth/logout`
- **Description**: Invalidate the current access token and refresh token.
- **Headers**: `Authorization: Bearer <access_token>`
- **Success Response** (HTTP 200):
  ```json
  { "message": "Logged out successfully" }
  ```
- **Errors**:
  - 401: Invalid or missing token
  - 500: Internal server error

##### 3.2.4 Wallet Signature Challenge
- **Endpoint**: `POST /api/v1/auth/wallet/challenge`
- **Description**: Get a nonce for wallet signature authentication (SIWE).
- **Request Body**: None
- **Success Response** (HTTP 200):
  ```json
  {
    "nonce": "0x123456789abcdef",
    "expiry": "2026-10-08T12:00:00Z"
  }
  ```
- **Errors**:
  - 429: Too many requests
  - 500: Internal server error

##### 3.2.5 Wallet Signature Verify
- **Endpoint**: `POST /api/v1/auth/wallet/verify`
- **Description**: Verify a wallet signature and issue a session token.
- **Request Body**:
  ```json
  {
    "walletAddress": "0x742d35Cc6634C0532925a3b8D4C0532950532950",
    "signature": "0x1234...",
    "nonce": "0x123456789abcdef" // Must match the nonce from /challenge
  }
  ```
- **Success Response** (HTTP 200):
  ```json
  {
    "accessToken": "siwe_session_token_here",
    "user": {
      "id": "usr_789",
      "walletAddress": "0x742d35Cc6634C0532925a3b8D4C0532950532950",
      "role": "VIEWER"
    }
  }
  ```
- **Errors**:
  - 400: Missing fields
  - 401: Invalid signature, nonce mismatch, or expired nonce
  - 429: Too many requests

#### 3.3 Institution Management Endpoints
*Require institutional authentication (JWT) and appropriate role (ADMIN for most).*

##### 3.3.1 Register Institution
- **Endpoint**: `POST /api/v1/institutions/register`
- **Description**: Submit a new institution for approval.
- **Request Body**:
  ```json
  {
    "name": "Example Gallery",
    "jurisdiction": "New York, USA",
    "registrationNumber": "ART-12345-NY",
    "authorizedSignatories": ["0xSigner1...", "0xSigner2..."],
    "documents": [
      {
        "type": "CERTIFICATE_OF_INCORPORATION",
        "ipfsCid": "QmExampleCID1",
        "hash": "sha256:abcd1234..."
      },
      {
        "type": "ARTICLES_OF_ASSOCIATION",
        "ipfsCid": "QmExampleCID2",
        "hash": "sha256:efgh5678..."
      }
    ]
  }
  ```
  *Note: Documents are pre-uploaded to IPFS by the client; the API only stores references. The actual IPAUTHENTICATOR wallet address is not provided here; it is set during approval (see below).*
- **Success Response** (HTTP 201):
  ```json
  {
    "institution": {
      "id": "inst_abc",
      "name": "Example Gallery",
      "jurisdiction": "New York, USA",
      "registrationNumber": "ART-12345-NY",
      "status": "PENDING",
      "walletAddress": null, // Not set until approval
      "createdAt": "2026-10-08T10:00:00Z"
    }
  }
  ```
- **Errors**:
  - 400: Validation error (missing fields, invalid format)
  - 401: Unauthorized (no/invalid JWT)
  - 409: Institution with same registration number already exists
  - 429: Too many requests

##### 3.3.2 Get Institution Details
- **Endpoint**: `GET /api/v1/institutions/{id}`
- **Description**: Retrieve details of a specific institution.
- **Path Parameter**: `id` (Institution ID)
- **Success Response** (HTTP 200):
  ```json
  {
    "institution": {
      "id": "inst_abc",
      "name": "Example Gallery",
      "jurisdiction": "New York, USA",
      "registrationNumber": "ART-12345-NY",
      "status": "APPROVED",
      "walletAddress": "0xInstWallet...",
      "authorizedSignatories": ["0xSigner1...", "0xSigner2..."],
      "createdAt": "2026-10-08T10:00:00Z",
      "updatedAt": "2026-10-08T10:05:00Z",
      "adminUserId": "usr_admin",
      "admin": {
        "id": "usr_admin",
        "email": "admin@example.com",
        "role": "ADMIN"
      }
    }
  }
  ```
- **Errors**:
  - 401: Unauthorized
  - 404: Institution not found
  - 429: Too many requests

##### 3.3.3 Approve Institution (Admin)
- **Endpoint**: `PUT /api/v1/institutions/{id}/approve`
- **Description**: Approve a pending institution (sets wallet address and status to APPROVED).
- **Path Parameter**: `id` (Institution ID)
- **Request Body**:
  ```json
  {
    "walletAddress": "0xInstWallet...",
    "multisigApproval": {
      // Off-chain multisig data; contract verifies signatures before calling this endpoint.
      // For API simplicity, we assume the caller (admin) has collected required signatures off-chain.
      // In practice, this endpoint might be called by a middleware that validates multisig.
      "signatures": ["0xSig1...", "0xSig2..."],
      "safeAddress": "0xGnosisSafe..."
    }
  }
  ```
  *Note: The actual multisig verification happens in the smart contract; the API endpoint may simply forward the call to the contract via a backend service, or the backend may validate the multisig before allowing the contract call.*
- **Success Response** (HTTP 200):
  ```json
  {
    "institution": {
      "id": "inst_abc",
      "name": "Example Gallery",
      "status": "APPROVED",
      "walletAddress": "0xInstWallet...",
      "updatedAt": "2026-10-08T10:10:00Z"
    }
  }
  ```
- **Errors**:
  - 400: Invalid wallet address or missing multisig data
  - 401: Unauthorized (not ADMIN or not authenticated)
  - 403: Forbidden (insufficient privileges; requires ARTCHAIN_ADMIN role via multisig)
  - 404: Institution not found
  - 409: Institution already approved or revoked
  - 429: Too many requests
  - 500: Internal error (e.g., blockchain transaction failed)

##### 3.3.4 Revoke Institution (Admin)
- **Endpoint**: `PUT /api/v1/institutions/{id}/revoke`
- **Description**: Revoke an approved institution (blocks new writes).
- **Path Parameter**: `id` (Institution ID)
- **Request Body**:
  ```json
  {
    "reason": "Violation of authenticity standards",
    "multisigApproval": { /* similar to approve endpoint */ }
  }
  ```
- **Success Response** (HTTP 200):
  ```json
  {
    "institution": {
      "id": "inst_abc",
      "name": "Example Gallery",
      "status": "REVOKED",
      "walletAddress": "0xInstWallet...",
      "updatedAt": "2026-10-08T10:15:00Z"
    }
  }
  ```
- **Errors**:
  - 400: Missing reason
  - 401: Unauthorized
  - 403: Forbidden (requires multisig approval)
  - 404: Institution not found
  - 409: Institution already revoked
  - 429: Too many requests

##### 3.3.5 List Institutions (Admin)
- **Endpoint**: `GET /api/v1/institutions`
- **Description**: List institutions with filtering and pagination (admin only).
- **Query Parameters**:
  - `status`: PENDING, APPROVED, REVOKED
  - `page`: Integer (default 1)
  - `limit`: Integer (default 20)
  - `search`: String (search name or registration number)
- **Success Response** (HTTP 200):
  ```json
  {
    "institutions": [
      {
        "id": "inst_abc",
        "name": "Example Gallery",
        "status": "APPROVED",
        "walletAddress": "0xInstWallet...",
        "createdAt": "2026-10-08T10:00:00Z"
      }
      // ... more institutions
    ],
    "pagination": { /* as described in common patterns */ }
  }
  ```
- **Errors**:
  - 401: Unauthorized
  - 403: Forbidden (admin only)
  - 429: Too many requests

#### 3.4 Artwork Endpoints
*Require authentication for creation/modification; public for reading.*

##### 3.4.1 Create Artwork Draft
- **Endpoint**: `POST /api/v1/artworks`
- **Description**: Create a new artwork draft (off-chain, editable until submission).
- **Headers**: `Authorization: Bearer <jwt_token>` (institution) or `Authorization: Bearer <siwe_token>` (individual via wallet? Per PRD, only institutions can create Genesis, so draft creation likely institution-only. We'll restrict to institution AUTHENTICATOR role.)
- **Request Body**:
  ```json
  {
    "title": "Starry Night",
    "artist": "Vincent van Gogh",
    "year": "1889",
    "medium": "Oil on canvas",
    "dimensions": "73.7 cm × 92.1 cm",
    "edition": null,
    "authenticationMethod": "Catalogue raisonné match",
    "bindingReference": "Unique label affixed to verso with inventory number VG-1889-001",
    "documents": [
      {
        "type": "CERTIFICATE_OF_AUTHENTICITY",
        "ipfsCid": "QmDoc1...",
        "hash": "sha256:abcd1234...",
        "visibility": "PUBLIC"
      },
      {
        "type": "INVOICE",
        "ipfsCid": "QmDoc2...",
        "hash": "sha256:efgh5678...",
        "visibility": "RESTRICTED",
        "encryptedKey": "0xEncryptedKeyForBuyer..." // Encrypted with buyer's public key; only needed if visibility RESTRICTED
      }
    ],
    "images": [
      {
        "description": "Full front",
        "ipfsCid": "QmImg1...",
        "hash": "sha256:11112222..."
      },
      {
        "description": "Signature detail",
        "ipfsCid": "QmImg2...",
        "hash": "sha256:33334444..."
      }
    ]
  }
  ```
  *Note: 
  - Documents and images must be uploaded to IPFS by the client before this call; the API stores references.
  - For RESTRICTED documents, the client must encrypt the document and share the decryption key with intended parties (off-chain); the API does not handle encryption.
  - The `encryptedKey` field is optional and only relevant if the document is RESTRICTED and the client wishes to store a wrapped key for later retrieval (not recommended; better handled off-chain).*
- **Success Response** (HTTP 201):
  ```json
  {
    "artwork": {
      "id": "art_123",
      "title": "Starry Night",
      "artist": "Vincent van Gogh",
      "medium": "Oil on canvas",
      "status": "DRAFT", // Not yet submitted to chain
      "createdAt": "2026-10-08T10:20:00Z",
      "updatedAt": "2026-10-08T10:20:00Z"
    }
  }
  ```
- **Errors**:
  - 400: Validation error (missing required fields, invalid document/image counts)
  - 401: Unauthorized
  - 403: Forbidden (requires AUTHENTICATOR role)
  - 429: Too many requests

##### 3.4.2 Get Artwork Details
- **Endpoint**: `GET /api/v1/artworks/{id}` or `GET /api/v1/artworks/by-artwork-id/{artworkId}`
- **Description**: Retrieve artwork details by internal ID or on-chain artworkId.
- **Path Parameter**: `id` (internal UUID) or `artworkId` (on-chain ID)
- **Success Response** (HTTP 200):
  ```json
  {
    "artwork": {
      "id": "art_123",
      "artworkId": 1001,
      "title": "Starry Night",
      "artist": "Vincent van Gogh",
      "year": "1889",
      "medium": "Oil on canvas",
      "dimensions": "73.7 cm × 92.1 cm",
      "edition": null,
      "authenticationMethod": "Catalogue raisonné match",
      "authenticator": {
        "id": "inst_abc",
        "name": "Example Gallery",
        "status": "APPROVED",
        "walletAddress": "0xInstWallet..."
      },
      "initialOwner": {
        "id": "usr_owner",
        "walletAddress": "0xOwnerWallet...",
        // email etc. omitted for privacy if not authenticated
      },
      "genesisTimestamp": "2026-10-08T10:25:00Z",
      "genesisTxHash": "0xTxHashGenesis...",
      "metadataCid": "QmMetadata...",
      "documentCids": ["QmDoc1...", "QmDoc2..."],
      "imageCids": ["QmImg1...", "QmImg2..."],
      "bindingReference": "Unique label affixed to verso with inventory number VG-1889-001",
      "status": "VERIFIED",
      "createdAt": "2026-10-08T10:20:00Z",
      "updatedAt": "2026-10-08T10:25:00Z",
      "transfers": [ /* array of transfer objects, see below */ ],
      "amendments": [],
      "flags": []
    }
  }
  ```
- **Errors**:
  - 400: Invalid ID format
  - 404: Artwork not found
  - 429: Too many requests

##### 3.4.3 Update Artwork Draft
- **Endpoint**: `PUT /api/v1/artworks/{id}`
- **Description**: Update an existing artwork draft (only if not yet submitted for Genesis).
- **Headers**: `Authorization: Bearer <jwt_token>` (AUTHENTICATOR role)
- **Path Parameter**: `id` (artwork internal ID)
- **Request Body**: Same as create artwork draft (full replace)
- **Success Response** (HTTP 200):
  ```json
  {
    "artwork": {
      "id": "art_123",
      "title": "Starry Night (Updated Title)",
      // ... other updated fields
      "updatedAt": "2026-10-08T10:30:00Z"
    }
  }
  ```
- **Errors**:
  - 400: Validation error
  - 401: Unauthorized
  - 403: Forbidden (not AUTHENTICATOR or not owner of draft)
  - 409: Conflict (artwork already submitted; cannot update)
  - 429: Too many requests

##### 3.4.4 Submit Artwork for Genesis Record
- **Endpoint**: `POST /api/v1/artworks/{id}/submit`
- **Description**: Submit the artwork draft for on-chain Genesis record creation.
- **Headers**: `Authorization: Bearer <jwt_token>` (AUTHENTICATOR role)
- **Path Parameter**: `id` (artwork internal ID)
- **Request Body**:
  ```json
  {
    // No additional data needed; uses the artwork's current draft data.
    // Optionally, could include a wallet signature from the institution's approved signer.
    "walletSignature": "0xSig..." // Signature of the institution's approved signer wallet
  }
  ```
  *Note: 
  - The backend verifies the wallet signature against the institution's authenticated wallet address (from approval).
  - If valid, the backend triggers a smart contract call to createGenesisRecord with the artwork's data.
  - On success, the artwork's status changes from DRAFT to VERIFIED (assuming verification passed off-chain), and blockchain IDs are set.*
- **Success Response** (HTTP 200):
  ```json
  {
    "artwork": {
      "id": "art_123",
      "artworkId": 1001,
      "status": "VERIFIED",
      "genesisTxHash": "0xTxHashGenesis...",
      "metadataCid": "QmMetadata...",
      // ... other fields populated from blockchain
      "updatedAt": "2026-10-08T10:35:00Z"
    },
    "transaction": {
      "txHash": "0xTxHashGenesis...",
      "blockNumber": 12345678,
      "status": "PENDING_CONFIRMATION" // or CONFIRMED/FINALIZED based on confirmation depth
    }
  }
  ```
- **Errors**:
  - 400: Artwork not in DRAFT state
  - 401: Unauthorized
  - 403: Forbidden (not AUTHENTICATOR of this artwork)
  - 409: Conflict (already submitted or invalid state)
  - 422: Unprocessable Entity (validation failed on-chain, e.g., duplicate detected by contract)
  - 429: Too many requests
  - 500: Internal error (blockchain call failed)

##### 3.4.5 Search Artworks
- **Endpoint**: `GET /api/v1/artworks`
- **Description**: Search artworks with filters, sorting, and pagination (public endpoint).
- **Query Parameters**:
  - `title`: String (partial match)
  - `artist`: String (partial match)
  - `artworkId`: Integer (exact match)
  - `authenticatorId`: Institution ID
  - `ownerId`: User ID (current owner)
  - `minYear`, `maxYear`: String (for year filtering)
  - `medium`: String
  - `status`: ArtworkStatus (VERIFIED, BROKEN, etc.)
  - `page`: Integer (default 1)
  - `limit`: Integer (default 20, max 100)
  - `sortBy`: Field name (e.g., "createdAt", "title")
  - `sortOrder`: asc or desc (default desc)
- **Success Response** (HTTP 200):
  ```json
  {
    "artworks": [
      {
        "id": "art_123",
        "artworkId": 1001,
        "title": "Starry Night",
        "artist": "Vincent van Gogh",
        "medium": "Oil on canvas",
        "authenticator": { "id": "inst_abc", "name": "Example Gallery", "status": "APPROVED" },
        "currentOwner": { "id": "usr_owner", "walletAddress": "0xOwnerWallet..." },
        "genesisTimestamp": "2026-10-08T10:25:00Z",
        "status": "VERIFIED"
      }
      // ... more artworks
    ],
    "pagination": { /* as described */ }
  }
  ```
- **Errors**:
  - 400: Invalid query parameters
  - 429: Too many requests (rate limited for public endpoint)

#### 3.5 Transfer Endpoints
*Require authentication for initiation/acceptance; public for reading.*

##### 3.5.1 Initiate Transfer
- **Endpoint**: `POST /api/v1/transfers`
- **Description**: Initiate an ownership transfer (seller signs transaction).
- **Headers**: `Authorization: Bearer <jwt_token>` (institution) or `Authorization: Bearer <siwe_token>` (individual seller)
- **Request Body**:
  ```json
  {
    "artworkId": 1001, // on-chain artwork ID
    "buyerWalletAddress": "0xBuyerWallet...",
    "intermediaryInstitutionId": null, // or "inst_def" if brokered
    "transferDate": "2026-10-08T10:40:00Z", // ISO string; defaults to now if omitted
    "priceVisibility": "PARTIES_AND_AUTHORISED", // PUBLIC, PARTIES_AND_AUTHORISED, HIDDEN
    "price": 5000000, // in USD cents or wei? We'll use USD cents for clarity; actual value handled off-chain.
    "supportingDocuments": [
      {
        "type": "BILL_OF_SALE",
        "ipfsCid": "QmDocSale...",
        "hash": "sha256:sale123..."
      }
    ]
  }
  ```
  *Note: 
  - The buyerWalletAddress must be a valid Ethereum address.
  - For brokered transfers, intermediaryInstitutionId must be an APPROVED institution.
  - Price is provided in plaintext here; the backend will:
      - If PUBLIC: store priceCommitment as null (or zero) and possibly store price in plaintext off-chain? Per PRD, PUBLIC price is stored plaintext on-chain? Actually PRD says: "For non-public options, the chain stores only a salted hash commitment of the price; the plaintext is held encrypted off-chain." For PUBLIC, plaintext may be stored on-chain or off-chain; we'll store commitment as null and handle plaintext in off-chain storage if needed for reporting.
      - If PARTIES_AND_AUTHORISED or HIDDEN: generate a random salt, compute commitment = keccak256(abi.encodePacked(salt, price)), store commitment on-chain, and encrypt the price off-chain (to be shared with parties).
  - The backend validates that the seller is the current owner of the artwork.
  - Upon validation, the backend calls the smart contract initiateTransfer function with the appropriate parameters (including wallet signature from seller).*
- **Success Response** (HTTP 201):
  ```json
  {
    "transfer": {
      "id": "trans_456",
      "artworkId": 1001,
      "seller": { "id": "usr_seller", "walletAddress": "0xSellerWallet..." },
      "buyer": null, // pending acceptance
      "intermediary": null,
      "transferDate": "2026-10-08T10:40:00Z",
      "priceVisibility": "PARTIES_AND_AUTHORISED",
      "priceCommitment": "0xCommimentHash...", // hex string
      "supportingDocCids": ["QmDocSale..."],
      "status": "PENDING",
      "createdAt": "2026-10-08T10:40:00Z"
    },
    "transaction": {
      "txHash": "0xInitTxHash...",
      "blockNumber": 12345679,
      "status": "PENDING_CONFIRMATION"
    }
  }
  ```
- **Errors**:
  - 400: Validation error (invalid artworkId, buyer address, etc.)
  - 401: Unauthorized
  - 403: Forbidden (seller not authenticated or not current owner)
  - 409: Conflict (artwork already has pending transfer, or in DISPUTED status)
  - 422: Unprocessable Entity (on-chain validation failed, e.g., intermediary not authenticated)
  - 429: Too many requests
  - 500: Internal error

##### 3.5.2 Accept Transfer
- **Endpoint**: `POST /api/v1/transfers/{id}/accept`
- **Description**: Buyer accepts a pending transfer.
- **Headers**: `Authorization: Bearer <siwe_token>` (buyer's wallet signature)
- **Path Parameter**: `id` (transfer internal ID)
- **Request Body**:
  ```json
  {
    "walletSignature": "0xBuyerSig..." // Signature of buyer's wallet
  }
  ```
  *Note: 
  - The backend verifies the signature against the buyerWalletAddress stored in the transfer.
  - If valid and not expired, the backend calls the smart contract acceptTransfer function.
  - On success, the transfer status changes to FINALIZED, and the artwork's current owner updates.*
- **Success Response** (HTTP 200):
  ```json
  {
    "transfer": {
      "id": "trans_456",
      "artworkId": 1001,
      "seller": { "id": "usr_seller", "walletAddress": "0xSellerWallet..." },
      "buyer": { "id": "usr_buyer", "walletAddress": "0xBuyerWallet..." },
      "status": "FINALIZED",
      "finalizedAt": "2026-10-08T10:45:00Z",
      "txHash": "0xFinalTxHash...",
      "blockNumber": 12345680
    }
  }
  ```
- **Errors**:
  - 400: Invalid signature or missing fields
  - 401: Unauthorized
  - 403: Forbidden (not the intended buyer)
  - 404: Transfer not found
  - 409: Conflict (transfer not PENDING, or already expired/cancelled)
  - 422: Unprocessable Entity (on-chain validation failed, e.g., transfer expired)
  - 429: Too many requests
  - 500: Internal error

##### 3.5.3 Get Transfer Details
- **Endpoint**: `GET /api/v1/transfers/{id}`
- **Description**: Retrieve transfer details by ID (public endpoint? Transfers may contain sensitive price info; we'll make it public but hide price details based on visibility and requester auth.)
  - Actually, per PRD, price visibility controls apply. We'll return transfer data but omit or encrypt priceCommitment/plaintext based on visibility and authentication.
  - For simplicity in this spec, we'll return all data but note that the client should interpret priceVisibility and handle accordingly. The API does not enforce price-based filtering here; that's done in verification/report endpoints.
- **Path Parameter**: `id` (transfer internal ID)
- **Success Response** (HTTP 200):
  ```json
  {
    "transfer": {
      "id": "trans_456",
      "artworkId": 1001,
      "artwork": { /* artwork summary */ },
      "seller": { "id": "usr_seller", "walletAddress": "0xSellerWallet..." },
      "buyer": { "id": "usr_buyer", "walletAddress": "0xBuyerWallet..." },
      "intermediary": null,
      "transferDate": "2026-10-08T10:40:00Z",
      "priceVisibility": "PARTIES_AND_AUTHORISED",
      "priceCommitment": "0xCommimentHash...",
      "supportingDocCids": ["QmDocSale..."],
      "status": "FINALIZED",
      "finalizedAt": "2026-10-08T10:45:00Z",
      "txHash": "0xFinalTxHash...",
      "blockNumber": 12345680,
      "createdAt": "2026-10-08T10:40:00Z"
    }
  }
  ```
- **Errors**:
  - 400: Invalid ID format
  - 404: Transfer not found
  - 429: Too many requests

##### 3.5.4 List Transfers
- **Endpoint**: `GET /api/v1/transfers`
- **Description**: List transfers with filtering, sorting, pagination (requires authentication; filters may hide sensitive data).
- **Query Parameters**:
  - `artworkId`: Integer
  - `sellerId`: User ID
  - `buyerId`: User ID
  - `status`: TransferStatus
  - `minDate`, `maxDate`: ISO date strings
  - `page`, `limit`, `sortBy`, `sortOrder`: as common
- **Success Response** (HTTP 200):
  ```json
  {
    "transfers": [
      {
        "id": "trans_456",
        "artworkId": 1001,
        "seller": { "id": "usr_seller", "walletAddress": "0xSellerWallet..." },
        "buyer": { "id": "usr_buyer", "walletAddress": "0xBuyerWallet..." },
        "status": "FINALIZED",
        "transferDate": "2026-10-08T10:40:00Z",
        "priceVisibility": "PARTIES_AND_AUTHORISED"
        // priceCommitment omitted for brevity in list view; could be included
      }
      // ... more transfers
    ],
    "pagination": { /* as described */ }
  }
  ```
- **Errors**:
  - 401: Unauthorized
  - 403: Forbidden (if filters attempt to access restricted data without proper role)
  - 429: Too many requests

##### 3.5.5 Cancel Transfer
- **Endpoint**: `DELETE /api/v1/transfers/{id}`
- **Description**: Cancel a pending transfer (seller or admin action).
- **Headers**: `Authorization: Bearer <jwt_token>` (institution) or `Authorization: Bearer <siwe_token>` (individual seller)
- **Path Parameter**: `id` (transfer internal ID)
- **Query Parameters**:
  - `reason`: String (optional, for audit)
- **Success Response** (HTTP 200):
  ```json
  {
    "transfer": {
      "id": "trans_456",
      "status": "CANCELLED",
      "cancelledAt": "2026-10-08T10:50:00Z"
    }
  }
  ```
- **Errors**:
  - 400: Invalid ID
  - 401: Unauthorized
  - 403: Forbidden (not seller or not authorized admin)
  - 404: Transfer not found
  - 409: Conflict (transfer not PENDING)
  - 429: Too many requests
  - 500: Internal error

#### 3.6 Verification Endpoints
*Public endpoints for provenance verification and reporting.*

##### 3.6.1 Get Provenance and Integrity Status
- **Endpoint**: `GET /api/v1/verify/{artworkId}`
- **Description**: Get full provenance chain and integrity status for an artwork by on-chain ID.
- **Path Parameter**: `artworkId` (on-chain artwork ID)
- **Success Response** (HTTP 200):
  ```json
  {
    "artworkId": 1001,
    "artwork": {
      "title": "Starry Night",
      "artist": "Vincent van Gogh",
      "medium": "Oil on canvas",
      "authenticator": {
        "id": "inst_abc",
        "name": "Example Gallery",
        "status": "APPROVED",
        "walletAddress": "0xInstWallet..."
      },
      "genesis": {
        "timestamp": "2026-10-08T10:25:00Z",
        "txHash": "0xTxHashGenesis...",
        "metadataCid": "QmMetadata...",
        "documentCids": ["QmDoc1...", "QmDoc2..."],
        "imageCids": ["QmImg1...", "QmImg2..."],
        "bindingReference": "Unique label affixed to verso with inventory number VG-1889-001"
      }
    },
    "chain": [
      {
        "type": "GENESIS",
        "timestamp": "2026-10-08T10:25:00Z",
        "txHash": "0xTxHashGenesis...",
        "owner": {
          "id": "usr_initial",
          "walletAddress": "0xInitialOwnerWallet..."
          // institutional details if applicable
        }
      },
      {
        "type": "TRANSFER",
        "transferId": "trans_456",
        "timestamp": "2026-10-08T10:45:00Z",
        "txHash": "0xFinalTxHash...",
        "from": {
          "id": "usr_initial",
          "walletAddress": "0xInitialOwnerWallet..."
        },
        "to": {
          "id": "usr_owner",
          "walletAddress": "0xOwnerWallet..."
        },
        "intermediary": null,
        "priceVisibility": "PARTIES_AND_AUTHORISED",
        "priceCommitment": "0xCommimentHash...",
        "supportingDocCids": ["QmDocSale..."]
      }
      // ... more transfers in chronological order
    ],
    "integrityStatus": "VERIFIED", // VERIFIED, BROKEN, UNVERIFIABLE
    "integrityDetails": {
      // Details of any verification failures
      "documentMismatches": [], // empty if all match
      "chainGaps": false,
      "pendingTransfers": [] // list of transfer IDs that are PENDING (UNVERIFIABLE if any)
    },
    "verificationInstructions": {
      "description": "Anyone can independently verify this provenance using only public blockchain data and IPFS gateways.",
      "steps": [
        "1. Retrieve the Genesis record from the ArtchainRegistry contract at address 0xContract... using artworkId 1001.",
        "2. Verify the metadataCid and documentCids/imageCids match IPFS content via a public gateway (e.g., https://gateway.ipfs.io/ipfs/<cid>).",
        "3. For each transfer in chronological order, verify the TransferInitiated and TransferFinalized events match the recorded seller, buyer, and timestamp.",
        "4. Ensure the chain is linear with no gaps (each transfer's seller matches the previous owner).",
        "5. Check that no transfer is in PENDING state without buyer acceptance (would indicate UNVERIFIABLE)."
      ],
      "resources": {
        "contractAddress": "0xArtchainRegistry...",
        "explorerUrl": "https://polygonscan.com/address/0xArtchainRegistry..."
      }
    }
  }
  ```
  *Note: 
  - The integrityStatus is computed by comparing on-chain data (from contract events or direct calls) with off-chain data (IPFS content hashes).
  - integrityDetails provides specifics on any mismatches.
  - verificationInstructions enables independent verification without relying on Aureum's servers.*
- **Errors**:
  - 400: Invalid artworkId
  - 404: Artwork not found
  - 429: Too many requests (rate limited)

##### 3.6.2 Generate Provenance Report
- **Endpoint**: `GET /api/v1/verify/{artworkId}/report`
- **Description**: Generate a PDF or JSON report of the artwork's provenance.
- **Path Parameter**: `artworkId` (on-chain artwork ID)
- **Query Parameters**:
  - `format`: pdf or json (default json)
  - `includeRestricted`: boolean (default false; only effective if requester has decryption rights)
- **Headers**: 
  - For JSON: Accept: application/json
  - For PDF: Accept: application/pdf
  - Authentication: Optional; if the requester wishes to include restricted documents, they must provide a valid SIWE token or JWT and have decryption rights.
    - We'll use a custom header `X-Aureum-Decryption-Key`: `<base64 encrypted key>` for each restricted document, or rely on the backend to look up the requester's wallets and verify they have been granted access via the off-chain key management system (out of scope for API spec; assume backend handles via user ID).*
- **Success Response** (HTTP 200):
  - For JSON:
    ```json
    {
      "reportId": "rep_789",
      "artworkId": 1001,
      "generatedAt": "2026-10-08T11:00:00Z",
      "genesis": { /* as in verification endpoint */ },
      "chain": [ /* as in verification endpoint */ ],
      "integrityStatus": "VERIFIED",
      "verificationQR": "https://verify.aureum.art/1001", // URL that redirects to verification endpoint
      // Note: Restricted documents are omitted unless includeRestricted=true and requester authorized.
    }
    ```
  - For PDF: Binary PDF content with appropriate headers.
- **Errors**:
  - 400: Invalid parameters
  - 401: Unauthorized (if attempting to access restricted data without rights)
  - 403: Forbidden (insufficient rights for restricted data)
  - 404: Artwork not found
  - 429: Too many requests
  - 500: Internal error

##### 3.6.3 Lookup by QR Code
- **Endpoint**: `GET /api/v1/verify/qr/{qrCode}`
- **Description**: Lookup artwork by QR code value (which encodes the artworkId or a short ID).
- **Path Parameter**: `qrCode` (string; could be the artworkId or a hash)
- **Success Response** (HTTP 200):
  ```json
  {
    // Same as GET /api/v1/verify/{artworkId} but using the resolved artworkId from QR
    "artworkId": 1001,
    "artwork": { /* ... */ },
    "chain": [ /* ... */ ],
    "integrityStatus": "VERIFIED",
    ... 
  }
  ```
  *Note: The QR code could encode a short ID that maps to the artworkId via a backend lookup, or directly encode the artworkId. We'll assume direct encoding for simplicity.*
- **Errors**:
  - 400: Invalid QR code format
  - 404: Artwork not found for given QR code
  - 429: Too many requests

#### 3.7 Admin Endpoints
*Require institutional authentication and ARTCHAIN_ADMIN role (with multisig approval enforced off-chain).*

##### 3.7.1 Create Flag
- **Endpoint**: `POST /api/v1/admin/flags`
- **Description**: Create a dispute or stolen artwork flag.
- **Headers**: `Authorization: Bearer <jwt_token>` (institution) or `Authorization: Bearer <siwe_token>` (individual)
- **Request Body**:
  ```json
  {
    "artworkId": 1001,
    "type": "DISPUTED", // DISPUTED, REPORTED_STOLEN, UNDER_REVIEW
    "reason": "Certificate of authenticity disputed by expert",
    "evidenceRef": "Case number ART-2026-999"
  }
  ```
  *Note: 
  - The backend validates that the requester is authorized to flag (current owner, authenticator, or authenticated institution).
  - If valid, the backend calls the smart contract flagArtwork function with the requester's wallet signature.*
- **Success Response** (HTTP 201):
  ```json
  {
    "flag": {
      "id": "flag_123",
      "artworkId": 1001,
      "flagger": { "id": "usr_flagger", "walletAddress": "0xFlaggerWallet..." },
      "type": "DISPUTED",
      "reason": "Certificate of authenticity disputed by expert",
      "evidenceRef": "Case number ART-2026-999",
      "createdAt": "2026-10-08T11:05:00Z",
      "status": "ACTIVE" // resolvedAt is null
    }
  }
  ```
- **Errors**:
  - 400: Validation error
  - 401: Unauthorized
  - 403: Forbidden (not authorized to flag)
  - 404: Artwork not found
  - 422: Unprocessable Entity (on-chain validation failed, e.g., flagger not authorized)
  - 429: Too many requests
  - 500: Internal error

##### 3.7.2 Resolve Flag
- **Endpoint**: `PUT /api/v1/admin/flags/{id}/resolve`
- **Description**: Resolve an active flag.
- **Headers**: `Authorization: Bearer <jwt_token>` (institution) or `Authorization: Bearer <siwe_token>` (individual)
- **Path Parameter**: `id` (flag internal ID)
- **Request Body**:
  ```json
  {
    "reason": "Expert review confirmed certificate is valid",
    "multisigApproval": { /* if resolving via admin multisig */ }
  }
  ```
  *Note: 
  - The backend validates that the requester is authorized to resolve (flag original owner, authenticator, any authenticated institution, or admin with multisig).
  - If valid, the backend calls the smart contract resolveFlag function.*
- **Success Response** (HTTP 200):
  ```json
  {
    "flag": {
      "id": "flag_123",
      "artworkId": 1001,
      "resolvedAt": "2026-10-08T11:10:00Z",
      "resolutionReason": "Expert review confirmed certificate is valid"
    }
  }
  ```
- **Errors**:
  - 400: Missing reason
  - 401: Unauthorized
  - 403: Forbidden (not authorized to resolve)
  - 404: Flag not found
  - 409: Conflict (flag already resolved)
  - 422: Unprocessable Entity (on-chain validation failed)
  - 429: Too many requests
  - 500: Internal error

##### 3.7.3 Get Audit Logs
- **Endpoint**: `GET /api/v1/admin/audit-log`
- **Description**: Retrieve audit logs with filtering and pagination (admin only).
- **Query Parameters**:
  - `actor`: String (email or wallet address)
  - `action`: String (e.g., "APPROVED_INSTITUTION")
  - `targetType`: String
  - `targetId`: String
  - `minDate`, `maxDate`: ISO date strings
  - `page`, `limit`, `sortBy`, `sortOrder`: as common
- **Success Response** (HTTP 200):
  ```json
  {
    "auditLogs": [
      {
        "id": "log_456",
        "actor": "admin@example.com",
        "action": "APPROVED_INSTITUTION",
        "targetType": "INSTITUTION",
        "targetId": "inst_abc",
        "timestamp": "2026-10-08T10:10:00Z",
        "reason": "Met all KYB and authenticity standards",
        "beforeState": { "status": "PENDING" },
        "afterState": { "status": "APPROVED", "walletAddress": "0xInstWallet..." },
        "ipAddress": "203.0.113.1",
        "userAgent": "Mozilla/5.0 ..."
      }
      // ... more logs
    ],
    "pagination": { /* as described */ }
  }
  ```
- **Errors**:
  - 401: Unauthorized
  - 403: Forbidden (admin only)
  - 429: Too many requests

##### 3.7.4 Multisig Approval (Placeholder)
*Note: Actual multisig approval happens off-chain; the API endpoint may be used to submit a transaction that includes multisig signatures, which the contract verifies.*
- **Endpoint**: `POST /api/v1/admin/multisig/approve`
- **Description**: Submit a multisig-approved action (e.g., institution approval, contract pause).
- **Headers**: `Authorization: Bearer <jwt_token>` (must be ARTCHAIN_ADMIN role; the backend validates the caller has collected sufficient signatures off-chain)
- **Request Body**:
  ```json
  {
    "action": "APPROVE_INSTITUTION",
    "targetId": "inst_abc",
    "data": { /* action-specific data */ },
    "multisigData": {
      "signatures": ["0xSig1...", "0xSig2...", "0xSig3..."],
      "safeAddress": "0xGnosisSafe..."
    }
  }
  ```
- **Success Response** (HTTP 200):
  ```json
  {
    "transaction": {
      "txHash": "0xMultisigTx...",
      "blockNumber": 12345681,
      "status": "SUCCESS"
    }
  }
  ```
- **Errors**:
  - 400: Invalid data
  - 401: Unauthorized
  - 403: Forbidden (not ARTCHAIN_ADMIN or insufficient signatures)
  - 422: Unprocessable Entity (contract rejected multisig)
  - 429: Too many requests

### 4. Error Handling
All endpoints return consistent error objects:
```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Validation failed: email is required",
    "details": {
      "field": "email",
      "rule": "required"
    }
  }
}
```
Common error codes:
- `VALIDATION_ERROR`: Request body/query parameters failed validation
- `AUTHENTICATION_ERROR`: Missing or invalid authentication
- `AUTHORIZATION_ERROR`: Authenticated user lacks required permissions
- `RESOURCE_NOT_FOUND`: Requested resource does not exist
- `RESOURCE_CONFLICT`: Request conflicts with current state (e.g., duplicate)
- `UNPROCESSABLE_ENTITY`: Semantic errors or on-chain validation failures
- `RATE_LIMIT_EXCEEDED`: Too many requests
- `INTERNAL_ERROR`: Unexpected server error
- `SERVICE_UNAVAILABLE`: Temporary outage (e.g., blockchain node down)

### 5. Versioning and Deprecation
- **Versioning**: API version is in the path (`/api/v1/`). Breaking changes increment the version.
- **Deprecation Policy**: 
  - Deprecated endpoints are marked in documentation and return a `Warning` header.
  - Deprecated endpoints remain functional for at least 6 months after deprecation notice.
  - Migration guides are provided for breaking changes.

### 6. Security Considerations
- **Authentication**: All sensitive endpoints require authentication (JWT or SIWE).
- **Authorization**: Role-based access control enforced at the API level.
- **Input Validation**: All inputs validated using schema-based validation (e.g., Joi, class-validator).
- **Output Encoding**: JSON responses are properly encoded; no HTML/JavaScript injection risk.
- **Rate Limiting**: Public endpoints (verification, search) are rate-limited to prevent abuse.
- **HTTPS**: All API traffic must be encrypted via TLS 1.2+.
- **Headers**: Security headers implemented (X-Content-Type-Options, X-Frame-Options, etc.).
- **Secrets Management**: API keys, database credentials, and signing keys stored in environment variables or secret managers.

### 7. Performance Considerations
- **Indexing**: Database indexes on frequently queried fields (artworkId, status, dates, etc.).
- **Caching**: 
  - Frequently accessed artwork verification data cached (short TTL, e.g., 30s) to reduce blockchain reads.
  - Static assets served via CDN.
- **Pagination**: Large result sets paginated to prevent excessive payloads.
- **Timeouts**: API enforces request timeouts; backend services have circuit breakers for external dependencies (IPFS, blockchain nodes).
- **Async Processing**: Non-critical operations (e.g., event indexing, email notifications) processed asynchronously via message queues.

---
*Document Version: 1.0*
*Last Updated: 2026-10-08*
*Next Review: 2027-04-08 (6 months)*