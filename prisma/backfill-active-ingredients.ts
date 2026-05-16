// prisma/backfill-active-ingredients.ts
// Populates activeIngredient on the 49 chemical products (rodenticides, insecticides, fumigants).
// Run: npx dotenv -e .env.local -- npx tsx prisma/backfill-active-ingredients.ts

import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const ACTIVE_INGREDIENTS: Record<string, string> = {
  // ===== Rodenticides =====
  "ROD-001": "Bromethalin 0.01%",
  "ROD-002": "Bromethalin 0.01%",
  "ROD-003": "Bromadiolone 0.005%",
  "ROD-004": "Brodifacoum 0.005%",
  "ROD-005": "Brodifacoum 0.005%",
  "ROD-006": "Difethialone 0.0025%",
  "ROD-007": "Difethialone 0.0025%",
  "ROD-008": "Bromadiolone 0.005%",
  "ROD-009": "Bromadiolone 0.005%",
  "ROD-010": "Difethialone 0.0025%",
  "ROD-011": "Brodifacoum 0.005%",
  "ROD-012": "Difethialone 0.0025%",

  // ===== Insecticides (General Pest) =====
  "INS-001": "Imidacloprid + Beta-cyfluthrin",
  "INS-002": "Imidacloprid + Beta-cyfluthrin",
  "INS-003": "Deltamethrin 4.75%",
  "INS-004": "Deltamethrin 4.75%",
  "INS-005": "Lambda-cyhalothrin 9.7%",
  "INS-006": "Lambda-cyhalothrin 9.7%",
  "INS-007": "Cypermethrin 40%",
  "INS-008": "Cyfluthrin 6%",
  "INS-009": "Bifenthrin 7.9%",
  "INS-010": "Esfenvalerate + prallethrin",
  "INS-011": "Beta-cyfluthrin 11.8%",
  "INS-012": "Chlorfenapyr 21.45%",
  "INS-013": "Fipronil 0.05%",
  "INS-014": "Imidacloprid 0.03%",
  "INS-015": "Fipronil 0.05%",
  "INS-016": "Indoxacarb 0.6%",
  "INS-017": "Indoxacarb 0.05%",
  "INS-018": "Thiamethoxam 0.01%",
  "INS-019": "Abamectin B1 0.011%",
  "INS-020": "Hydroprene (IGR)",
  "INS-021": "Hydroprene 9% (IGR)",
  "INS-022": "Pyriproxyfen 10% (IGR)",
  "INS-023": "Dinotefuran 0.5%",
  "INS-024": "Pyrethrins + Piperonyl Butoxide",
  "INS-025": "Silica gel 92.1%",
  "INS-026": "Pyrethrins + Silica",

  // ===== Termiticides (Termite/WDO) =====
  "INS-027": "Fipronil 9.1%",
  "INS-028": "Fipronil 9.1%",
  "INS-029": "Imidacloprid 75%",

  // ===== Round 2 additions =====
  "INS-030": "Zeta-cypermethrin + Bifenthrin",
  "INS-031": "Disodium Octaborate Tetrahydrate (DOT)",
  "INS-032": "Fipronil 9.1%",
  "INS-033": "Fipronil 9.1%",
  "INS-034": "Deltamethrin 0.05%",
  "INS-035": "Proprietary pyrethroid blend (Victory)",

  // ===== Vendetta line =====
  "INS-036": "Abamectin B1 + S-methoprene (IGR)",
  "INS-037": "Abamectin B1",
  "INS-038": "Clothianidin",

  // ===== Fumigants =====
  "FUM-001": "Sulfuryl fluoride 99.8%",
  "FUM-002": "Aluminum phosphide",
  "FUM-003": "Sulfuryl fluoride 99.8%",
};

async function main() {
  console.log("Backfilling activeIngredient on chemical products...\n");

  let updated = 0;
  let unchanged = 0;
  let notFound = 0;

  for (const [sku, ai] of Object.entries(ACTIVE_INGREDIENTS)) {
    const product = await prisma.product.findFirst({ where: { sku } });

    if (!product) {
      console.error(`X Not found:  ${sku}`);
      notFound++;
      continue;
    }

    // After `prisma db push`, the regenerated client has activeIngredient typed.
    // If your editor still shows red, restart TS server.
    if ((product as any).activeIngredient === ai) {
      console.log(`. Already set: ${sku}`);
      unchanged++;
      continue;
    }

    await prisma.product.update({
      where: { id: product.id },
      data: { activeIngredient: ai } as any,
    });
    console.log(`+ Updated:    ${sku.padEnd(8)} -> ${ai}`);
    updated++;
  }

  console.log("\n----------------------------------------");
  console.log(`+ Updated:   ${updated}`);
  console.log(`. Unchanged: ${unchanged}`);
  console.log(`X Not found: ${notFound}`);
  console.log(`  Total:     ${Object.keys(ACTIVE_INGREDIENTS).length}`);
  console.log("----------------------------------------");
}

main()
  .catch((e) => {
    console.error("FATAL:", e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
