// scripts/reset-and-seed.js
// Wipes test data and creates ONE super_admin user.
// Run from C:\victory-inventory:
//     node scripts/reset-and-seed.js

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

const cwd = process.cwd();
console.log("=== Victory Inventory — Reset Test Data + Seed Super Admin ===\n");
console.log(`Working dir: ${cwd}`);
const envCount = loadEnvFile(path.join(cwd, ".env"));
console.log(`  .env:        ${envCount} vars loaded`);
const localCount = loadEnvFile(path.join(cwd, ".env.local"));
console.log(`  .env.local:  ${localCount} vars loaded`);

if (!process.env.DATABASE_URL) {
  console.error("\nERROR: DATABASE_URL not set after loading .env / .env.local.");
  process.exit(1);
}

const url = process.env.DATABASE_URL;
const maskedUrl = url.replace(/:[^:@/]+@/, ":****@");
console.log(`\nDATABASE_URL: ${maskedUrl}`);
console.log(`URL length:   ${url.length} chars`);

// Parse URL to verify structure
try {
  const parsed = new URL(url);
  console.log(`  scheme:   ${parsed.protocol}`);
  console.log(`  user:     ${parsed.username || "(empty!)"}`);
  console.log(`  password: ${parsed.password ? `(${parsed.password.length} chars)` : "(empty!)"}`);
  console.log(`  host:     ${parsed.hostname}`);
  console.log(`  port:     ${parsed.port || "(default)"}`);
  console.log(`  database: ${parsed.pathname}`);
  console.log(`  search:   ${parsed.search}`);
} catch (e) {
  console.error(`  URL parse error: ${e.message}`);
  process.exit(1);
}

let bcrypt;
try {
  bcrypt = require("bcryptjs");
} catch {
  try {
    bcrypt = require("bcrypt");
  } catch {
    console.error("ERROR: install bcryptjs first: npm install bcryptjs");
    process.exit(1);
  }
}

const { PrismaClient } = require("@prisma/client");

// EXPLICITLY pass the URL to PrismaClient — bypass any env auto-detection issues
const prisma = new PrismaClient({
  datasources: {
    db: { url: process.env.DATABASE_URL },
  },
  log: ["error", "warn"],
});

async function main() {
  // Test connection first with a simple raw query
  console.log("\n[0/5] Testing DB connection...");
  try {
    const result = await prisma.$queryRaw`SELECT 1 AS test`;
    console.log(`      Connection OK: ${JSON.stringify(result)}\n`);
  } catch (e) {
    console.error("      Connection FAILED:", e.message);
    throw e;
  }

  console.log("[1/5] Finding company...");
  const company = await prisma.company.findFirst();
  if (!company) {
    throw new Error("No company found in DB.");
  }
  console.log(`      Company: ${company.name}`);
  console.log(`      ID:      ${company.id}\n`);

  console.log("[2/5] Deleting transactional data...");
  const r1 = await prisma.physicalCountItem.deleteMany({});
  console.log(`      physicalCountItem: ${r1.count}`);
  const r2 = await prisma.transferItem.deleteMany({});
  console.log(`      transferItem:      ${r2.count}`);
  const r3 = await prisma.receptionItem.deleteMany({});
  console.log(`      receptionItem:     ${r3.count}`);
  const r4 = await prisma.requestItem.deleteMany({});
  console.log(`      requestItem:       ${r4.count}`);

  const r5 = await prisma.physicalCount.deleteMany({});
  console.log(`      physicalCount:     ${r5.count}`);
  const r6 = await prisma.transfer.deleteMany({});
  console.log(`      transfer:          ${r6.count}`);
  const r7 = await prisma.reception.deleteMany({});
  console.log(`      reception:         ${r7.count}`);
  const r8 = await prisma.request.deleteMany({});
  console.log(`      request:           ${r8.count}`);

  const r9 = await prisma.stockMovement.deleteMany({});
  console.log(`      stockMovement:     ${r9.count}`);
  const r10 = await prisma.truckInventory.deleteMany({});
  console.log(`      truckInventory:    ${r10.count}\n`);

  console.log("[3/5] Resetting stock quantities to 0...");
  const stockReset = await prisma.stock.updateMany({
    data: { quantity: 0 },
  });
  console.log(`      stock rows reset:  ${stockReset.count}\n`);

  console.log("[4/5] Deleting users and related...");
  const r11 = await prisma.notification.deleteMany({});
  console.log(`      notification:      ${r11.count}`);
  const r12 = await prisma.pushSubscription.deleteMany({});
  console.log(`      pushSubscription:  ${r12.count}`);
  const r13 = await prisma.userLicense.deleteMany({});
  console.log(`      userLicense:       ${r13.count}`);
  const r14 = await prisma.user.deleteMany({});
  console.log(`      user:              ${r14.count}\n`);

  console.log("[5/5] Creating super_admin user...");
  const passwordHash = await bcrypt.hash("Victory4ever", 10);
  const newUser = await prisma.user.create({
    data: {
      name: "Juan Prieto",
      email: "jprieto30@hotmail.com",
      passwordHash,
      role: "super_admin",
      companyId: company.id,
      hasCompanyEmail: false,
      active: true,
    },
  });
  console.log(`      Created user: ${newUser.id}`);
  console.log(`      Name:         ${newUser.name}`);
  console.log(`      Email:        ${newUser.email}`);
  console.log(`      Role:         ${newUser.role}\n`);

  console.log("=== DONE ===\n");
  console.log("Login at https://victory-inventory.vercel.app with:");
  console.log("  Email:    jprieto30@hotmail.com");
  console.log("  Password: Victory4ever\n");
}

main()
  .catch((e) => {
    console.error("\nERROR:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
