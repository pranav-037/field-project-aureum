const { expect } = require("chai");
const { ethers } = require("hardhat");
const { time } = require("@nomicfoundation/hardhat-network-helpers");

describe("ArtchainRegistry Smart Contract Suite", function () {
  let registry;
  let admin, institution, collectorA, collectorB, galleryBroker, intruder;

  // Sample IPFS CIDs represented as bytes32 hashes
  const sampleMetadataCid = ethers.keccak256(ethers.toUtf8Bytes("ipfs://QmMetadataSampleHash123456789"));
  const sampleDocCid = ethers.keccak256(ethers.toUtf8Bytes("ipfs://QmCertificateSampleDoc123456789"));
  const sampleImageCid = ethers.keccak256(ethers.toUtf8Bytes("ipfs://QmArtworkImageSample123456789"));
  const bindingRef = "NFC-CHIP-UUID-7729-PHYSICAL-TAG";

  beforeEach(async function () {
    [admin, institution, collectorA, collectorB, galleryBroker, intruder] = await ethers.getSigners();

    const ArtchainRegistry = await ethers.getContractFactory("ArtchainRegistry");
    registry = await ArtchainRegistry.deploy(admin.address);
    await registry.waitForDeployment();

    // Approve institution
    await registry.connect(admin).approveInstitution(institution.address);
  });

  describe("1. Access Control & Institutional Management", function () {
    it("Should configure default admin and roles on deployment", async function () {
      const ARTCHAIN_ADMIN = await registry.ARTCHAIN_ADMIN();
      const PAUSER_ROLE = await registry.PAUSER_ROLE();

      expect(await registry.hasRole(ARTCHAIN_ADMIN, admin.address)).to.be.true;
      expect(await registry.hasRole(PAUSER_ROLE, admin.address)).to.be.true;
    });

    it("Should allow ARTCHAIN_ADMIN to approve an institution and grant AUTHENTICATOR role", async function () {
      const AUTHENTICATOR = await registry.AUTHENTICATOR();

      expect(await registry.isAuthenticatedInstitution(institution.address)).to.be.true;
      expect(await registry.hasRole(AUTHENTICATOR, institution.address)).to.be.true;
    });

    it("Should prevent non-admin from approving institutions", async function () {
      await expect(
        registry.connect(intruder).approveInstitution(intruder.address)
      ).to.be.revertedWithCustomError(registry, "AccessControlUnauthorizedAccount");
    });

    it("Should allow ARTCHAIN_ADMIN to revoke an institution", async function () {
      const AUTHENTICATOR = await registry.AUTHENTICATOR();

      await expect(registry.connect(admin).revokeInstitution(institution.address))
        .to.emit(registry, "InstitutionRevoked")
        .withArgs(institution.address);

      expect(await registry.isAuthenticatedInstitution(institution.address)).to.be.false;
      expect(await registry.hasRole(AUTHENTICATOR, institution.address)).to.be.false;
    });

    it("Should update transfer timeout duration when set by admin", async function () {
      const newTimeout = 7 * 24 * 3600; // 7 days
      await expect(registry.connect(admin).setTransferTimeout(newTimeout))
        .to.emit(registry, "TransferTimeoutUpdated");

      expect(await registry.transferTimeout()).to.equal(newTimeout);
    });
  });

  describe("2. Genesis Record Creation", function () {
    it("Should allow an approved institution to create a Genesis record with owner", async function () {
      const tx = await registry.connect(institution).createGenesisRecordWithOwner(
        "L'Étoile Seraphique",
        "Aurelia Vance",
        "2024",
        "Oil on Belgian Linen",
        "120 x 90 cm",
        "Original 1 of 1",
        "Micro-spectroscopy + NFC cryptographic anchor",
        sampleMetadataCid,
        [sampleDocCid],
        [sampleImageCid],
        bindingRef,
        collectorA.address // Explicit initial owner
      );

      const receipt = await tx.wait();
      expect(receipt.status).to.equal(1);

      // Verify artwork state
      const artwork = await registry.getArtwork(1);
      expect(artwork.id).to.equal(1);
      expect(artwork.authenticator).to.equal(institution.address);
      expect(artwork.initialOwner).to.equal(collectorA.address);
      expect(artwork.metadataCid).to.equal(sampleMetadataCid);
      expect(artwork.bindingReference).to.equal(bindingRef);
      expect(artwork.status).to.equal(0); // ArtworkStatus.VERIFIED

      // Check current owner
      expect(await registry.getCurrentOwner(1)).to.equal(collectorA.address);
    });

    it("Should default initial owner to msg.sender when using createGenesisRecord", async function () {
      await registry.connect(institution).createGenesisRecord(
        "Golden Horizon",
        "Marcus Sterling",
        "2023",
        "Bronze and Gold Leaf",
        "45 x 30 x 30 cm",
        "1 of 5",
        "Physical Provenance Inspection",
        sampleMetadataCid,
        [sampleDocCid],
        [sampleImageCid],
        bindingRef
      );

      expect(await registry.getCurrentOwner(1)).to.equal(institution.address);
    });

    it("Should reject Genesis creation from unauthorized accounts", async function () {
      await expect(
        registry.connect(intruder).createGenesisRecordWithOwner(
          "Forged Masterpiece",
          "Unknown",
          "2026",
          "Oil",
          "10x10",
          "1/1",
          "None",
          sampleMetadataCid,
          [sampleDocCid],
          [sampleImageCid],
          bindingRef,
          intruder.address
        )
      ).to.be.revertedWithCustomError(registry, "AccessControlUnauthorizedAccount");
    });

    it("Should revert if required fields are missing", async function () {
      await expect(
        registry.connect(institution).createGenesisRecordWithOwner(
          "", // Empty title
          "Artist",
          "2024",
          "Oil",
          "100x100",
          "1/1",
          "Method",
          sampleMetadataCid,
          [sampleDocCid],
          [sampleImageCid],
          bindingRef,
          collectorA.address
        )
      ).to.be.revertedWithCustomError(registry, "EmptyString");
    });
  });

  describe("3. Two-Party Consent Ownership Transfers", function () {
    let artworkId;

    beforeEach(async function () {
      // Register artwork with collectorA as owner
      const tx = await registry.connect(institution).createGenesisRecordWithOwner(
        "L'Étoile Seraphique",
        "Aurelia Vance",
        "2024",
        "Oil on Belgian Linen",
        "120 x 90 cm",
        "Original",
        "NFC",
        sampleMetadataCid,
        [sampleDocCid],
        [sampleImageCid],
        bindingRef,
        collectorA.address
      );
      await tx.wait();
      artworkId = 1;
    });

    it("Should allow the current owner to initiate an ownership transfer", async function () {
      const priceCommitment = ethers.keccak256(ethers.toUtf8Bytes("salt-1200000-EUR"));

      const tx = await registry.connect(collectorA).initiateTransfer(
        artworkId,
        collectorB.address,
        ethers.ZeroAddress, // Direct transfer without intermediary
        0, // Use current block timestamp
        priceCommitment,
        [sampleDocCid]
      );

      await expect(tx)
        .to.emit(registry, "TransferInitiated")
        .withArgs(
          1,
          artworkId,
          collectorA.address,
          collectorB.address,
          ethers.ZeroAddress,
          (await ethers.provider.getBlock(tx.blockNumber)).timestamp,
          priceCommitment,
          [sampleDocCid]
        );

      expect(await registry.getPendingTransferId(artworkId)).to.equal(1);

      const transfer = await registry.getTransfer(1);
      expect(transfer.status).to.equal(0); // TransferStatus.PENDING
      expect(transfer.seller).to.equal(collectorA.address);
      expect(transfer.buyer).to.equal(collectorB.address);
    });

    it("Should prevent non-owners from initiating transfer", async function () {
      await expect(
        registry.connect(intruder).initiateTransfer(
          artworkId,
          intruder.address,
          ethers.ZeroAddress,
          0,
          ethers.ZeroHash,
          []
        )
      ).to.be.revertedWithCustomError(registry, "NotAuthorized");
    });

    it("Should prevent initiating another transfer while one is already pending", async function () {
      await registry.connect(collectorA).initiateTransfer(
        artworkId,
        collectorB.address,
        ethers.ZeroAddress,
        0,
        ethers.ZeroHash,
        []
      );

      await expect(
        registry.connect(collectorA).initiateTransfer(
          artworkId,
          intruder.address,
          ethers.ZeroAddress,
          0,
          ethers.ZeroHash,
          []
        )
      ).to.be.revertedWithCustomError(registry, "PendingTransferExists");
    });

    it("Should allow the designated buyer to accept transfer and update ownership", async function () {
      await registry.connect(collectorA).initiateTransfer(
        artworkId,
        collectorB.address,
        ethers.ZeroAddress,
        0,
        ethers.ZeroHash,
        []
      );

      // Non-buyer cannot accept
      await expect(
        registry.connect(intruder).acceptTransfer(1)
      ).to.be.revertedWithCustomError(registry, "NotAuthorized");

      // Buyer accepts
      const tx = await registry.connect(collectorB).acceptTransfer(1);
      await expect(tx).to.emit(registry, "TransferFinalized");

      // Ownership updated
      expect(await registry.getCurrentOwner(artworkId)).to.equal(collectorB.address);
      expect(await registry.getPendingTransferId(artworkId)).to.equal(0);

      const transfer = await registry.getTransfer(1);
      expect(transfer.status).to.equal(1); // TransferStatus.FINALIZED
    });

    it("Should allow consecutive transfers across multiple owners", async function () {
      // Transfer 1: CollectorA -> CollectorB
      await registry.connect(collectorA).initiateTransfer(artworkId, collectorB.address, ethers.ZeroAddress, 0, ethers.ZeroHash, []);
      await registry.connect(collectorB).acceptTransfer(1);

      // Transfer 2: CollectorB -> Intruder
      await registry.connect(collectorB).initiateTransfer(artworkId, intruder.address, ethers.ZeroAddress, 0, ethers.ZeroHash, []);
      await registry.connect(intruder).acceptTransfer(2);

      expect(await registry.getCurrentOwner(artworkId)).to.equal(intruder.address);

      const transfers = await registry.getArtworkTransfers(artworkId);
      expect(transfers.length).to.equal(2);
    });

    it("Should allow seller to cancel a pending transfer", async function () {
      await registry.connect(collectorA).initiateTransfer(artworkId, collectorB.address, ethers.ZeroAddress, 0, ethers.ZeroHash, []);

      await expect(registry.connect(collectorA).cancelTransfer(1, "Buyer backed out"))
        .to.emit(registry, "TransferCancelled")
        .withArgs(1, artworkId, collectorA.address, "Buyer backed out");

      expect(await registry.getPendingTransferId(artworkId)).to.equal(0);
      const transfer = await registry.getTransfer(1);
      expect(transfer.status).to.equal(3); // TransferStatus.CANCELLED
    });

    it("Should expire transfer after timeout window", async function () {
      await registry.connect(collectorA).initiateTransfer(artworkId, collectorB.address, ethers.ZeroAddress, 0, ethers.ZeroHash, []);

      // Fast-forward 15 days (timeout is 14 days)
      await time.increase(15 * 24 * 3600);

      // Anyone can trigger expireTransfer once elapsed
      await expect(registry.connect(intruder).expireTransfer(1))
        .to.emit(registry, "TransferExpired")
        .withArgs(1, artworkId, collectorA.address);

      expect(await registry.getPendingTransferId(artworkId)).to.equal(0);
      const transfer = await registry.getTransfer(1);
      expect(transfer.status).to.equal(2); // TransferStatus.EXPIRED
    });
  });

  describe("4. Amendments & Dispute Flags", function () {
    let artworkId;

    beforeEach(async function () {
      await registry.connect(institution).createGenesisRecordWithOwner(
        "L'Étoile Seraphique",
        "Aurelia Vance",
        "2024",
        "Oil on Linen",
        "120 x 90 cm",
        "Original",
        "NFC",
        sampleMetadataCid,
        [sampleDocCid],
        [sampleImageCid],
        bindingRef,
        collectorA.address
      );
      artworkId = 1;
    });

    it("Should allow authenticator to append provenance amendments", async function () {
      const reason = "Re-framed with museum-grade UV conservation glass";
      const tx = await registry.connect(institution).appendAmendmentRecord(artworkId, reason);

      await expect(tx)
        .to.emit(registry, "AmendmentAppended")
        .withArgs(1, artworkId, institution.address, reason, (await ethers.provider.getBlock(tx.blockNumber)).timestamp);

      const amendments = await registry.getArtworkAmendments(artworkId);
      expect(amendments.length).to.equal(1);

      const amendment = await registry.getAmendment(1);
      expect(amendment.reason).to.equal(reason);
      expect(amendment.issuer).to.equal(institution.address);
    });

    it("Should allow authorized parties to flag an artwork and put it into DISPUTED status", async function () {
      const reason = "Reported stolen during transit to Basel";
      const tx = await registry.connect(collectorA).flagArtwork(
        artworkId,
        1, // FlagType.REPORTED_STOLEN
        reason,
        "INTERPOL-FILE-2026-9938B"
      );

      await expect(tx).to.emit(registry, "FlagCreated");

      const artwork = await registry.getArtwork(artworkId);
      expect(artwork.status).to.equal(3); // ArtworkStatus.DISPUTED

      // Pending transfer cannot be initiated while disputed
      await expect(
        registry.connect(collectorA).initiateTransfer(artworkId, collectorB.address, ethers.ZeroAddress, 0, ethers.ZeroHash, [])
      ).to.be.revertedWithCustomError(registry, "ArtworkNotVerifiable");
    });

    it("Should restore VERIFIED status once all dispute flags are resolved", async function () {
      await registry.connect(collectorA).flagArtwork(artworkId, 0, "Title ownership dispute", "COURT-CASE-123");

      let artwork = await registry.getArtwork(artworkId);
      expect(artwork.status).to.equal(3); // DISPUTED

      // Resolve flag
      await expect(registry.connect(collectorA).resolveFlag(1, "Settlement agreement signed"))
        .to.emit(registry, "FlagResolved");

      artwork = await registry.getArtwork(artworkId);
      expect(artwork.status).to.equal(0); // Restored to VERIFIED
    });
  });

  describe("5. Emergency Pausing", function () {
    it("Should allow PAUSER_ROLE to pause and unpause the contract", async function () {
      await registry.connect(admin).pause();

      await expect(
        registry.connect(institution).createGenesisRecordWithOwner(
          "Test Art", "Artist", "2024", "Oil", "10x10", "1/1", "Method",
          sampleMetadataCid, [sampleDocCid], [sampleImageCid], bindingRef, collectorA.address
        )
      ).to.be.revertedWithCustomError(registry, "EnforcedPause");

      await registry.connect(admin).unpause();

      await expect(
        registry.connect(institution).createGenesisRecordWithOwner(
          "Test Art", "Artist", "2024", "Oil", "10x10", "1/1", "Method",
          sampleMetadataCid, [sampleDocCid], [sampleImageCid], bindingRef, collectorA.address
        )
      ).to.not.be.reverted;
    });
  });
});
