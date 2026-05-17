// patch-empty-parent-cleanup.js
// Improves force-delete: when force=true wipes line items, also deletes
// parent records that became empty (Request/Reception/Transfer/PhysicalCount
// with 0 remaining items). Uses interactive transaction for atomicity.

const fs = require("fs");

function readNormalize(p) {
  const raw = fs.readFileSync(p);
  const wasCrlf = raw.indexOf(Buffer.from("\r\n")) !== -1;
  const text = raw.toString("utf-8").replace(/\r\n/g, "\n");
  return [text, wasCrlf];
}

function writeBack(p, text, wasCrlf) {
  if (wasCrlf) text = text.replace(/\n/g, "\r\n");
  fs.writeFileSync(p, text, { encoding: "utf-8" });
}

function backup(p) {
  const bp = p + ".bak";
  if (!fs.existsSync(bp)) {
    fs.copyFileSync(p, bp);
    console.log(`  [backup] ${bp}`);
  } else {
    console.log(`  [backup] ${bp} (exists, kept)`);
  }
}

function countOccurrences(src, needle) {
  let n = 0;
  let i = -1;
  while ((i = src.indexOf(needle, i + 1)) !== -1) n++;
  return n;
}

function apply(src, find, replace, label) {
  const fc = countOccurrences(src, find);
  const rc = countOccurrences(src, replace);
  if (fc === 0 && rc >= 1) {
    console.log(`  [skip  ] ${label} (already applied)`);
    return src;
  }
  if (fc !== 1) {
    throw new Error(`[${label}] expected exactly 1 match, found ${fc}`);
  }
  console.log(`  [patch ] ${label}`);
  return src.replace(find, replace);
}

const f = "app/api/products/[id]/route.ts";
console.log(`>>> Patching ${f}`);
backup(f);
let [src, crlf] = readNormalize(f);

// Replace the array-based transaction with an interactive transaction that
// also cleans up orphaned parent records when force=true
src = apply(
  src,
  `  // Clean delete: wipe metadata/history first, then the product itself
  // If force=true, also wipe transactional line items (admin override)
  try {
    await prisma.$transaction([
      ...(force
        ? [
            prisma.requestItem.deleteMany({ where: { productId: id } }),
            prisma.receptionItem.deleteMany({ where: { productId: id } }),
            prisma.transferItem.deleteMany({ where: { productId: id } }),
            prisma.physicalCountItem.deleteMany({ where: { productId: id } }),
          ]
        : []),
      prisma.stockMovement.deleteMany({ where: { productId: id } }),
      prisma.truckInventory.deleteMany({ where: { productId: id } }),
      prisma.productLicense.deleteMany({ where: { productId: id } }),
      prisma.stock.deleteMany({ where: { productId: id } }),
      prisma.locationProduct.deleteMany({ where: { productId: id } }),
      prisma.product.delete({ where: { id } }),
    ]);
  } catch {`,
  `  // Clean delete inside an interactive transaction so we can cascade orphan cleanup
  try {
    await prisma.$transaction(async (tx) => {
      if (force) {
        // 1) Capture parent ids BEFORE deleting items so we know which to check
        const [reqItems, recItems, trItems, pcItems] = await Promise.all([
          tx.requestItem.findMany({
            where: { productId: id },
            select: { requestId: true },
            distinct: ["requestId"],
          }),
          tx.receptionItem.findMany({
            where: { productId: id },
            select: { receptionId: true },
            distinct: ["receptionId"],
          }),
          tx.transferItem.findMany({
            where: { productId: id },
            select: { transferId: true },
            distinct: ["transferId"],
          }),
          tx.physicalCountItem.findMany({
            where: { productId: id },
            select: { physicalCountId: true },
            distinct: ["physicalCountId"],
          }),
        ]);
        const reqParentIds = reqItems.map((r) => r.requestId);
        const recParentIds = recItems.map((r) => r.receptionId);
        const trParentIds = trItems.map((r) => r.transferId);
        const pcParentIds = pcItems.map((p) => p.physicalCountId);

        // 2) Wipe the line items
        await tx.requestItem.deleteMany({ where: { productId: id } });
        await tx.receptionItem.deleteMany({ where: { productId: id } });
        await tx.transferItem.deleteMany({ where: { productId: id } });
        await tx.physicalCountItem.deleteMany({ where: { productId: id } });

        // 3) Delete parents that became empty (no items left for any product)
        for (const rid of reqParentIds) {
          const c = await tx.requestItem.count({ where: { requestId: rid } });
          if (c === 0) await tx.request.delete({ where: { id: rid } });
        }
        for (const rid of recParentIds) {
          const c = await tx.receptionItem.count({ where: { receptionId: rid } });
          if (c === 0) await tx.reception.delete({ where: { id: rid } });
        }
        for (const tid of trParentIds) {
          const c = await tx.transferItem.count({ where: { transferId: tid } });
          if (c === 0) await tx.transfer.delete({ where: { id: tid } });
        }
        for (const pid of pcParentIds) {
          const c = await tx.physicalCountItem.count({
            where: { physicalCountId: pid },
          });
          if (c === 0) await tx.physicalCount.delete({ where: { id: pid } });
        }
      }

      // 4) Always wipe metadata/history then the product itself
      await tx.stockMovement.deleteMany({ where: { productId: id } });
      await tx.truckInventory.deleteMany({ where: { productId: id } });
      await tx.productLicense.deleteMany({ where: { productId: id } });
      await tx.stock.deleteMany({ where: { productId: id } });
      await tx.locationProduct.deleteMany({ where: { productId: id } });
      await tx.product.delete({ where: { id } });
    });
  } catch {`,
  "products/[id]/route: interactive transaction + empty-parent cleanup"
);

writeBack(f, src, crlf);

console.log("\n[OK] Empty-parent cleanup added.\n");
console.log("Next:");
console.log("  git add . && git commit -m \"feat: force-delete also wipes orphaned parents (empty requests/receptions/etc)\" && git push origin master");
