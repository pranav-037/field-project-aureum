// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * @title IArtchainRegistry
 * @dev Interface for the Aureum Artchain Provenance Trail registry contract.
 */
interface IArtchainRegistry {
    // ============ Enums ============

    enum ArtworkStatus {
        VERIFIED,
        BROKEN,
        UNVERIFIABLE,
        DISPUTED
    }

    enum TransferStatus {
        PENDING,
        FINALIZED,
        EXPIRED,
        CANCELLED
    }

    enum FlagType {
        DISPUTED,
        REPORTED_STOLEN,
        UNDER_REVIEW
    }

    // ============ Structs ============

    struct Artwork {
        uint256 id;
        address authenticator;
        address initialOwner;
        bytes32 metadataCid;
        bytes32[] documentCids;
        bytes32[] imageCids;
        string bindingReference;
        uint256 genesisTimestamp;
        bytes32 genesisTxHash;
        ArtworkStatus status;
    }

    struct Transfer {
        uint256 id;
        uint256 artworkId;
        address seller;
        address buyer;
        address intermediary;
        uint256 transferDate;
        bytes32 priceCommitment;
        bytes32[] supportingDocCids;
        uint256 txHash;
        TransferStatus status;
    }

    struct Amendment {
        uint256 id;
        uint256 artworkId;
        address issuer;
        string reason;
        uint256 createdAt;
    }

    struct Flag {
        uint256 id;
        uint256 artworkId;
        address flagger;
        FlagType flagType;
        string reason;
        string evidenceRef;
        uint256 createdAt;
        uint256 resolvedAt;
    }

    // ============ Events ============

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

    event TransferFinalized(
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
        address indexed seller,
        string reason
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
        FlagType flagType,
        string reason,
        string evidenceRef,
        uint256 createdAt
    );

    event FlagResolved(
        uint256 indexed flagId,
        uint256 indexed artworkId,
        address indexed resolver,
        string reason,
        uint256 resolvedAt
    );

    event InstitutionApproved(address indexed institution);
    event InstitutionRevoked(address indexed institution);
    event TransferTimeoutUpdated(uint256 oldTimeout, uint256 newTimeout);

    // ============ Custom Errors ============

    error NotAuthenticatedInstitution();
    error NotAuthorized();
    error ArtworkDoesNotExist();
    error ArtworkAlreadyExists();
    error TransferDoesNotExist();
    error TransferNotPending();
    error TransferNotFinalized();
    error InvalidBuyer();
    error TransferExpiredOrCancelled();
    error PendingTransferExists();
    error ArtworkNotVerifiable();
    error FlagDoesNotExist();
    error FlagAlreadyResolved();
    error ZeroAddress();
    error EmptyString();

    // ============ Functions ============

    function approveInstitution(address institutionWallet) external;
    function revokeInstitution(address institutionWallet) external;
    function isAuthenticatedInstitution(address institution) external view returns (bool);

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
    ) external returns (uint256 artworkId);

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
    ) external returns (uint256 artworkId);

    function initiateTransfer(
        uint256 artworkId,
        address buyer,
        address intermediary,
        uint256 transferDate,
        bytes32 priceCommitment,
        bytes32[] calldata supportingDocCids
    ) external returns (uint256 transferId);

    function acceptTransfer(uint256 transferId) external;
    function expireTransfer(uint256 transferId) external;
    function cancelTransfer(uint256 transferId, string calldata reason) external;

    function appendAmendmentRecord(
        uint256 artworkId,
        string calldata reason
    ) external returns (uint256 amendmentId);

    function flagArtwork(
        uint256 artworkId,
        FlagType flagType,
        string calldata reason,
        string calldata evidenceRef
    ) external returns (uint256 flagId);

    function resolveFlag(uint256 flagId, string calldata reason) external;

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
    );

    function getCurrentOwner(uint256 artworkId) external view returns (address);
    function getTransfer(uint256 transferId) external view returns (Transfer memory);
    function getArtworkTransfers(uint256 artworkId) external view returns (uint256[] memory);
    function getArtworkAmendments(uint256 artworkId) external view returns (uint256[] memory);
    function getArtworkFlags(uint256 artworkId) external view returns (uint256[] memory);
    function getPendingTransferId(uint256 artworkId) external view returns (uint256);
}
