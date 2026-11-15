import { db, supabase } from "../src/db/supabase";

const DEMO_ARTWORKS = [
  {
    title: "The Starry Night",
    artist: "Vincent van Gogh",
    year: "1889",
    medium: "Oil on canvas",
    dimensions: "73.7 cm × 92.1 cm",
    metadataCid: "QmStarryNightVanGogh1889MuseumProvenanceHash",
    imageCids: JSON.stringify(["https://upload.wikimedia.org/wikipedia/commons/e/ea/Van_Gogh_-_Starry_Night_-_Google_Art_Project.jpg"]),
    documentCids: JSON.stringify(["QmConservationReportMuseumVanGogh"]),
    bindingReference: "NFC-BOUND-VANGOGH-1889",
    status: "VERIFIED",
  },
  {
    title: "Girl with a Pearl Earring",
    artist: "Johannes Vermeer",
    year: "1665",
    medium: "Oil on canvas",
    dimensions: "44.5 cm × 39.0 cm",
    metadataCid: "QmVermeerPearlEarring1665MuseumProvenanceHash",
    imageCids: JSON.stringify(["https://upload.wikimedia.org/wikipedia/commons/0/0f/1665_Girl_with_a_Pearl_Earring.jpg"]),
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
    imageCids: JSON.stringify(["https://upload.wikimedia.org/wikipedia/commons/4/40/The_Kiss_-_Gustav_Klimt_-_Google_Cultural_Institute.jpg"]),
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

  console.log(`2️⃣ Seeding exactly 3 custom demo artworks for collector: ${pranav?.name || ownerId}...`);

  for (const art of DEMO_ARTWORKS) {
    await db.artworks.create({
      ...art,
      ownerId: ownerId,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    } as any);
  }

  console.log("🎉 Successfully seeded 3 custom demo artworks with pictures!");
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error("❌ Seeding failed:", err);
    process.exit(1);
  });
