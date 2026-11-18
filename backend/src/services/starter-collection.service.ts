import { db, supabase } from '../db/supabase';

const custodianId = 'aureum-starter-custodian';
const artworks = [
  ['The Starry Night', 'Vincent van Gogh', '1889', 'Oil on canvas', '73.7 × 92.1 cm', 'starry-night', 'IN_ESCROW'],
  ['Girl with a Pearl Earring', 'Johannes Vermeer', '1665', 'Oil on canvas', '44.5 × 39 cm', 'girl-pearl-earring', 'VERIFIED'],
  ['The Kiss', 'Gustav Klimt', '1908', 'Oil and gold leaf on canvas', '180 × 180 cm', 'the-kiss', 'VERIFIED'],
  ['The Great Wave off Kanagawa', 'Katsushika Hokusai', '1831', 'Woodblock print', '25.7 × 37.8 cm', 'great-wave', 'VERIFIED'],
  ['The Birth of Venus', 'Sandro Botticelli', '1485', 'Tempera on canvas', '172.5 × 278.9 cm', 'birth-of-venus', 'VERIFIED'],
];

interface CollectionArtwork {
  id: string;
  title: string;
  artist: string;
  ownerId: string;
  bindingReference?: string;
  blockchainArtworkId?: string | null;
}

function artworkKey(artwork: Pick<CollectionArtwork, 'title' | 'artist'>): string {
  return `${artwork.title.replace(/\s*\(sample\)$/i, '').trim().toLowerCase()}|${artwork.artist.trim().toLowerCase()}`;
}

// Only coalesce known demo records. Distinct registered artworks keep their IDs.
export function uniqueCollectionArtworks<T extends CollectionArtwork>(records: T[], userId?: string, walletAddress?: string | null): T[] {
  const selected = new Map<string, T>();
  const priority = (artwork: T) => {
    if (userId && artwork.ownerId === userId) return 3;
    if (walletAddress && artwork.ownerId?.toLowerCase() === walletAddress.toLowerCase()) return 3;
    if (userId && artwork.id.startsWith(`starter-${userId}-`)) return 2;
    return 1;
  };
  for (const artwork of records) {
    const demo = !artwork.blockchainArtworkId && (
      artwork.id.startsWith('starter-') || artwork.bindingReference?.startsWith('NFC-BOUND-')
    ) && artworks.some(([title, artist]) => artworkKey({ title, artist }) === artworkKey(artwork));
    const key = demo ? artworkKey(artwork) : artwork.id;
    const previous = selected.get(key);
    if (!previous || priority(artwork) > priority(previous)) selected.set(key, artwork);
  }
  return [...selected.values()];
}

// Stable IDs and insert-only upserts preserve ownership and decisions on retries.
export async function seedStarterCollection(userId: string): Promise<void> {
  if (userId === custodianId) return;
  const { error: custodianError } = await supabase.from('User').upsert({
    id: custodianId,
    name: 'Aureum Sample Collection',
    email: 'starter-custodian@aureum.invalid',
    role: 'COLLECTOR',
    password: '',
  }, { onConflict: 'id', ignoreDuplicates: true });
  if (custodianError) throw custodianError;

  const [existingArtworks, existingTransfers] = await Promise.all([
    db.artworks.findMany('*'),
    db.transfers.findMany(),
  ]);
  const linkedIds = new Set(existingTransfers.filter((transfer) =>
    [transfer.sellerId, transfer.buyerId, transfer.senderUserId, transfer.recipientUserId].includes(userId)
  ).map((transfer) => transfer.artworkId));
  const existingByKey = new Map<string, CollectionArtwork>(existingArtworks
    .filter((artwork) => !artwork.id.startsWith('starter-') &&
      (artwork.ownerId === userId || linkedIds.has(artwork.id)))
    .map((artwork) => [artworkKey(artwork), artwork]));

  const records = artworks.map(([title, artist, year, medium, dimensions, image, status], index) => ({
    id: `starter-${userId}-${index}`,
    title: `${title} (sample)`,
    artist,
    year,
    medium,
    dimensions,
    imageCids: JSON.stringify([`/artworks/${image}.jpg`]),
    documentCids: '[]',
    metadataCid: '',
    bindingReference: `SAMPLE-${userId}-${index}`,
    status,
    ownerId: index < 3 ? userId : custodianId,
  }));
  const missingRecords = records.filter((record) => !existingByKey.has(artworkKey(record)));
  if (missingRecords.length > 0) {
    const { error: artworkError } = await supabase.from('Artwork')
      .upsert(missingRecords, { onConflict: 'id', ignoreDuplicates: true });
    if (artworkError) throw artworkError;
  }

  const transfers = [0, 3, 4].filter((index) => !existingByKey.has(artworkKey(records[index]))).map((index) => ({
    id: `starter-transfer-${userId}-${index}`,
    artworkId: records[index].id,
    sellerId: index === 0 ? userId : custodianId,
    buyerId: index === 0 ? custodianId : userId,
    senderUserId: index === 0 ? userId : custodianId,
    recipientUserId: index === 0 ? custodianId : userId,
    transferDate: new Date().toISOString(),
    priceVisibility: 'PARTIES_AND_AUTHORISED',
    status: 'pending',
    txHash: '',
    blockNumber: 0,
  }));
  if (transfers.length > 0) {
    const { error: transferError } = await supabase.from('Transfer')
      .upsert(transfers, { onConflict: 'id', ignoreDuplicates: true });
    if (transferError) throw transferError;
  }
}

const provisioning = new Map<string, Promise<void>>();

export function ensureStarterCollection(userId: string): Promise<void> {
  const existing = provisioning.get(userId);
  if (existing) return existing;
  const pending = seedStarterCollection(userId).catch((error) => {
    provisioning.delete(userId);
    throw error;
  });
  provisioning.set(userId, pending);
  return pending;
}
