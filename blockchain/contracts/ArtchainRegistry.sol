// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "./AccessControlExtension.sol";
import "./interfaces/IArtchainRegistry.sol";

/**
 * @title ArtchainRegistry
 * @dev Core registry contract for Aureum Artchain Provenance Trail.
 * Handles Genesis artwork registration, two-party transfers, amendments,
 * dispute flags, and institutional verification.
 */
contract ArtchainRegistry is AccessControlExtension, ReentrancyGuard, IArtchainRegistry {
    // ============ Constants & State Counters ============

    uint256 public constant ARTWORK_ID_START = 1;
    uint256 private _artworkIdCounter;
    uint256 private _transferIdCounter;
    uint256 private _amendmentIdCounter;
    uint256 private _flagIdCounter;

    uint256 public transferTimeout = 14 days;

    // ============ Mappings ============

    // Artwork mappings
    mapping(uint256 => Artwork) private _artworks;
    mapping(uint256 => bool) private _isArtworkID;
    mapping(uint256 => address) private _currentOwner;

    // Transfer mappings
    mapping(uint256 => Transfer) private _transfers;
    mapping(uint256 => uint256[]) private _artworkToTransfers;
    mapping(uint256 => uint256) private _latestTransferId;
    mapping(uint256 => uint256) private _pendingTransferId; // artworkId => transferId if pending, else 0

    // Amendments & Flags
    mapping(uint256 => Amendment) private _amendments;
    mapping(uint256 => uint256[]) private _artworkToAmendments;

    mapping(uint256 => Flag) private _flags;
    mapping(uint256 => uint256[]) private _artworkToFlags;

    // Institution registry
    mapping(address => bool) private _isAuthenticatedInstitution;

    // ============ Modifiers ============

    modifier onlyAuthenticatedInstitution() {
        if (!_isAuthenticatedInstitution[msg.sender]) {
            revert NotAuthenticatedInstitution();
        }
        _;
    }

    modifier artworkExists(uint256 artworkId) {
        if (!_isArtworkID[artworkId]) {
            revert ArtworkDoesNotExist();
        }
        _;
    }

    modifier transferExists(uint256 transferId) {
        if (transferId == 0 || _transfers[transferId].id != transferId) {
            revert TransferDoesNotExist();
        }
        _;
    }

    // ============ Constructor ============

    constructor(address initialAdmin) AccessControlExtension(initialAdmin) {}

    // ============ Institutional Management ============

    /**
     * @dev Approves an institution and grants AUTHENTICATOR role.
     */
    function approveInstitution(address institutionWallet) external onlyRole(ARTCHAIN_ADMIN) {
        if (institutionWallet == address(0)) revert ZeroAddress();

        _isAuthenticatedInstitution[institutionWallet] = true;
        _grantRole(AUTHENTICATOR, institutionWallet);

        emit InstitutionApproved(institutionWallet);
    }

    /**
     * @dev Revokes an institution and removes AUTHENTICATOR role.
     */
    function revokeInstitution(address institutionWallet) external onlyRole(ARTCHAIN_ADMIN) {
        if (institutionWallet == address(0)) revert ZeroAddress();

        _isAuthenticatedInstitution[institutionWallet] = false;
        _revokeRole(AUTHENTICATOR, institutionWallet);

        emit InstitutionRevoked(institutionWallet);
    }

    /**
     * @dev Checks if an address is an approved institution.
     */
    function isAuthenticatedInstitution(address institution) external view returns (bool) {
        return _isAuthenticatedInstitution[institution];
    }

    /**
     * @dev Allows ARTCHAIN_ADMIN to update the pending transfer timeout window.
     */
    function setTransferTimeout(uint256 newTimeout) external onlyRole(ARTCHAIN_ADMIN) {
        require(newTimeout >= 1 days, "Timeout must be >= 1 day");
        uint256 oldTimeout = transferTimeout;
        transferTimeout = newTimeout;
        emit TransferTimeoutUpdated(oldTimeout, newTimeout);
    }

    // ============ Genesis Artwork Registration ============

    /**
     * @dev Creates a Genesis record with msg.sender as the initial owner.
     */
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
    ) external onlyRole(AUTHENTICATOR) whenNotPaused returns (uint256 artworkId) {
        return _createGenesis(
            title,
            artist,
            year,
            medium,
            dimensions,
            edition,
            authenticationMethod,
            metadataCid,
            documentCids,
            imageCids,
            bindingReference,
            msg.sender
        );
    }

    /**
     * @dev Creates a Genesis record with an explicit initial owner specified.
     */
    function createGenesisRecordWithOwner(
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
        string calldata bindingReference,
        address initialOwner
    ) external onlyRole(AUTHENTICATOR) whenNotPaused returns (uint256 artworkId) {
        address owner = initialOwner == address(0) ? msg.sender : initialOwner;
        return _createGenesis(
            title,
            artist,
            year,
            medium,
            dimensions,
            edition,
            authenticationMethod,
            metadataCid,
            documentCids,
            imageCids,
            bindingReference,
            owner
        );
    }

    function _createGenesis(
        string calldata title,
        string calldata artist,
        string calldata /* year */,
        string calldata medium,
        string calldata dimensions,
        string calldata /* edition */,
        string calldata /* authenticationMethod */,
        bytes32 metadataCid,
        bytes32[] calldata documentCids,
        bytes32[] calldata imageCids,
        string calldata bindingReference,
        address initialOwner
    ) internal returns (uint256) {
        if (bytes(title).length == 0 || bytes(artist).length == 0 || bytes(medium).length == 0 || bytes(dimensions).length == 0) {
            revert EmptyString();
        }
        if (documentCids.length == 0 || imageCids.length == 0 || bytes(bindingReference).length == 0) {
            revert EmptyString();
        }

        uint256 newId = ++_artworkIdCounter;

        bytes32 txHash = blockhash(block.number > 0 ? block.number - 1 : 0);

        Artwork storage artwork = _artworks[newId];
        artwork.id = newId;
        artwork.authenticator = msg.sender;
        artwork.initialOwner = initialOwner;
        artwork.metadataCid = metadataCid;
        artwork.documentCids = documentCids;
        artwork.imageCids = imageCids;
        artwork.bindingReference = bindingReference;
        artwork.genesisTimestamp = block.timestamp;
        artwork.genesisTxHash = txHash;
        artwork.status = ArtworkStatus.VERIFIED;

        _isArtworkID[newId] = true;
        _currentOwner[newId] = initialOwner;

        emit GenesisRecordCreated(
            newId,
            msg.sender,
            initialOwner,
            metadataCid,
            documentCids,
            imageCids,
            bindingReference,
            block.timestamp,
            txHash
        );

        return newId;
    }

    // ============ Two-Party Consent Transfers ============

    /**
     * @dev Initiates an ownership transfer. Requires current owner (or authorized institution intermediary).
     */
    function initiateTransfer(
        uint256 artworkId,
        address buyer,
        address intermediary,
        uint256 transferDate,
        bytes32 priceCommitment,
        bytes32[] calldata supportingDocCids
    ) external whenNotPaused artworkExists(artworkId) returns (uint256 transferId) {
        Artwork storage artwork = _artworks[artworkId];

        address currentOwnerAddr = _currentOwner[artworkId];
        bool isAuthorized = (msg.sender == currentOwnerAddr) ||
            (intermediary != address(0) && msg.sender == intermediary && _isAuthenticatedInstitution[msg.sender]);

        if (!isAuthorized) {
            revert NotAuthorized();
        }

        if (_pendingTransferId[artworkId] != 0) {
            revert PendingTransferExists();
        }

        if (artwork.status != ArtworkStatus.VERIFIED) {
            revert ArtworkNotVerifiable();
        }

        if (buyer == address(0) || buyer == currentOwnerAddr) {
            revert InvalidBuyer();
        }

        if (intermediary != address(0) && !_isAuthenticatedInstitution[intermediary]) {
            revert NotAuthenticatedInstitution();
        }

        uint256 effectiveTransferDate = transferDate == 0 ? block.timestamp : transferDate;

        uint256 newTransferId = ++_transferIdCounter;
        Transfer storage transfer = _transfers[newTransferId];
        transfer.id = newTransferId;
        transfer.artworkId = artworkId;
        transfer.seller = currentOwnerAddr;
        transfer.buyer = buyer;
        transfer.intermediary = intermediary;
        transfer.transferDate = effectiveTransferDate;
        transfer.priceCommitment = priceCommitment;
        transfer.supportingDocCids = supportingDocCids;
        transfer.txHash = 0;
        transfer.status = TransferStatus.PENDING;

        _artworkToTransfers[artworkId].push(newTransferId);
        _latestTransferId[artworkId] = newTransferId;
        _pendingTransferId[artworkId] = newTransferId;

        emit TransferInitiated(
            newTransferId,
            artworkId,
            currentOwnerAddr,
            buyer,
            intermediary,
            effectiveTransferDate,
            priceCommitment,
            supportingDocCids
        );

        return newTransferId;
    }

    /**
     * @dev Accepts a pending transfer. Callable strictly by the designated buyer.
     */
    function acceptTransfer(uint256 transferId)
        external
        whenNotPaused
        nonReentrant
        transferExists(transferId)
    {
        Transfer storage transfer = _transfers[transferId];

        if (transfer.status != TransferStatus.PENDING) {
            revert TransferNotPending();
        }

        if (msg.sender != transfer.buyer) {
            revert NotAuthorized();
        }

        if (_isExpired(transferId)) {
            transfer.status = TransferStatus.EXPIRED;
            _pendingTransferId[transfer.artworkId] = 0;
            emit TransferExpired(transferId, transfer.artworkId, transfer.seller);
            revert TransferExpiredOrCancelled();
        }

        transfer.status = TransferStatus.FINALIZED;
        transfer.txHash = block.number;

        uint256 artworkId = transfer.artworkId;
        _currentOwner[artworkId] = msg.sender;
        _pendingTransferId[artworkId] = 0;

        bytes32 txHashBytes = blockhash(block.number > 0 ? block.number - 1 : 0);

        emit TransferFinalized(
            transferId,
            artworkId,
            msg.sender,
            block.timestamp,
            txHashBytes
        );
    }

    /**
     * @dev Expires a pending transfer that has passed the timeout duration.
     */
    function expireTransfer(uint256 transferId) external transferExists(transferId) {
        Transfer storage transfer = _transfers[transferId];

        if (transfer.status != TransferStatus.PENDING) {
            revert TransferNotPending();
        }

        if (!_isExpired(transferId)) {
            revert NotAuthorized();
        }

        transfer.status = TransferStatus.EXPIRED;
        _pendingTransferId[transfer.artworkId] = 0;

        emit TransferExpired(transferId, transfer.artworkId, transfer.seller);
    }

    /**
     * @dev Cancels a pending transfer. Callable by seller or ARTCHAIN_ADMIN.
     */
    function cancelTransfer(uint256 transferId, string calldata reason) external transferExists(transferId) {
        Transfer storage transfer = _transfers[transferId];

        if (transfer.status != TransferStatus.PENDING) {
            revert TransferNotPending();
        }

        bool canCancel = (msg.sender == transfer.seller) || hasRole(ARTCHAIN_ADMIN, msg.sender);
        if (!canCancel) {
            revert NotAuthorized();
        }

        transfer.status = TransferStatus.CANCELLED;
        _pendingTransferId[transfer.artworkId] = 0;

        emit TransferCancelled(transferId, transfer.artworkId, transfer.seller, reason);
    }

    // ============ Amendments ============

    /**
     * @dev Appends a verifiable amendment record to the artwork provenance.
     */
    function appendAmendmentRecord(
        uint256 artworkId,
        string calldata reason
    ) external artworkExists(artworkId) returns (uint256 amendmentId) {
        Artwork storage artwork = _artworks[artworkId];

        bool authorized = (msg.sender == artwork.authenticator) || hasRole(ARTCHAIN_ADMIN, msg.sender);
        if (!authorized) {
            revert NotAuthorized();
        }

        if (bytes(reason).length == 0) revert EmptyString();

        uint256 newId = ++_amendmentIdCounter;
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

    // ============ Dispute Flags ============

    /**
     * @dev Flags an artwork for disputes, stolen reports, or authentications under review.
     */
    function flagArtwork(
        uint256 artworkId,
        FlagType flagType,
        string calldata reason,
        string calldata evidenceRef
    ) external artworkExists(artworkId) returns (uint256 flagId) {
        Artwork storage artwork = _artworks[artworkId];
        address currentOwnerAddr = _currentOwner[artworkId];

        bool authorized = (msg.sender == currentOwnerAddr) ||
            (msg.sender == artwork.authenticator) ||
            _isAuthenticatedInstitution[msg.sender] ||
            hasRole(ARTCHAIN_ADMIN, msg.sender);

        if (!authorized) {
            revert NotAuthorized();
        }

        if (bytes(reason).length == 0) revert EmptyString();

        uint256 newId = ++_flagIdCounter;
        Flag storage flag = _flags[newId];
        flag.id = newId;
        flag.artworkId = artworkId;
        flag.flagger = msg.sender;
        flag.flagType = flagType;
        flag.reason = reason;
        flag.evidenceRef = evidenceRef;
        flag.createdAt = block.timestamp;
        flag.resolvedAt = 0;

        _artworkToFlags[artworkId].push(newId);
        artwork.status = ArtworkStatus.DISPUTED;

        emit FlagCreated(newId, artworkId, msg.sender, flagType, reason, evidenceRef, block.timestamp);

        return newId;
    }

    /**
     * @dev Resolves an active dispute flag.
     */
    function resolveFlag(uint256 flagId, string calldata reason) external {
        if (flagId == 0 || _flags[flagId].id != flagId) {
            revert FlagDoesNotExist();
        }

        Flag storage flag = _flags[flagId];
        if (flag.resolvedAt != 0) {
            revert FlagAlreadyResolved();
        }

        Artwork storage artwork = _artworks[flag.artworkId];

        bool authorized = (msg.sender == flag.flagger) ||
            (msg.sender == artwork.authenticator) ||
            _isAuthenticatedInstitution[msg.sender] ||
            hasRole(ARTCHAIN_ADMIN, msg.sender);

        if (!authorized) {
            revert NotAuthorized();
        }

        flag.resolvedAt = block.timestamp;

        // Check if any other unresolved flags exist on this artwork
        bool hasOtherActiveFlags = false;
        uint256[] storage flagIds = _artworkToFlags[flag.artworkId];
        for (uint256 i = 0; i < flagIds.length; i++) {
            if (_flags[flagIds[i]].resolvedAt == 0) {
                hasOtherActiveFlags = true;
                break;
            }
        }

        if (!hasOtherActiveFlags) {
            artwork.status = ArtworkStatus.VERIFIED;
        }

        emit FlagResolved(flagId, flag.artworkId, msg.sender, reason, block.timestamp);
    }

    // ============ View Functions ============

    function getArtwork(uint256 artworkId)
        external
        view
        artworkExists(artworkId)
        returns (
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
        )
    {
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

    function getCurrentOwner(uint256 artworkId) external view artworkExists(artworkId) returns (address) {
        return _currentOwner[artworkId];
    }

    function getTransfer(uint256 transferId) external view transferExists(transferId) returns (Transfer memory) {
        return _transfers[transferId];
    }

    function getArtworkTransfers(uint256 artworkId) external view artworkExists(artworkId) returns (uint256[] memory) {
        return _artworkToTransfers[artworkId];
    }

    function getArtworkAmendments(uint256 artworkId) external view artworkExists(artworkId) returns (uint256[] memory) {
        return _artworkToAmendments[artworkId];
    }

    function getArtworkFlags(uint256 artworkId) external view artworkExists(artworkId) returns (uint256[] memory) {
        return _artworkToFlags[artworkId];
    }

    function getPendingTransferId(uint256 artworkId) external view artworkExists(artworkId) returns (uint256) {
        return _pendingTransferId[artworkId];
    }

    function getAmendment(uint256 amendmentId) external view returns (Amendment memory) {
        require(amendmentId > 0 && _amendments[amendmentId].id == amendmentId, "Amendment does not exist");
        return _amendments[amendmentId];
    }

    function getFlag(uint256 flagId) external view returns (Flag memory) {
        require(flagId > 0 && _flags[flagId].id == flagId, "Flag does not exist");
        return _flags[flagId];
    }

    // ============ Internal Helpers ============

    function _isExpired(uint256 transferId) internal view returns (bool) {
        Transfer storage transfer = _transfers[transferId];
        return block.timestamp > (transfer.transferDate + transferTimeout);
    }
}
