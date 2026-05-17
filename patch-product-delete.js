// patch-product-delete.js
// Adds product deletion:
//   1) DELETE handler in /api/products/[id]
//   2) Trash button in CatalogTab Products section with window.confirm

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
// 1) app/api/products/[id]/route.ts — append DELETE handler
// ───────────────────────────────────────────────────────────────
{
  const f = "app/api/products/[id]/route.ts";
  console.log(`\n>>> Patching ${f}`);
  backup(f);
  let [src, crlf] = readNormalize(f);

  const deleteHandler = `
export async function DELETE(
  _req: NextRequest,
  ctx: { params: Promise<{ id: string }> },
) {
  const auth = await requireApiSession();
  if ("error" in auth) return auth.error;
  const user = auth.session.user;
  if (!(await checkPermission(user.role, user.companyId)))
    return forbidden("Product management not permitted");

  const { id } = await ctx.params;
  const existing = await prisma.product.findFirst({
    where: { id, companyId: user.companyId },
  });
  if (!existing) return notFound("product_not_found");

  // Block delete if product still has non-zero stock anywhere
  const stockWithQty = await prisma.stock.findFirst({
    where: { productId: id, quantity: { gt: 0 } },
    select: { id: true },
  });
  if (stockWithQty) {
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
  }

  return NextResponse.json({ ok: true });
}
`;

  // Anchor: end of PATCH function (return ok + closing brace).
  // Only one such return in this file, so unique.
  src = apply(
    src,
    "  return NextResponse.json({ ok: true });\n}\n",
    `  return NextResponse.json({ ok: true });\n}\n${deleteHandler}`,
    "products/[id]/route: append DELETE handler"
  );

  writeBack(f, src, crlf);
}

// ───────────────────────────────────────────────────────────────
// 2) components/settings/CatalogTab.tsx — add delete button
// ───────────────────────────────────────────────────────────────
{
  const f = "components/settings/CatalogTab.tsx";
  console.log(`\n>>> Patching ${f}`);
  backup(f);
  let [src, crlf] = readNormalize(f);

  // 2a) Add Trash2 to lucide-react imports
  src = apply(
    src,
    'import { Loader2, Plus, Pencil } from "lucide-react";',
    'import { Loader2, Plus, Pencil, Trash2 } from "lucide-react";',
    "CatalogTab: import Trash2"
  );

  // 2b) Add deletingId state + handleDelete to ProductsSection
  // Anchor: unique to ProductsSection (uses ProductRow type)
  src = apply(
    src,
    '  const [editing, setEditing] = useState<ProductRow | "new" | null>(null);\n\n  return (',
    `  const [editing, setEditing] = useState<ProductRow | "new" | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  async function handleDelete(p: ProductRow) {
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
  }

  return (`,
    "CatalogTab: add deletingId state + handleDelete to ProductsSection"
  );

  // 2c) Replace Actions cell in product row to include both Edit + Delete
  // Anchor: the only `setEditing(p)` in the file is in ProductsSection's products map
  src = apply(
    src,
    `                    <TableCell className="text-right">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => setEditing(p)}
                      >
                        <Pencil className="mr-1 h-3.5 w-3.5" />
                        Edit
                      </Button>
                    </TableCell>`,
    `                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => setEditing(p)}
                        >
                          <Pencil className="mr-1 h-3.5 w-3.5" />
                          Edit
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleDelete(p)}
                          disabled={deletingId === p.id}
                          className="text-red-600 hover:text-red-700 hover:bg-red-50 border-red-200"
                        >
                          {deletingId === p.id ? (
                            <Loader2 className="h-3.5 w-3.5 animate-spin" />
                          ) : (
                            <Trash2 className="h-3.5 w-3.5" />
                          )}
                        </Button>
                      </div>
                    </TableCell>`,
    "CatalogTab: add delete button next to Edit in product row"
  );

  writeBack(f, src, crlf);
}

console.log("\n[OK] All patches applied.\n");
console.log("Next:");
console.log("  git add . && git commit -m \"feat: delete product from settings\" && git push origin master");
