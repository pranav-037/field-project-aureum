import assert from 'node:assert/strict';
import {
  approveUserTransfer,
  initiateUserTransfer,
  listIncomingUserTransfers,
  rejectUserTransfer,
  TransferArtwork,
  TransferUser,
  UserTransfer,
  UserTransferError,
  UserTransferRepository,
} from './user-transfer.service';

class InMemoryTransferRepository implements UserTransferRepository {
  readonly sender: TransferUser = {
    id: 'sender-1',
    email: 'sender@example.com',
    name: 'Sender',
    role: 'COLLECTOR',
  };
  readonly recipient: TransferUser = {
    id: 'recipient-1',
    email: 'recipient@example.com',
    name: 'Recipient',
    role: 'COLLECTOR',
  };
  artwork: TransferArtwork = { id: 'artwork-1', title: 'The Artwork', ownerId: 'sender-1' };
  transfers: UserTransfer[] = [];

  async findArtwork(id: string) {
    return this.artwork.id === id ? this.artwork : null;
  }
  async findUser(id: string) {
    return [this.sender, this.recipient].find((user) => user.id === id) || null;
  }
  async findUserByEmail(email: string) {
    return [this.sender, this.recipient].find((user) => user.email === email) || null;
  }
  async findPendingTransferForArtwork(artworkId: string) {
    return this.transfers.find((transfer) => transfer.artworkId === artworkId && transfer.status === 'pending') || null;
  }
  async createTransfer(data: Omit<UserTransfer, 'id' | 'createdAt' | 'updatedAt'>) {
    if (this.transfers.some((transfer) =>
      transfer.artworkId === data.artworkId && transfer.status === 'pending'
    )) {
      throw Object.assign(new Error('duplicate'), { code: '23505' });
    }
    const now = new Date().toISOString();
    const transfer: UserTransfer = {
      ...data,
      id: `transfer-${this.transfers.length + 1}`,
      createdAt: now,
      updatedAt: now,
    };
    this.transfers.push(transfer);
    return transfer;
  }
  async listIncomingTransfers(recipientUserId: string) {
    return this.transfers.filter((transfer) =>
      transfer.recipientUserId === recipientUserId && transfer.status === 'pending'
    );
  }
  async findTransfer(id: string) {
    return this.transfers.find((transfer) => transfer.id === id) || null;
  }
  async approveTransferAtomically(input: {
    transferId: string;
    recipientUserId: string;
    senderUserId: string;
    senderWalletAddress?: string | null;
  }) {
    const transfer = await this.findTransfer(input.transferId);
    if (
      !transfer ||
      transfer.status !== 'pending' ||
      transfer.recipientUserId !== input.recipientUserId ||
      transfer.senderUserId !== input.senderUserId ||
      this.artwork.ownerId !== input.senderUserId
    ) return null;

    this.artwork = { ...this.artwork, ownerId: input.recipientUserId };
    transfer.status = 'accepted';
    transfer.updatedAt = new Date().toISOString();
    return transfer;
  }
  async rejectTransfer(transferId: string, recipientUserId: string) {
    const transfer = await this.findTransfer(transferId);
    if (!transfer || transfer.recipientUserId !== recipientUserId || transfer.status !== 'pending') return null;
    transfer.status = 'rejected';
    transfer.updatedAt = new Date().toISOString();
    return transfer;
  }
}

async function expectStatus(promise: Promise<unknown>, statusCode: number) {
  await assert.rejects(promise, (error: unknown) =>
    error instanceof UserTransferError && error.statusCode === statusCode
  );
}

async function run() {
  const repository = new InMemoryTransferRepository();
  repository.sender.walletAddress = null;
  repository.recipient.walletAddress = null;
  const created = await initiateUserTransfer({
    senderUserId: repository.sender.id,
    artworkId: repository.artwork.id,
    recipientEmail: ' RECIPIENT@example.com ',
  }, repository);
  assert.equal(created.status, 'pending');
  assert.equal(created.recipientUserId, repository.recipient.id);
  assert.equal(created.senderUserId, repository.sender.id);
  assert.equal(repository.artwork.ownerId, repository.sender.id);
  assert.equal((await listIncomingUserTransfers(repository.recipient.id, repository)).length, 1);

  await expectStatus(initiateUserTransfer({
    senderUserId: repository.sender.id,
    artworkId: repository.artwork.id,
    recipientEmail: repository.recipient.email,
  }, repository), 409);

  await expectStatus(approveUserTransfer(created.id, repository.sender.id, repository), 404);
  assert.equal(repository.artwork.ownerId, repository.sender.id);
  const accepted = await approveUserTransfer(created.id, repository.recipient.id, repository);
  assert.equal(accepted.status, 'accepted');
  assert.equal(repository.artwork.ownerId, repository.recipient.id);
  await expectStatus(approveUserTransfer(created.id, repository.recipient.id, repository), 409);

  const duplicateRepository = new InMemoryTransferRepository();
  const duplicateAttempts = await Promise.allSettled([
    initiateUserTransfer({
      senderUserId: duplicateRepository.sender.id,
      artworkId: duplicateRepository.artwork.id,
      recipientEmail: duplicateRepository.recipient.email,
    }, duplicateRepository),
    initiateUserTransfer({
      senderUserId: duplicateRepository.sender.id,
      artworkId: duplicateRepository.artwork.id,
      recipientEmail: duplicateRepository.recipient.email,
    }, duplicateRepository),
  ]);
  assert.equal(duplicateAttempts.filter((attempt) => attempt.status === 'fulfilled').length, 1);
  assert.equal(duplicateAttempts.filter((attempt) => attempt.status === 'rejected').length, 1);

  const rejectRepository = new InMemoryTransferRepository();
  const rejectedRequest = await initiateUserTransfer({
    senderUserId: rejectRepository.sender.id,
    artworkId: rejectRepository.artwork.id,
    recipientEmail: rejectRepository.recipient.email,
  }, rejectRepository);
  await expectStatus(rejectUserTransfer(rejectedRequest.id, rejectRepository.sender.id, rejectRepository), 404);
  const rejected = await rejectUserTransfer(rejectedRequest.id, rejectRepository.recipient.id, rejectRepository);
  assert.equal(rejected.status, 'rejected');
  assert.equal(rejectRepository.artwork.ownerId, rejectRepository.sender.id);

  const roleRepository = new InMemoryTransferRepository();
  roleRepository.recipient.role = 'VIEWER';
  await expectStatus(initiateUserTransfer({
    senderUserId: roleRepository.sender.id,
    artworkId: roleRepository.artwork.id,
    recipientEmail: roleRepository.recipient.email,
  }, roleRepository), 404);

  const invalidRepo = new InMemoryTransferRepository();
  await expectStatus(initiateUserTransfer({
    senderUserId: invalidRepo.sender.id,
    artworkId: ' ',
    recipientEmail: invalidRepo.recipient.email,
  }, invalidRepo), 400);
  await expectStatus(initiateUserTransfer({
    senderUserId: invalidRepo.sender.id,
    artworkId: invalidRepo.artwork.id,
    recipientEmail: 'not-an-email',
  }, invalidRepo), 400);
  await expectStatus(initiateUserTransfer({
    senderUserId: invalidRepo.sender.id,
    artworkId: invalidRepo.artwork.id,
    recipientEmail: 'missing@example.com',
  }, invalidRepo), 404);
  await expectStatus(initiateUserTransfer({
    senderUserId: invalidRepo.sender.id,
    artworkId: invalidRepo.artwork.id,
    recipientEmail: invalidRepo.sender.email,
  }, invalidRepo), 400);
  invalidRepo.artwork = { ...invalidRepo.artwork, ownerId: 'someone-else' };
  await expectStatus(initiateUserTransfer({
    senderUserId: invalidRepo.sender.id,
    artworkId: invalidRepo.artwork.id,
    recipientEmail: invalidRepo.recipient.email,
  }, invalidRepo), 403);

  console.log('User transfer service tests passed.');
}

void run().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
