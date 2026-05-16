// patch-active-ingredient.js
// Patches 3 files to add `activeIngredient` field + product image to technician request card.
//
// Run from C:\victory-inventory\ :
//     node patch-active-ingredient.js
//
// Backups created before each patch as <file>.bak.
// Re-run on already-patched files will fail with "expected 1 match, found 0" — safe.

const fs = require("fs");
const path = require("path");

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
  fs.copyFileSync(p, bp);
  console.log(`  [backup] ${bp}`);
}

function apply(src, find, replace, label) {
  // Count occurrences of `find` in `src`
  let count = 0;
  let i = -1;
  while ((i = src.indexOf(find, i + 1)) !== -1) count++;
  if (count !== 1) {
    throw new Error(`[${label}] expected exactly 1 match, found ${count}`);
  }
  console.log(`  [patch ] ${label}`);
  return src.replace(find, replace);
}

// ───────────────────────────────────────────────────────────────
// 1) prisma/schema.prisma  — add `activeIngredient String?`
// ───────────────────────────────────────────────────────────────
{
  const f = "prisma/schema.prisma";
  console.log(`\n>>> Patching ${f}`);
  backup(f);
  let [src, crlf] = readNormalize(f);

  src = apply(
    src,
    "  epaRegistration String?\n  photoUrl        String?",
    "  epaRegistration  String?\n  activeIngredient String?\n  photoUrl         String?",
    "schema: add activeIngredient to Product"
  );

  writeBack(f, src, crlf);
}

// ───────────────────────────────────────────────────────────────
// 2) lib/catalog.ts  — type + return
// ───────────────────────────────────────────────────────────────
{
  const f = "lib/catalog.ts";
  console.log(`\n>>> Patching ${f}`);
  backup(f);
  let [src, crlf] = readNormalize(f);

  src = apply(
    src,
    "  sku: string | null;\n  photoUrl: string | null;",
    "  sku: string | null;\n  activeIngredient: string | null;\n  photoUrl: string | null;",
    "catalog.ts: add activeIngredient to CatalogProduct type"
  );

  src = apply(
    src,
    "          sku: p.sku,\n          photoUrl: p.photoUrl,",
    "          sku: p.sku,\n          activeIngredient: p.activeIngredient,\n          photoUrl: p.photoUrl,",
    "catalog.ts: include activeIngredient in return"
  );

  writeBack(f, src, crlf);
}

// ───────────────────────────────────────────────────────────────
// 3) components/requests/RequestForm.tsx  — image + activeIngredient
// ───────────────────────────────────────────────────────────────
{
  const f = "components/requests/RequestForm.tsx";
  console.log(`\n>>> Patching ${f}`);
  backup(f);
  let [src, crlf] = readNormalize(f);

  // 3a. Add Package to lucide-react imports
  src = apply(
    src,
    '  AlertTriangle,\n  Loader2,\n} from "lucide-react";',
    '  AlertTriangle,\n  Loader2,\n  Package,\n} from "lucide-react";',
    "RequestForm: add Package import"
  );

  // 3b. Replace ProductRow header block
  const oldBlock =
    'function ProductRow({\n' +
    '  product,\n' +
    '  quantity,\n' +
    '  onChange,\n' +
    '}: {\n' +
    '  product: CatalogProduct;\n' +
    '  quantity: number;\n' +
    '  onChange: (q: number) => void;\n' +
    '}) {\n' +
    '  const outOfStock = product.stock <= 0;\n' +
    '\n' +
    '  return (\n' +
    '    <Card className={cn(outOfStock && "opacity-60")}>\n' +
    '      <CardContent className="p-4 space-y-2.5">\n' +
    '        <div className="flex items-start justify-between gap-2">\n' +
    '          <div className="min-w-0">\n' +
    '            <p className="font-medium text-brand-dark text-sm leading-tight truncate">\n' +
    '              {product.name}\n' +
    '            </p>\n' +
    '            <p className="text-xs text-brand-dark/60 truncate">\n' +
    '              {product.sku ?? "\u2014"}\n' +
    '              {product.category ? ` \u00b7 ${product.category.name}` : ""}\n' +
    '            </p>\n' +
    '          </div>\n' +
    '          {product.requiresLicense && (\n' +
    '            <Badge variant="secondary" className="shrink-0 gap-1">\n' +
    '              <ShieldAlert className="h-3 w-3" />\n' +
    '              License\n' +
    '            </Badge>\n' +
    '          )}\n' +
    '        </div>';

  const newBlock =
    'function ProductRow({\n' +
    '  product,\n' +
    '  quantity,\n' +
    '  onChange,\n' +
    '}: {\n' +
    '  product: CatalogProduct;\n' +
    '  quantity: number;\n' +
    '  onChange: (q: number) => void;\n' +
    '}) {\n' +
    '  const outOfStock = product.stock <= 0;\n' +
    '\n' +
    '  return (\n' +
    '    <Card className={cn(outOfStock && "opacity-60")}>\n' +
    '      <CardContent className="p-3 space-y-2.5">\n' +
    '        <div className="flex gap-3">\n' +
    '          <div className="shrink-0 w-16 h-16 rounded-md overflow-hidden bg-brand-bg flex items-center justify-center border border-border">\n' +
    '            {product.photoUrl ? (\n' +
    '              // eslint-disable-next-line @next/next/no-img-element\n' +
    '              <img\n' +
    '                src={product.photoUrl}\n' +
    '                alt={product.name}\n' +
    '                className="w-full h-full object-cover"\n' +
    '              />\n' +
    '            ) : (\n' +
    '              <Package className="w-6 h-6 text-brand-dark/30" />\n' +
    '            )}\n' +
    '          </div>\n' +
    '          <div className="flex-1 min-w-0 flex items-start justify-between gap-2">\n' +
    '            <div className="min-w-0 space-y-0.5">\n' +
    '              <p className="font-medium text-brand-dark text-sm leading-tight line-clamp-2">\n' +
    '                {product.name}\n' +
    '              </p>\n' +
    '              <p className="text-xs text-brand-dark/60 truncate">\n' +
    '                {product.sku ?? "\u2014"}\n' +
    '                {product.category ? ` \u00b7 ${product.category.name}` : ""}\n' +
    '              </p>\n' +
    '              {product.activeIngredient && (\n' +
    '                <p className="text-xs text-brand-dark/50 italic truncate">\n' +
    '                  {product.activeIngredient}\n' +
    '                </p>\n' +
    '              )}\n' +
    '            </div>\n' +
    '            {product.requiresLicense && (\n' +
    '              <Badge variant="secondary" className="shrink-0 gap-1">\n' +
    '                <ShieldAlert className="h-3 w-3" />\n' +
    '                License\n' +
    '              </Badge>\n' +
    '            )}\n' +
    '          </div>\n' +
    '        </div>';

  src = apply(
    src,
    oldBlock,
    newBlock,
    "RequestForm: rewrite ProductRow header with image + activeIngredient"
  );

  writeBack(f, src, crlf);
}

console.log("\n[OK] All patches applied successfully.\n");
console.log("Next steps:");
console.log("  1) npx dotenv -e .env.local -- prisma db push");
console.log("  2) npx dotenv -e .env.local -- npx tsx prisma/backfill-active-ingredients.ts");
console.log("  3) git add . && git commit -m \"feat: product image + active ingredient\" && git push");
