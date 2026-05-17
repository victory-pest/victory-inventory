// patch-product-delete-v2.js
// Improves DELETE /api/products/[id]:
//   - Pre-checks for real transactions (RequestItem/ReceptionItem/TransferItem/PhysicalCountItem) — block
//   - Auto-cleans metadata/history (StockMovement, TruckInventory, ProductLicense, Stock, LocationProduct)
//   - Existing patch only cleaned a subset → StockMovement was blocking deletes after any adjustment

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

// Replace the stockWithQty-block + try/catch with the expanded version
src = apply(
  src,
  `  if (stockWithQty) {
    return NextResponse.json(
      {
        error:
          "Cannot delete: product has non-zero stock. Adjust stock to 0 first, or use the Active toggle to deactivate.",
      },
      { status: 409 },
    );
  }

  try {
    await prisma.$transaction([
      prisma.productLicense.deleteMany({ where: { productId: id } }),
      prisma.stock.deleteMany({ where: { productId: id } }),
      prisma.locationProduct.deleteMany({ where: { productId: id } }),
      prisma.product.delete({ where: { id } }),
    ]);
  } catch {
    return NextResponse.json(
      {
        error:
          "Cannot delete: product has transactions (requests, receptions, adjustments, or transfers). Use the Active toggle to deactivate instead.",
      },
      { status: 409 },
    );
  }`,
  `  if (stockWithQty) {
    return NextResponse.json(
      {
        error:
          "Cannot delete: product has non-zero stock. Adjust stock to 0 first, or use the Active toggle to deactivate.",
      },
      { status: 409 },
    );
  }

  // Block if product has real transactions (line items in requests/receptions/transfers/physical counts)
  const [reqCount, recCount, trCount, pcCount] = await Promise.all([
    prisma.requestItem.count({ where: { productId: id } }),
    prisma.receptionItem.count({ where: { productId: id } }),
    prisma.transferItem.count({ where: { productId: id } }),
    prisma.physicalCountItem.count({ where: { productId: id } }),
  ]);
  const blockers: string[] = [];
  if (reqCount > 0) blockers.push(\`\${reqCount} request item(s)\`);
  if (recCount > 0) blockers.push(\`\${recCount} reception item(s)\`);
  if (trCount > 0) blockers.push(\`\${trCount} transfer item(s)\`);
  if (pcCount > 0)
    blockers.push(\`\${pcCount} physical count entr\${pcCount === 1 ? "y" : "ies"}\`);
  if (blockers.length > 0) {
    return NextResponse.json(
      {
        error: \`Cannot delete: product is referenced in \${blockers.join(", ")}. Use the Active toggle to deactivate instead.\`,
      },
      { status: 409 },
    );
  }

  // Clean delete: wipe metadata/history first, then the product itself
  try {
    await prisma.$transaction([
      prisma.stockMovement.deleteMany({ where: { productId: id } }),
      prisma.truckInventory.deleteMany({ where: { productId: id } }),
      prisma.productLicense.deleteMany({ where: { productId: id } }),
      prisma.stock.deleteMany({ where: { productId: id } }),
      prisma.locationProduct.deleteMany({ where: { productId: id } }),
      prisma.product.delete({ where: { id } }),
    ]);
  } catch {
    return NextResponse.json(
      {
        error:
          "Cannot delete: unexpected reference to this product. Use the Active toggle to deactivate instead.",
      },
      { status: 409 },
    );
  }`,
  "products/[id]/route: expand DELETE pre-checks + cleanup (StockMovement, TruckInventory, PhysicalCountItem)"
);

writeBack(f, src, crlf);

console.log("\n[OK] DELETE handler updated.\n");
console.log("Next:");
console.log("  git add . && git commit -m \"fix: delete product cleans StockMovement + TruckInventory\" && git push origin master");
