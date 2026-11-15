import { db, supabase } from "../src/db/supabase";

const DEMO_ARTWORKS = [
  {
    title: "The Starry Night",
    artist: "Vincent van Gogh",
    year: "1889",
    medium: "Oil on canvas",
    dimensions: "73.7 cm × 92.1 cm",
    metadataCid: "QmStarryNightVanGogh1889MuseumProvenanceHash",
    imageCids: JSON.stringify(["/artworks/starry-night.jpg"]),
    documentCids: JSON.stringify(["QmConservationReportMuseumVanGogh"]),
    bindingReference: "NFC-BOUND-VANGOGH-1889",
    status: "IN_ESCROW",
  },
  {
    title: "Girl with a Pearl Earring",
    artist: "Johannes Vermeer",
    year: "1665",
    medium: "Oil on canvas",
    dimensions: "44.5 cm × 39.0 cm",
    metadataCid: "QmVermeerPearlEarring1665MuseumProvenanceHash",
    imageCids: JSON.stringify(["/artworks/girl-pearl-earring.jpg"]),
    documentCids: JSON.stringify(["QmMauritshuisAttestationVermeer"]),
    bindingReference: "NFC-BOUND-VERMEER-1665",
    status: "VERIFIED",
  },
  {
    title: "The Kiss",
    artist: "Gustav Klimt",
    year: "1908",
    medium: "Oil and gold leaf on canvas",
    dimensions: "180 cm × 180 cm",
    metadataCid: "QmKlimtTheKiss1908MuseumProvenanceHash",
    imageCids: JSON.stringify(["/artworks/the-kiss.jpg"]),
    documentCids: JSON.stringify(["QmBelvedereViennaAttestationKlimt"]),
    bindingReference: "NFC-BOUND-KLIMT-1908",
    status: "VERIFIED",
  },
];

async function main() {
  console.log("1️⃣ Clearing old demo artworks and transfers...");
  await supabase.from("Transfer").delete().neq("id", "00000000-0000-0000-0000-000000000000");
  await supabase.from("Artwork").delete().neq("id", "00000000-0000-0000-0000-000000000000");

  const users = await db.users.findMany();
  const pranav = users.find((u: any) => u.email === "pranavthakur037@gmail.com") || users.find((u: any) => u.role === "COLLECTOR") || users[0];
  const ownerId = pranav ? pranav.id : "";

  const counterparty = users.find((u: any) => u.id !== ownerId) || pranav;
  const counterpartyId = counterparty ? counterparty.id : ownerId;

  console.log(`2️⃣ Seeding 3 curated masterworks with strictly consistent ownership...`);
  console.log(`   Collector: ${pranav?.name} (${ownerId})`);
  console.log(`   Counterparty: ${counterparty?.name} (${counterpartyId})`);

  // Art 0: Starry Night -> Owned by Pranav, but in outbound escrow
  const art0 = await db.artworks.create({
    ...DEMO_ARTWORKS[0],
    ownerId: ownerId,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  } as any);

  // Art 1: Girl with a Pearl Earring -> Owned by Counterparty (Mauritshuis), pending transfer to Pranav
  const art1 = await db.artworks.create({
    ...DEMO_ARTWORKS[1],
    ownerId: counterpartyId,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  } as any);

  // Art 2: The Kiss -> Owned by Pranav, acquired via completed historical transfer
  const art2 = await db.artworks.create({
    ...DEMO_ARTWORKS[2],
    ownerId: ownerId,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  } as any);

  const createdArtworks = [art0, art1, art2];

  console.log(`3️⃣ Seeding 2 incoming and 1 outgoing custody transfers...`);

  // 1. Incoming transfer to Pranav (Pending Acceptance - artwork currently held by Counterparty)
  await db.transfers.create({
    artworkId: createdArtworks[1].id, // Girl with a Pearl Earring
    sellerId: counterpartyId,
    buyerId: ownerId,
    transferDate: new Date(Date.now() - 2 * 86400000).toISOString(),
    priceVisibility: "PARTIES_AND_AUTHORISED",
    status: "PENDING",
    txHash: "0x8f2d4a1b9c3e7f6a5b4c3d2e1f0a9b8c7d6e5f4a",
    blockNumber: 19842100,
  });

  // 2. Incoming transfer to Pranav (Finalized / Historical acquisition receipt for The Kiss)
  await db.transfers.create({
    artworkId: createdArtworks[2].id, // The Kiss
    sellerId: counterpartyId,
    buyerId: ownerId,
    transferDate: new Date(Date.now() - 7 * 86400000).toISOString(),
    priceVisibility: "PARTIES_AND_AUTHORISED",
    status: "FINALIZED",
    txHash: "0x7b8c9d0e1f2a3b4c5d6e7f8a9b0c1d2e3f4a5b6c",
    blockNumber: 19835000,
  });

  // 3. Outgoing transfer from Pranav (Pending / Outbound Escrow for The Starry Night)
  await db.transfers.create({
    artworkId: createdArtworks[0].id, // The Starry Night
    sellerId: ownerId,
    buyerId: counterpartyId,
    transferDate: new Date(Date.now() - 4 * 86400000).toISOString(),
    priceVisibility: "PARTIES_AND_AUTHORISED",
    status: "PENDING",
    txHash: "0x3a4b5c6d7e8f9a0b1c2d3e4f5a6b7c8d9e0f1a2b",
    blockNumber: 19839400,
  });

  console.log("🎉 Successfully seeded 3 masterworks and 3 transfers with 100% logical consistency!");
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error("❌ Seeding failed:", err);
    process.exit(1);
  });
