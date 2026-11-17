export interface TransferUser {
  id: string;
  email: string;
  name: string;
  role: string;
  walletAddress?: string | null;
}

export interface TransferArtwork {
  id: string;
  title: string;
  ownerId: string;
}

export interface UserTransfer {
  id: string;
  artworkId: string;
  sellerId: string;
  buyerId?: string | null;
  senderUserId?: string | null;
  recipientUserId?: string | null;
  status: string;
  transferDate: string;
  createdAt: string;
  updatedAt: string;
}

export interface UserTransferRepository {
  findArtwork(id: string): Promise<TransferArtwork | null>;
  findUser(id: string): Promise<TransferUser | null>;
  findUserByEmail(email: string): Promise<TransferUser | null>;
  findPendingTransferForArtwork(artworkId: string): Promise<UserTransfer | null>;
  createTransfer(data: Omit<UserTransfer, 'id' | 'createdAt' | 'updatedAt'>): Promise<UserTransfer>;
  listIncomingTransfers(recipientUserId: string): Promise<UserTransfer[]>;
  findTransfer(id: string): Promise<UserTransfer | null>;
  approveTransferAtomically(input: {
    transferId: string;
    recipientUserId: string;
    senderUserId: string;
    senderWalletAddress?: string | null;
  }): Promise<UserTransfer | null>;
  rejectTransfer(transferId: string, recipientUserId: string): Promise<UserTransfer | null>;
}

export class UserTransferError extends Error {
  constructor(message: string, readonly statusCode: number) {
    super(message);
    this.name = 'UserTransferError';
  }
}

const isValidEmail = (email: string): boolean =>
  email.length <= 254 && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);

const isOwner = (ownerId: string, sender: TransferUser): boolean =>
  ownerId === sender.id ||
  Boolean(sender.walletAddress && ownerId.toLowerCase() === sender.walletAddress.toLowerCase());

const isUniqueViolation = (error: unknown): boolean =>
  Boolean(error && typeof error === 'object' && 'code' in error && error.code === '23505');

export async function initiateUserTransfer(
  input: { senderUserId: string; artworkId: string; recipientEmail: string },
  repository: UserTransferRepository,
): Promise<UserTransfer> {
  const artworkId = input.artworkId.trim();
  if (!artworkId) throw new UserTransferError('Artwork ID is required.', 400);
  const email = input.recipientEmail.trim().toLowerCase();
  if (!isValidEmail(email)) {
    throw new UserTransferError('Enter a valid recipient email address.', 400);
  }

  const [artwork, sender, recipient] = await Promise.all([
    repository.findArtwork(artworkId),
    repository.findUser(input.senderUserId),
    repository.findUserByEmail(email),
  ]);
  if (!artwork) throw new UserTransferError('Artwork not found.', 404);
  if (!sender) throw new UserTransferError('Sender account not found.', 401);
  if (!isOwner(artwork.ownerId, sender)) {
    throw new UserTransferError('You can only transfer artwork in your custody.', 403);
  }
  if (!recipient || !['COLLECTOR', 'AUTHENTICATOR'].includes(recipient.role)) {
    throw new UserTransferError('No eligible registered recipient was found for that email.', 404);
  }
  if (recipient.id === sender.id) {
    throw new UserTransferError('You cannot transfer artwork to your own account.', 400);
  }

  const pending = await repository.findPendingTransferForArtwork(artwork.id);
  if (pending) throw new UserTransferError('This artwork already has a pending transfer.', 409);

  try {
    return await repository.createTransfer({
      artworkId: artwork.id,
      sellerId: sender.id,
      buyerId: recipient.id,
      senderUserId: sender.id,
      recipientUserId: recipient.id,
      status: 'pending',
      transferDate: new Date().toISOString(),
    });
  } catch (error) {
    if (isUniqueViolation(error)) {
      throw new UserTransferError('This artwork already has a pending transfer.', 409);
    }
    throw error;
  }
}

export async function listIncomingUserTransfers(
  recipientUserId: string,
  repository: UserTransferRepository,
): Promise<UserTransfer[]> {
  return repository.listIncomingTransfers(recipientUserId);
}

async function verifyPendingRecipient(
  transferId: string,
  recipientUserId: string,
  repository: UserTransferRepository,
): Promise<UserTransfer> {
  const transfer = await repository.findTransfer(transferId);
  if (!transfer || transfer.recipientUserId !== recipientUserId) {
    throw new UserTransferError('Pending transfer not found.', 404);
  }
  if (transfer.status !== 'pending') {
    throw new UserTransferError('This transfer is no longer pending.', 409);
  }
  return transfer;
}

export async function approveUserTransfer(
  transferId: string,
  recipientUserId: string,
  repository: UserTransferRepository,
): Promise<UserTransfer> {
  const transfer = await verifyPendingRecipient(transferId, recipientUserId, repository);
  if (!transfer.senderUserId) throw new UserTransferError('Transfer sender is not recorded.', 409);
  const sender = await repository.findUser(transfer.senderUserId);
  if (!sender) throw new UserTransferError('Sender account no longer exists.', 409);

  const updated = await repository.approveTransferAtomically({
    transferId,
    recipientUserId,
    senderUserId: sender.id,
    senderWalletAddress: sender.walletAddress,
  });
  if (!updated) throw new UserTransferError('This transfer is no longer pending.', 409);
  return updated;
}

export async function rejectUserTransfer(
  transferId: string,
  recipientUserId: string,
  repository: UserTransferRepository,
): Promise<UserTransfer> {
  await verifyPendingRecipient(transferId, recipientUserId, repository);
  const updated = await repository.rejectTransfer(transferId, recipientUserId);
  if (!updated) throw new UserTransferError('This transfer is no longer pending.', 409);
  return updated;
}
