import { v4 as uuid } from "uuid";
import { db, supabase } from "../src/db/supabase";

// Simple interfaces matching DB schema (optional)
interface Artwork {
  id?: string;
  title: string;
  artist: string;
  metadataCid: string;
  imageCids: string; // JSON string array
  documentCids: string; // JSON string array
  bindingReference: string;
  status: string;
  ownerId: string;
  createdAt: string;
  updatedAt: string;
}

interface Transfer {
  id?: string;
  artworkId: string;
  sellerId: string;
  buyerId: string | null;
  transferDate: string;
  priceVisibility: string;
  status: string;
  txHash: string;
  blockNumber: number;
  createdAt: string;
  updatedAt: string;
}

const DEMO_TAG = "DEMO_SEED";

async function main() {
  // 1️⃣ Get all collector users
  const users = await db.users.findMany(); // returns array of DbUser
  const collectors = users.filter((u: any) => u.role === "COLLECTOR");

  for (const collector of collectors) {
    // 2️⃣ Check if we already seeded for this collector
    const { data: existing } = await supabase
      .from("Artwork")
      .select("id")
      .ilike("bindingReference", `${DEMO_TAG}-${collector.id}%`);
    if (existing && existing.length > 0) {
      console.log(`Demo already present for collector ${collector.id}`);
      continue;
    }

    // 3️⃣ Insert 3 verified demo artworks
    for (let i = 1; i <= 3; i++) {
      const art: Partial<Artwork> = {
        title: `Demo Artwork #${i}`,
        artist: "Demo Artist",
        metadataCid: `QmDemoCid-${collector.id}-${i}`,
        imageCids: "[]",
        documentCids: "[]",
        bindingReference: `${DEMO_TAG}-${collector.id}-${i}`,
        status: "VERIFIED",
        ownerId: collector.id,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      await db.artworks.create(art);
    }

    // 4️⃣ Artwork that will have a pending transfer
    const pendingArt: Partial<Artwork> = {
      title: "Pending Transfer Artwork",
      artist: "Demo Artist",
      metadataCid: `QmPendingCid-${collector.id}`,
      imageCids: "[]",
      documentCids: "[]",
      bindingReference: `${DEMO_TAG}-${collector.id}-PENDING`,
      status: "VERIFIED",
      ownerId: collector.id,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    const { data: pending } = await db.artworks.create(pendingArt);

    // 5️⃣ Create pending transfer linked to the artwork
    const transfer: Partial<Transfer> = {
      artworkId: (pending as any).id,
      sellerId: collector.id,
      buyerId: null,
      transferDate: new Date().toISOString(),
      priceVisibility: "PARTIES_AND_AUTHORISED",
      status: "PENDING",
      txHash: "0x0000000000000000000000000000000000000000",
      blockNumber: 0,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    await db.transfers.create(transfer);

    console.log(`Seeded demo data for collector ${collector.id}`);
  }
}

main()
  .then(() => console.log("✅ Demo seeding complete"))
  .catch((err) => {
    console.error("❌ Seeding failed", err);
    process.exit(1);
  });
