// scripts/check-units.js
// Diagnostic: shows current UnitOfMeasure records and how products use them.
// Run before the dual-unit migration to understand the current state.

const fs = require("fs");
const path = require("path");

function loadEnvFile(filepath) {
  if (!fs.existsSync(filepath)) return 0;
  let content = fs.readFileSync(filepath, "utf8");
  if (content.charCodeAt(0) === 0xfeff) content = content.slice(1);
  let loaded = 0;
  content.split(/\r?\n/).forEach((line) => {
    const t = line.trim();
    if (!t || t.startsWith("#")) return;
    const eq = t.indexOf("=");
    if (eq === -1) return;
    const k = t.slice(0, eq).trim();
    let v = t.slice(eq + 1).trim();
    if (
      (v.startsWith('"') && v.endsWith('"')) ||
      (v.startsWith("'") && v.endsWith("'"))
    ) {
      v = v.slice(1, -1);
    }
    if (k) {
      process.env[k] = v;
      loaded++;
    }
  });
  return loaded;
}

loadEnvFile(path.join(process.cwd(), ".env"));
loadEnvFile(path.join(process.cwd(), ".env.local"));

const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient({
  datasources: { db: { url: process.env.DATABASE_URL } },
});

async function main() {
  // 1. List all units with product counts
  console.log("\n" + "=".repeat(80));
  console.log("UNITS OF MEASURE");
  console.log("=".repeat(80));

  const units = await prisma.unitOfMeasure.findMany({
    where: { active: true },
    orderBy: { name: "asc" },
    include: { _count: { select: { products: true } } },
  });

  for (const u of units) {
    const abbr = u.abbreviation ? `(${u.abbreviation})` : "";
    console.log(
      `  ${u.name.padEnd(25)} ${abbr.padEnd(8)} → ${u._count.products} products`
    );
  }

  // 2. Products grouped by unit
  console.log("\n" + "=".repeat(80));
  console.log("PRODUCTS BY UNIT");
  console.log("=".repeat(80));

  for (const u of units) {
    const products = await prisma.product.findMany({
      where: { unitId: u.id, active: true },
      orderBy: { name: "asc" },
      include: { category: { select: { name: true } } },
    });
    if (products.length === 0) continue;

    const abbr = u.abbreviation ? ` (${u.abbreviation})` : "";
    console.log(`\n──── ${u.name}${abbr} — ${products.length} products ────`);
    for (const p of products) {
      const sku = (p.sku || "—").padEnd(10);
      const cat = (p.category?.name || "—").padEnd(12);
      const cost = `$${Number(p.unitCost).toFixed(2)}`.padStart(8);
      console.log(`  ${sku}  ${cat}  ${cost}  ${p.name}`);
    }
  }

  // 3. Products without unit
  const noUnit = await prisma.product.findMany({
    where: { unitId: null, active: true },
    orderBy: { name: "asc" },
    include: { category: { select: { name: true } } },
  });
  if (noUnit.length > 0) {
    console.log(`\n──── NO UNIT SET — ${noUnit.length} products ────`);
    for (const p of noUnit) {
      const sku = (p.sku || "—").padEnd(10);
      const cat = (p.category?.name || "—").padEnd(12);
      console.log(`  ${sku}  ${cat}  ${p.name}`);
    }
  }

  console.log("\n" + "=".repeat(80) + "\n");
}

main()
  .catch((e) => {
    console.error("ERROR:", e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
