// patch-product-force-delete.js
// Adds admin force-delete capability:
//   Backend: ?force=true wipes line items (request/reception/transfer/physicalCount) — manager role only
//   Frontend: on 409, prompts for force confirm, retries with force=true

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

// ───────────────────────────────────────────────────────────────
// 1) app/api/products/[id]/route.ts
// ───────────────────────────────────────────────────────────────
{
  const f = "app/api/products/[id]/route.ts";
  console.log(`\n>>> Patching ${f}`);
  backup(f);
  let [src, crlf] = readNormalize(f);

  // 1a) Change _req to req (we now use it for searchParams) + add force parsing + manager-only check
  src = apply(
    src,
    `export async function DELETE(
  _req: NextRequest,
  ctx: { params: Promise<{ id: string }> },
) {
  const auth = await requireApiSession();
  if ("error" in auth) return auth.error;
  const user = auth.session.user;
  if (!(await checkPermission(user.role, user.companyId)))
    return forbidden("Product management not permitted");

  const { id } = await ctx.params;`,
    `export async function DELETE(
  req: NextRequest,
  ctx: { params: Promise<{ id: string }> },
) {
  const auth = await requireApiSession();
  if ("error" in auth) return auth.error;
  const user = auth.session.user;
  if (!(await checkPermission(user.role, user.companyId)))
    return forbidden("Product management not permitted");

  const force = new URL(req.url).searchParams.get("force") === "true";
  if (force && !isManagerLike(user.role as never)) {
    return forbidden("Force delete requires manager role");
  }

  const { id } = await ctx.params;`,
    "products/[id]/route: parse force query + manager-only check"
  );

  // 1b) Wrap blockers check in if (!force) — also update error message
  src = apply(
    src,
    `  // Block if product has real transactions (line items in requests/receptions/transfers/physical counts)
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
  }`,
    `  // Block if product has real transactions — UNLESS force=true (admin override)
  if (!force) {
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
          error: \`Cannot delete: product is referenced in \${blockers.join(", ")}. Force delete (admin) or use the Active toggle to deactivate instead.\`,
        },
        { status: 409 },
      );
    }
  }`,
    "products/[id]/route: wrap blockers check in if(!force)"
  );

  // 1c) Update transaction to include line item deletes when force=true
  src = apply(
    src,
    `  // Clean delete: wipe metadata/history first, then the product itself
  try {
    await prisma.$transaction([
      prisma.stockMovement.deleteMany({ where: { productId: id } }),
      prisma.truckInventory.deleteMany({ where: { productId: id } }),
      prisma.productLicense.deleteMany({ where: { productId: id } }),
      prisma.stock.deleteMany({ where: { productId: id } }),
      prisma.locationProduct.deleteMany({ where: { productId: id } }),
      prisma.product.delete({ where: { id } }),
    ]);
  } catch {`,
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
    "products/[id]/route: conditional wipe of line items when force=true"
  );

  writeBack(f, src, crlf);
}

// ───────────────────────────────────────────────────────────────
// 2) components/settings/CatalogTab.tsx
// ───────────────────────────────────────────────────────────────
{
  const f = "components/settings/CatalogTab.tsx";
  console.log(`\n>>> Patching ${f}`);
  backup(f);
  let [src, crlf] = readNormalize(f);

  // Replace handleDelete with version that prompts for force on 409
  src = apply(
    src,
    `  async function handleDelete(p: ProductRow) {
    if (!window.confirm(\`Delete "\${p.name}"?\\n\\nThis cannot be undone.\`)) return;
    setDeletingId(p.id);
    const res = await fetch(\`/api/products/\${p.id}\`, { method: "DELETE" });
    setDeletingId(null);
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      toast.error(data.error || "Delete failed");
      return;
    }
    toast.success("Deleted");
    router.refresh();
  }`,
    `  async function handleDelete(p: ProductRow) {
    if (!window.confirm(\`Delete "\${p.name}"?\\n\\nThis cannot be undone.\`)) return;
    setDeletingId(p.id);

    let res = await fetch(\`/api/products/\${p.id}\`, { method: "DELETE" });

    // If blocked by transactions, offer force delete to admins
    if (res.status === 409) {
      const data = await res.json().catch(() => ({}));
      const forceConfirm = window.confirm(
        \`\${data.error || "Delete blocked"}\\n\\nFORCE DELETE anyway?\\n\\nThis will permanently remove the product AND all related transaction history (request items, receptions, transfers, physical counts).\\n\\nThis cannot be undone.\`,
      );
      if (!forceConfirm) {
        setDeletingId(null);
        toast.error("Delete cancelled");
        return;
      }
      res = await fetch(\`/api/products/\${p.id}?force=true\`, {
        method: "DELETE",
      });
    }

    setDeletingId(null);
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      toast.error(data.error || "Delete failed");
      return;
    }
    toast.success("Deleted");
    router.refresh();
  }`,
    "CatalogTab: handleDelete prompts for force on 409"
  );

  writeBack(f, src, crlf);
}

console.log("\n[OK] Force delete capability added.\n");
console.log("Next:");
console.log("  git add . && git commit -m \"feat: admin force-delete for products with transactions\" && git push origin master");
