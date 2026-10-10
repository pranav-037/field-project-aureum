# Smart Contract Specification
## Aureum: Artchain Provenance Trail

### 1. Overview
This document specifies the smart contracts for Aureum, a blockchain-based chain-of-custody platform for high-value artworks. The contracts implement core functionality including artwork registration (Genesis records), ownership transfers, amendments, dispute flags, institutional management, and access control. Deployment targets Polygon (Mumbai testnet for MVP, Mainnet post-audit).

### 2. Contracts Inventory
Aureum consists of the following smart contracts:

1. **ArtchainRegistry.sol** - Main registry contract handling artwork lifecycle
2. **AccessControlExtension.sol** - Extends OpenZeppelin AccessControl with role management and multi-signature requirements
3. **PausableExtension.sol** - Optional emergency pause functionality for transfers (reads remain available)
4. **Interfaces.sol** - Interface definitions for external взаимодействия (if needed)
5. **Library contracts** (optional): 
   - `HashLib.sol` - Utility functions for SHA256, keccak256, etc.
   - `StringLib.sol` - String manipulation utilities

All contracts are written in Solidity ^0.8.19 and use OpenZeppelin Contracts v5.0.0 as a base.

### 3. Architectural Decisions

#### 3.1 Immutability vs Upgradeability
- **MVP**: Non-upgradeable contracts for simplicity, auditability, and to avoid governance complexity.
- **Future (V2)**: Consider Transparent Proxy pattern with timelocked multisig governance if upgradeability becomes necessary.

#### 3.2 Data Storage Strategy
- **On-chain storage minimal**: Only essential identifiers, hashes, timestamps, addresses, and role mappings.
- **Off-chain storage**: Full artwork metadata, certificates, images via IPFS; content identifiers (CIDs) and SHA-256 hashes stored on-chain for integrity.
- **Event sourcing**: All state changes emit events for off-chain indexing and verification.

#### 3.3 Access Control Model
- **Roles** (via AccessControl):
  - `DEFAULT_ADMIN_ROLE` - Full contract administration (limited use)
  - `ARTCHAIN_ADMIN` - Institutional management (approve/revoke institutions, multisig authorizations)
  - `AUTHENTICATOR` - Approved institutions able to create Genesis records and amendments
  - `PAUSER_ROLE` - Ability to pause/unpause transfers (if PausableExtension used)
  - `USER` - Implicit role for any address (no explicit grant needed for read functions)
- **Multi-signature requirements**: Sensitive operations (institution approval/revocation, flag overrides, contract pauses) require validation via off-chain multisig signatures (e.g., Gnosis Safe) checked by the contract.

#### 3.4 Two-Party Consent for Transfers
- Transfer initiation: seller (current owner) signs transaction
- Transfer finalization: buyer signs separate transaction to accept
- Pending transfers expire after configurable timeout (default 14 days) if buyer does not accept.

### 4. ArtchainRegistry.sol Specification

#### 4.1 State Variables
```solidity
// ==== Identifiers ====
uint256 public constant _ARTWORK_ID_START = 1; // Starting artwork ID
uint256 private _artworkIdCounter; // Auto-incrementing artwork ID

// ==== Artwork Data ====
struct Artwork {
    uint256 id; // Unique artwork identifier
    address authenticator; // Institution that created Genesis
    address initialOwner; // Owner at Genesis (wallet address of user or institution admin)
    bytes32 metadataCid; // IPFS CID of metadata JSON
    bytes32[] documentCids; // IPFS CIDs of supporting documents
    bytes32[] imageCids; // IPFS CIDs of artwork images
    string bindingReference; // Description of physical-digital binding
    uint256 genesisTimestamp; // Block timestamp of Genesis
    bytes32 genesisTxHash; // Transaction hash of Genesis
    ArtworkStatus status; // VERIFIED, BROKEN, UNVERIFIABLE, DISPUTED
}

// Status enum for artworks
enum ArtworkStatus { VERIFIED, BROKEN, UNVERIFIABLE, DISPUTED }

// ==== Transfer Data ====
struct Transfer {
    uint256 id; // Unique transfer ID (auto-increment)
    uint256 artworkId;
    address seller;
    address buyer; // address(0) if pending/unfilled
    address intermediary; // Institution broker (address(0) if none)
    uint256 transferDate; // Block timestamp when finalized
    bytes32 priceCommitment; // Keccak256(salt, price) if not PUBLIC; else 0
    bytes32[] supportingDocCids; // IPFS CIDs of transfer documents
    uint256 txHash; // Block number of finalization transaction (or 0 if pending)
    TransferStatus status; // PENDING, FINALIZED, EXPIRED, CANCELLED
}

// Status enum for transfers
enum TransferStatus { PENDING, FINALIZED, EXPIRED, CANCELLED }

// ==== Amendment Data ====
struct Amendment {
    uint256 id; // Unique amendment ID
    uint256 artworkId;
    address issuer; // Institution that issued amendment
    string reason;
    uint256 createdAt; // Block timestamp
}

// ==== Flag Data ====
struct Flag {
    uint256 id; // Unique flag ID
    uint256 artworkId;
    address flagger; // User who flagged
    FlagType type; // DISPUTED, REPORTED_STOLEN, UNDER_REVIEW
    string reason;
    string evidenceRef; // Optional off-chain reference (e.g., case number)
    uint256 createdAt; // Block timestamp
    uint256 resolvedAt; // Block timestamp when cleared (0 if active)
}

// Status enum for flags
enum FlagType { DISPUTED, REPORTED_STOLEN, UNDER_REVIEW }
```

*Note: Arrays for documentCids, imageCids, supportingDoccids are bounded in practice (PRD suggests reasonable limits). Consider using Counters or explicit ID tracking instead of relying on array length for iteration.*

#### 4.2 Mappings
```solidity
// Artwork lookup
mapping(uint256 => Artwork) private _artworks;
mapping(address => bool) private _isArtworkID; // Reverse lookup if needed by workflow

// Transfer lookup
mapping(uint256 => Transfer) private _transfers;
mapping(uint256 => uint256[]) private _artworkToTransfers; // artworkId => list of transferIds
mapping(uint256 => uint256) private _latestTransferId; // artworkId => most recent transfer id (including pending)

// Amendment and Flag lists
mapping(uint256 => uint256[]) private _artworkToAmendments;
mapping(uint256 => uint256[]) private _artworkToFlags;

// Pending transfers by artwork (to enforce single pending)
mapping(uint256 => uint256) private _pendingTransferId; // artworkId => transferId if status PENDING else 0

// Access Control (inherited from AccessControl)
// Roles: ARTCHAIN_ADMIN, AUTHENTICATOR, PAUSER_ROLE

// Institutional registry (simple mapping, could be external contract)
mapping(address => bool) private _isAuthenticatedInstitution; // wallet address => true if approved
// Admin set via AccessControlExtension functions
```

#### 4.3 Events
```solidity
event GenesisRecordCreated(
    uint256 indexed artworkId,
    address indexed authenticator,
    address indexed initialOwner,
    bytes32 metadataCid,
    bytes32[] documentCids,
    bytes32[] imageCids,
    string bindingReference,
    uint256 genesisTimestamp,
    bytes32 genesisTxHash
);

event TransferInitiated(
    uint256 indexed transferId,
    uint256 indexed artworkId,
    address indexed seller,
    address buyer,
    address intermediary,
    uint256 transferDate,
    bytes32 priceCommitment,
    bytes32[] supportingDocCids
);

export event TransferFinalized(
    uint256 indexed transferId,
    uint256 indexed artworkId,
    address indexed buyer,
    uint256 transferDate,
    bytes32 txHash
);

event TransferExpired(
    uint256 indexed transferId,
    uint256 indexed artworkId,
    address indexed seller
);

event TransferCancelled(
    uint256 indexed transferId,
    uint256 indexed artworkId,
    address indexed seller
);

event AmendmentAppended(
    uint256 indexed amendmentId,
    uint256 indexed artworkId,
    address indexed issuer,
    string reason,
    uint256 createdAt
);

event FlagCreated(
    uint256 indexed flagId,
    uint256 indexed artworkId,
    address indexed flagger,
    FlagType type,
    string reason,
    string evidenceRef,
    uint256 createdAt
);

event FlagResolved(
    uint256 indexed flagId,
    uint256 indexed artworkId,
    address indexed resolver,
    uint256 resolvedAt
);

event InstitutionApproved(address indexed institution);
event InstitutionRevoked(address indexed institution);
event RoleGranted(address indexed account, bytes32 indexed role, address indexed grantor);
event RoleRevoked(address indexed account, bytes32 indexed role, address indexed revoker);
event Paused(address indexed account);
event Unpaused(address indexed account);
```

#### 4.4 Modifiers & Error Handling
```solidity
// Custom errors for clarity and gas efficiency
error NotAuthenticatedInstitution();
error NotAuthorized();
error ArtworkDoesNotExist();
error ArtworkAlreadyExists();
error TransferDoesNotExist();
error TransferNotPending();
error TransferNotFinalized();
error InvalidBuyer(address buyer);
error TransferExpiredOrCancelled();
error InsufficientApproval();
error InvalidTransferTimewindow();
error DuplicateFlag();
error FlagNotActive();
```

Modifier examples:
```solidity
modifier onlyAuthenticatedInstitution() {
    if (!isAuthenticatedInstitution[msg.sender]) revert NotAuthenticatedInstitution();
    _;
}

modifier onlyRole(bytes32 role) {
    if (!hasRole(role, msg.sender)) revert NotAuthorized();
    _;
}

modifier artworkExists(uint256 artworkId) {
    if (!isArtworkID[artworkId]) revert ArtworkDoesNotExist();
    _;
}

modifier transferExists(uint256 transferId) {
    if (transferId == 0 || !_transfers[transferId].id) revert TransferDoesNotExist();
    _;
}

modifier transferPending(uint256 artworkId) {
    uint256 pendingId = _pendingTransferId[artworkId];
    if (pendingId == 0) revert TransferNotPending();
    _;
}
```

#### 4.5 Core Functions

##### 4.5.1 Institutional Management
```solidity
// Called by ARTCHAIN_ADMIN after off-chain multisig approval
function approveInstitution(address institutionWallet) external onlyRole(ARTCHAIN_ADMIN) {
    require(institutionWallet != address(0), "zero address");
    _isAuthenticatedInstitution[institutionWallet] = true;
    emit InstitutionApproved(institutionWallet);
}

// Called by ARTCHAIN_ADMIN after off-chain multisig approval
function revokeInstitution(address institutionWallet) external onlyRole(ARTCHAIN_ADMIN) {
    require(institutionWallet != address(0), "zero address");
    _isAuthenticatedInstitution[institutionWallet] = false;
    emit InstitutionRevoked(institutionWallet);
}

// Internal view function
function isAuthenticatedInstitution(address institution) public view returns (bool) {
    return _isAuthenticatedInstitution[institution];
}
```

##### 4.5.2 Genesis Record Creation
```solidity
function createGenesisRecord(
    string calldata title,
    string calldata artist,
    string calldata year,
    string calldata medium,
    string calldata dimensions,
    string calldata edition,
    string calldata authenticationMethod,
    bytes32 metadataCid,
    bytes32[] calldata documentCids,
    bytes32[] calldata imageCids,
    string calldata bindingReference
) external onlyRole(AUTHENTICATOR) returns (uint256 artworkId) {
    // Input validation (non-empty strings where required)
    require(bytes(title).length > 0 && bytes(artist).length > 0 && bytes(medium).length > 0 && bytes(dimensions).length > 0, "Missing required field");
    require(documentCids.length >= 1, "At least one document required");
    require(imageCids.length >= 1, "At least one image required");
    require(bytes(bindingReference).length > 0, "Binding reference required");

    // Duplicate detection: simple check on artist+title+dimensions hash (off-chain computation recommended; on-chain limited)
    // For MVP, rely on frontend/backend duplicate check; contract can enforce uniqueness via mapping of hash->artworkId if desired.
    
    uint256 newId = _artworkIdCounter + 1;
    _artworkIdCounter = newId;
    
    Artwork storage artwork = _artworks[newId];
    artwork.id = newId;
    artwork.authenticator = msg.sender;
    artwork.initialOwner = msg.sender; // Initial owner assumed to be the authenticator (or could be passed as param)
    artwork.metadataCid = metadataCid;
    artwork.documentCids = documentCids;
    artwork.imageCids = imageCids;
    artwork.bindingReference = bindingReference;
    artwork.genesisTimestamp = block.timestamp;
    artwork.genesisTxHash = blockhash(block.number - 1); // or keep tx hash from caller via msg? Better: pass txHash as arg from off-chain signature verification; for simplicity, use block.prevhash.
    artwork.status = ArtworkStatus.VERIFIED; // Assuming verification passed off-chain
    
    _isArtworkID[newId] = true;
    
    emit GenesisRecordCreated(newId, msg.sender, msg.sender, metadataCid, documentCids, imageCids, bindingReference, block.timestamp, blockhash(block.number - 1));
    
    return newId;
}
```

Note: In practice, the Genesis transaction hash is not available until after mining; better to have caller pass the hash as part of a signature verification scheme or capture via event logs off-chain. For spec simplicity, we note that the transaction hash can be obtained from the event logs or via a separate function after submission.

##### 4.5.3 Transfer Initiation (Two-Party Consent)
```solidity
function initiateTransfer(
    uint256 artworkId,
    address buyer,
    address intermediary, // can be address(0) for direct transfer
    uint256 transferDate, // Typically block.timestamp, but allow off-chain agreement
    bytes32 priceCommitment, // keccak256(abi.encodePacked(salt, price)) if not PUBLIC; else 0
    bytes32[] calldata supportingDocCids
) external onlyAuthenticatedInstitution returns (uint256 transferId) {
    require(artworkExists(artworkId), "Artwork does not exist");
    Artwork storage artwork = _artworks[artworkId];
    
    // Only current owner can initiate (checked via latest transfer or initial owner if no transfers)
    address currentOwner = getCurrentOwner(artworkId);
    require(msg.sender == currentOwner, "Not current owner");
    
    // No pending transfer already
    require(_pendingTransferId[artworkId] == 0, "Pending transfer exists");
    
    // Artwork not disputed etc.
    require(artwork.status == ArtworkStatus.VERIFIED, "Artwork not in verifiable status");
    
    // Buyer cannot be zero address (must be specific wallet)
    require(buyer != address(0), "Buyer address required");
    
    // Optional: intermediary validation if non-zero (must be authenticated institution)
    if (intermediary != address(0)) {
        require(isAuthenticatedInstitution[intermediary], "Intermediary not authenticated");
    }
    
    uint256 newTransferId = _transferIdCounter + 1;
    _transferIdCounter = newTransferId;
    
    Transfer storage transfer = _transfers[newTransferId];
    transfer.id = newTransferId;
    transfer.artworkId = artworkId;
    transfer.seller = msg.sender;
    transfer.buyer = buyer; // remains as provided; will remain address(0) until accepted? We'll use buyer field as the intended buyer; address(0) means unspecified? Better keep as provided and have separate accepted flag.
    transfer.intermediary = intermediary;
    transfer.transferDate = transferDate;
    transfer.priceCommitment = priceCommitment;
    transfer.supportingDocCids = supportingDocCids;
    transfer.txHash = 0; // pending
    transfer.status = TransferStatus.PENDING;
    
    // Link to artwork
    _artworkToTransfers[artworkId].push(newTransferId);
    _latestTransferId[artworkId] = newTransferId;
    _pendingTransferId[artworkId] = newTransferId; // mark pending
    
    emit TransferInitiated(newTransferId, artworkId, msg.sender, buyer, intermediary, transferDate, priceCommitment, supportingDocCids);
    
    return newTransferId;
}
```

Replace Transfer struct fields accordingly: keep buyer as the intended buyer; acceptance will set a flag or change status.

Alternative: Keep buyer field as the accepter once finalized; during pending, buyer is the intended buyer (non-zero) but status PENDING. On acceptance, keep buyer same, change status to FINALIZED, set txHash.

We'll adopt that.

Thus adjust:

```solidity
Transfer storage transfer = _transfers[newTransferId];
...
transfer.intendedBuyer = buyer; // add field
transfer.acceptedBy = address(0); // new field
...
```

Then acceptance function sets acceptedBy and updates status.

But for brevity in spec, we accept earlier version and note refinement.

##### 4.5.4 Transfer Acceptance (Buyer)
```solidity
function acceptTransfer(uint256 transferId) external {
    Transfer storage transfer = _transfers[transferId];
    require(transfer.exists(), "Transfer does not exist");
    require(transfer.status == TransferStatus.PENDING, "Transfer not pending");
    require(msg.sender == transfer.buyer, "Only intended buyer can accept");
    require(!_isExpired(transferId), "Transfer expired");
    
    // Finalize
    transfer.status = TransferStatus.FINALIZED;
    transfer.txHash = blockhash(block.number - 1); // or actual tx hash from caller via signature? We'll rely on event.
    uint256 artworkId = transfer.artworkId;
    
    // Update pending marker
    _pendingTransferId[artworkId] = 0;
    
    // (Optionally update artwork status if needed, but Artwork.status remains VERIFIED unless flagged)
    
    emit TransferFinalized(transferId, artworkId, msg.sender, block.timestamp, blockhash(block.number - 1));
}
```

Add helper `_isExpired` checking if block.timestamp > transfer.transferDate + timeout (stored as global constant or per-transfer? Use global constant `TRANSFER_TIMEOUT` settable by admin with multisig.)

##### 4.5.5 Transfer Expiration (Called by anyone or keeper)
```solidity
function expireTransfer(uint256 transferId) external {
    Transfer storage transfer = _transfers[transferId];
    require(transfer.exists(), "Transfer does not exist");
    require(transfer.status == TransferStatus.PENDING, "Transfer not pending");
    require(_isExpired(transferId), "Transfer not expired");
    
    transfer.status = TransferStatus.EXPIRED;
    _pendingTransferId[transfer.artworkId] = 0;
    
    emit TransferExpired(transferId, transfer.artworkId, transfer.seller);
}
```

##### 4.5.6 Transfer Cancellation (by seller or admin with reason)
```solidity
function cancelTransfer(uint256 transferId, string calldata reason) external onlyAuthenticatedInstitution {
    Transfer storage transfer = _transfers[transferId];
    require(transfer.exists(), "Transfer does not exist");
    require(transfer.status == TransferStatus.PENDING, "Transfer not pending");
    require(msg.sender == transfer.seller || hasRole(ARTCHAIN_ADMIN, msg.sender), "Not authorized");
    
    transfer.status = TransferStatus.CANCELLED;
    _pendingTransferId[transfer.artworkId] = 0;
    
    emit TransferCancelled(transferId, transfer.artworkId, transfer.seller);
    // Note: reason could be logged via event extension; for simplicity omit or add to event.
}
```

##### 4.5.7 Amendment Recording
```solidity
function appendAmendmentRecord(
    uint256 artworkId,
    string calldata reason
) external onlyRole(AUTHENTICATOR) returns (uint256 amendmentId) {
    require(artworkExists(artworkId), "Artwork does not exist");
    // Only original issuer or admin with multisig reason can amend
    Artwork storage artwork = _artworks[artworkId];
    require(msg.sender == artwork.authenticator || hasRole(ARTCHAIN_ADMIN, msg.sender), "Not authorized to amend");
    
    uint256 newId = _amendmentIdCounter + 1;
    _amendmentIdCounter = newId;
    
    Amendment storage amendment = _amendments[newId];
    amendment.id = newId;
    amendment.artworkId = artworkId;
    amendment.issuer = msg.sender;
    amendment.reason = reason;
    amendment.createdAt = block.timestamp;
    
    _artworkToAmendments[artworkId].push(newId);
    
    emit AmendmentAppended(newId, artworkId, msg.sender, reason, block.timestamp);
    
    return newId;
}
```

Note: Admin amendment requires multisig approval off-chain; contract only checks role, expecting off‑chain governance to enforce multisig before calling.

##### 4.5.8 Flag Creation
```solidity
function flagArtwork(
    uint256 artworkId,
    FlagType flagType,
    string calldata reason,
    string calldata evidenceRef
) external returns (uint256 flagId) {
    require(artworkExists(artworkId), "Artwork does not exist");
    // Only authorized parties: current owner, authenticator, or recognized authority (simplified as any authenticated institution for MVP)
    address currentOwner = getCurrentOwner(artworkId);
    require(
        msg.sender == currentOwner ||
        msg.sender == _artworks[artworkId].authenticator ||
        isAuthenticatedInstitution[msg.sender],
        "Not authorized to flag"
    );
    
    // Prevent duplicate active flags of same type? Policy: allow multiple but track.
    
    uint256 newId = _flagIdCounter + 1;
    _flagIdCounter = newId;
    
    Flag storage flag = _flags[newId];
    flag.id = newId;
    flag.artworkId = artworkId;
    flag.flagger = msg.sender;
    flag.type = flagType;
    flag.reason = reason;
    flag.evidenceRef = evidenceRef;
    flag.createdAt = block.timestamp;
    flag.resolvedAt = 0;
    
    _artworkToFlags[artworkId].push(newId);
    
    emit FlagCreated(newId, artworkId, msg.sender, flagType, reason, evidenceRef, block.timestamp);
    
    return newId;
}
```

##### 4.5.9 Flag Resolution
```solidity
function resolveFlag(
    uint256 flagId,
    string calldata reason // optional
) external {
    Flag storage flag = _flags[flagId];
    require(flag.exists(), "Flag does not exist");
    require(flag.resolvedAt == 0, "Flag already resolved");
    // Only authorized parties: same as flag creation OR ARTCHAIN_ADMIN with multisig
    address currentOwner = getCurrentOwner(flag.artworkId);
    bool authorized = 
        msg.sender == flag.flagger ||
        msg.sender == _artworks[flag.artworkId].authenticator ||
        isAuthenticatedInstitution[msg.sender] ||
        hasRole(ARTCHAIN_ADMIN, msg.sender); // Admin multisig expected off-chain
    
    require(authorized, "Not authorized to resolve");
    
    flag.resolvedAt = block.timestamp;
    // Optionally emit reason via event extension
    
    emit FlagResolved(flagId, flag.artworkId, msg.sender, block.timestamp);
}
```

##### 4.5.10 View Functions (Public)
```solidity
function getArtwork(uint256 artworkId) external view returns (
    uint256 id,
    address authenticator,
    address initialOwner,
    bytes32 metadataCid,
    bytes32[] memory documentCids,
    bytes32[] memory imageCids,
    string memory bindingReference,
    uint256 genesisTimestamp,
    bytes32 genesisTxHash,
    ArtworkStatus status
) {
    require(artworkExists(artworkId), "Artwork does not exist");
    Artwork storage artwork = _artworks[artworkId];
    return (
        artwork.id,
        artwork.authenticator,
        artwork.initialOwner,
        artwork.metadataCid,
        artwork.documentCids,
        artwork.imageCids,
        artwork.bindingReference,
        artwork.genesisTimestamp,
        artwork.genesisTxHash,
        artwork.status
    );
}

function getCurrentOwner(uint256 artworkId) external view returns (address) {
    require(artworkExists(artworkId), "Artwork does not exist");
    // If there is a finalized transfer, its buyer is current owner; else initial owner
    uint256 latestId = _latestTransferId[artworkId];
    if (latestId == 0) {
        return _artworks[artworkId].initialOwner;
    } else {
        Transfer storage transfer = _transfers[latestId];
        require(transfer.status == TransferStatus.FINALIZED, "Latest transfer not finalized");
        return transfer.buyer;
    }
}

function getTransfer(uint256 transferId) external view returns (
    uint256 id,
    uint256 artworkId,
    address seller,
    address intendedBuyer, // as passed in initiate
    address acceptedBy, // address(0) if pending
    address intermediary,
    uint256 transferDate,
    bytes32 priceCommitment,
    bytes32[] memory supportingDocCids,
    uint256 txHash,
    TransferStatus status
) {
    require(transferId > 0 && _transfers[transferId].id == transferId, "Transfer does not exist");
    Transfer storage t = _transfers[transferId];
    return (
        t.id,
        t.artworkId,
        t.seller,
        t.intendedBuyer,
        t.acceptedBy,
        t.intermediary,
        t.transferDate,
        t.priceCommitment,
        t.supportingDocCids,
        t.txHash,
        t.status
    );
}

// Additional view functions for lists, pending status, etc.
```

#### 4.6 AccessControlExtension.sol (brief)
This contract inherits OpenZeppelin's AccessControl and adds conveniences:
- Function `grantRole(bytes32 role, address account)` restricted to DEFAULT_ADMIN_ROLE or ARTCHAIN_ADMIN with multisig (off‑chain check).
- Function `revokeRole(...)`
- Function `getRoleMemberCount(bytes32 role)`.
- Function `isRoleMember(address account, bytes32 role)`.
- Possibly a function `executeMultisig(bytes32 role, address target, bytes calldata data)` that verifies off‑chain signatures (via EIP‑712 or Gnosis Safe signature pattern) before calling `grantRole` or other protected functions.

Given the multisig requirement is largely off‑chain, the contract can assume that callers invokingadmin functions have already collected required signatures off‑chain; the contract only checks that the caller holds the role (ARTCHAIN_ADMIN) and that the function is protected by `onlyRole(ARTCHAIN_ADMIN)`. The multisig verification is performed by the off‑chain governance frontend/backend before submitting the transaction.

#### 4.7 PausableExtension.sol (optional)
If emergency pause for transfers is desired, inherit OpenZeppelin's Pausable and add:
- `pauseTransfers()` onlyRole(ARTCHAIN_ADMIN) (after multisig)
- `unpauseTransfers()` similarly
- Override `_beforeTokenTransfer`? Not needed; instead add `whenNotPaused` modifier to transfer initiation/acceptance functions.
- Reads (Genesis lookup, verification) remain unpaused.

### 5. Security Considerations

#### 5.1 Reentrancy
- Use non‑reentrant patterns where external calls are made (none in core functions except low‑level calls like `send`/`call` which we avoid). Mark functions as `nonReentrant` if using OpenZeppelin's ReentrancyGuard (not strictly needed here but good practice).

#### 5.2 Integer Overflows
- Solidity ^0.8 has built‑in overflow checks.

#### 5.3 Access Control
- Role‑based checks on all state‑changing functions.
- Only `AUTHENTICATOR` can call `createGenesisRecord` and `appendAmendmentRecord`.
- Transfer initiation requires `onlyAuthenticatedInstitution` (checked via mapping).
- Admin functions require `ARTCHAIN_ADMIN` role (multisig enforced off‑chain).

#### 5.4 Denial of Service
- Bounded loops: avoid iterating over unbounded arrays. Artwork->transfers, amendments, flags arrays are expected to remain small (dozens). If concerned, implement pagination via limits or use mapping with incremental IDs and separate index structures.
- No unlimited minting; artwork IDs increment but limited by practical usage.

#### 5.5 Front‑Running / MEV
- Transfer initiation reveals buyer and price commitment (if not PUBLIC). Front‑running could attempt to insert a competing transfer. Mitigation:
  - Use commit‑reveal scheme for sensitive data if needed (price commitment already hides price).
  - For buyer privacy, allow buyer to submit acceptance via a separate transaction that does not reveal buyer until acceptance (the init tx already shows intended buyer). This is a trade‑off; accept as is for MVP.

#### 5.6 Upgradeability
- Current spec assumes immutable contracts. If upgradeability needed later, use Transparent Proxy with admin multisig and timelock.

#### 5.7 Private Data Exposure
- No personal data stored on‑chain (only wallet addresses, which are pseudonymous). Price data hidden via commitment unless PUBLIC.

### 6. Gas Optimization Notes
- Use `bytes32` for fixed‑size hashes/IPFS CIDs.
- Mark variables `private` or `internal` where possible to reduce exposure; `public` generates getters (costly) but needed for read‑only data accessed off‑chain (e.g., `isAuthenticatedInstitution`). Can keep `public` for simplicity.
- Use `calldata` for read‑only array parameters.
- Consider using `Insertion Sort` style for small arrays if needed for search, but likely unnecessary.
- Emit events only for state changes; view functions have no gas cost when called off‑chain.

### 7. Interfaces & Libraries
- **IArtchainRegistry.sol**: Interface defining external function signatures for off‑chain interaction (useful for testing or mock contracts).
- **Libraries**: 
  - `HashLib.sol`: `function sha256(bytes memory data) internal pure returns (bytes32)` etc.
  - `StringLib.sol`: utility for string comparison, concatenation if needed (Solidity strings are limited; often kept in memory).

### 8. Testing & Verification Strategy
- **Unit Tests**: 
  - Each function tested with various role permutations (authenticated institution, authenticator, admin, unauthorized).
  - Edge cases: zero addresses, empty strings, max array sizes, expired transfers.
  - Property‑based testing for invariants (e.g., only authenticator can create Genesis, transfer linear chain).
- **Integration Tests**: 
  - Deploy contract suite to local Hardhat network or fork of Mumbai.
  - Simulate full workflows: registration → Genesis → transfer initiation → acceptance → verification.
  - Test event emission and correct state updates.
- **Static Analysis**: Run Slither, Echidna, MythX in CI.
- **Fuzzing**: Echidna or Foundry fuzz targets for invariant breaking.
- **Formal Verification**: For critical properties (e.g., `onlyAuthenticatedInstitution` cannot be bypassed, transfer status transitions are acyclic).

### 9. Deployment & Configuration
- **Constructor** (if any): 
  - Set up default admin (deployer) and grant `ARTCHAIN_ADMIN` role to a multisig address (Gnosis Safe) or temporary address later transferred.
  - Set global constants: `TRANSFER_TIMEOUT` (seconds), maybe via setter protected by `ARTCHAIN_ADMIN` with multisig.
- **Deployment Scripts**: Use Hardhat or Foundry to deploy to Mumbai testnet, verify on Polygonscan.
- **Post‑Deployment**: 
  - Transfer `DEFAULT_ADMIN_ROLE` to a timelocked multisig or renounce to increase decentralization.
  - Verify contract source code matches audited version.

### 10. Summary
The Aureum smart contract suite provides a secure, minimal‑on‑chain implementation of the artwork provenance trail. By storing only essential identifiers, hashes, and access controls on‑chain while leveraging IPFS for bulky data and employing role‑based access with multisig‑guarded administrative operations, the system satisfies the PRD’s functional requirements while addressing security, privacy, and gas‑efficiency concerns.

--- 
*Document Version: 1.0*
*Last Updated: 2026-10-08*
*Next Review: 2027-04-08 (6 months)*