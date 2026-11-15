import { db, supabase } from "../src/db/supabase";

const DEMO_TAG = "DEMO_SEED";

async function main() {
  // 1️⃣ Fetch all collector users
  const users = await db.users.findMany();
  const collectors = users.filter((u: any) => u.role === "COLLECTOR");

  if (collectors.length === 0) {
    console.log("No COLLECTOR users found in the database.");
    return;
  }

  console.log(`Found ${collectors.length} collector(s). Starting seed...`);

  for (const collector of collectors) {
    // 2️⃣ Idempotency check
    const { data: existing } = await supabase
      .from("Artwork")
      .select("id")
      .ilike("bindingReference", `${DEMO_TAG}-${collector.id}%`);

    if (existing && existing.length > 0) {
      console.log(`Demo already present for collector ${collector.id} — skipping.`);
      continue;
    }

    // 3️⃣ Insert 3 verified demo artworks
    for (let i = 1; i <= 3; i++) {
      await db.artworks.create({
        title: `Demo Artwork #${i}`,
        artist: "Demo Artist",
        year: "2024",
        medium: "Oil on Canvas",
        dimensions: "60 x 80 cm",
        metadataCid: `QmDemoCid-${collector.id}-${i}`,
        imageCids: "[]",
        documentCids: "[]",
        bindingReference: `${DEMO_TAG}-${collector.id}-${i}`,
        status: "VERIFIED",
        ownerId: collector.id,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      } as any);
    }

    // 4️⃣ Artwork for the pending transfer
    const pendingArt = await db.artworks.create({
      title: "Pending Transfer Artwork",
      artist: "Demo Artist",
      year: "2024",
      medium: "Acrylic on Canvas",
      dimensions: "50 x 70 cm",
      metadataCid: `QmPendingCid-${collector.id}`,
      imageCids: "[]",
      documentCids: "[]",
      bindingReference: `${DEMO_TAG}-${collector.id}-PENDING`,
      status: "VERIFIED",
      ownerId: collector.id,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    } as any);

    // 5️⃣ Pending transfer linked to the artwork
    await db.transfers.create({
      artworkId: pendingArt.id,
      sellerId: collector.id,
      buyerId: null,
      transferDate: new Date().toISOString(),
      priceVisibility: "PARTIES_AND_AUTHORISED",
      status: "PENDING",
      txHash: "0x0000000000000000000000000000000000000000",
      blockNumber: 0,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    } as any);

    console.log(`✅ Seeded 3 demo artworks + 1 pending transfer for collector ${collector.id}`);
  }
}

main()
  .then(() => console.log("🎉 Demo seeding complete"))
  .catch((err) => {
    console.error("❌ Seeding failed:", err);
    process.exit(1);
  });
