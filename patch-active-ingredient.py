"""
patch-active-ingredient.py
Patches 3 files to add `activeIngredient` field + product image to technician request card.

Run from C:\\victory-inventory\\ :
    python patch-active-ingredient.py

Idempotent-ish: backups created before each patch. Re-run will fail with "expected 1 match, found 0" if already applied.
"""
import shutil
from pathlib import Path


def read_normalize(p: Path) -> tuple[str, bool]:
    """Read file as UTF-8 text, normalize CRLF -> LF, return (text, was_crlf)."""
    raw = p.read_bytes()
    was_crlf = b"\r\n" in raw
    text = raw.decode("utf-8").replace("\r\n", "\n")
    return text, was_crlf


def write_back(p: Path, text: str, was_crlf: bool) -> None:
    """Validate UTF-8 encoding, re-apply original line endings, write atomically."""
    if was_crlf:
        text = text.replace("\n", "\r\n")
    data = text.encode("utf-8")  # raises if invalid Unicode -> fails BEFORE write
    p.write_bytes(data)


def backup(p: Path) -> None:
    bp = p.with_suffix(p.suffix + ".bak")
    shutil.copy2(p, bp)
    print(f"  [backup] {bp}")


def apply(src: str, find: str, replace: str, label: str) -> str:
    count = src.count(find)
    assert count == 1, f"[{label}] expected exactly 1 match, found {count}"
    print(f"  [patch ] {label}")
    return src.replace(find, replace)


# ───────────────────────────────────────────────────────────────
# 1) prisma/schema.prisma  — add `activeIngredient String?`
# ───────────────────────────────────────────────────────────────
schema = Path("prisma/schema.prisma")
print(f"\n>>> Patching {schema}")
backup(schema)
src, crlf = read_normalize(schema)

src = apply(
    src,
    "  epaRegistration String?\n  photoUrl        String?",
    "  epaRegistration  String?\n  activeIngredient String?\n  photoUrl         String?",
    "schema: add activeIngredient to Product",
)
write_back(schema, src, crlf)


# ───────────────────────────────────────────────────────────────
# 2) lib/catalog.ts  — type + return
# ───────────────────────────────────────────────────────────────
catalog = Path("lib/catalog.ts")
print(f"\n>>> Patching {catalog}")
backup(catalog)
src, crlf = read_normalize(catalog)

# Add field to CatalogProduct type
src = apply(
    src,
    "  sku: string | null;\n  photoUrl: string | null;",
    "  sku: string | null;\n  activeIngredient: string | null;\n  photoUrl: string | null;",
    "catalog.ts: add activeIngredient to CatalogProduct type",
)

# Include activeIngredient in mapped return object
src = apply(
    src,
    "          sku: p.sku,\n          photoUrl: p.photoUrl,",
    "          sku: p.sku,\n          activeIngredient: p.activeIngredient,\n          photoUrl: p.photoUrl,",
    "catalog.ts: include activeIngredient in return",
)
write_back(catalog, src, crlf)


# ───────────────────────────────────────────────────────────────
# 3) components/requests/RequestForm.tsx  — image + activeIngredient
# ───────────────────────────────────────────────────────────────
rf = Path("components/requests/RequestForm.tsx")
print(f"\n>>> Patching {rf}")
backup(rf)
src, crlf = read_normalize(rf)

# Add Package to lucide-react imports
src = apply(
    src,
    '  AlertTriangle,\n  Loader2,\n} from "lucide-react";',
    '  AlertTriangle,\n  Loader2,\n  Package,\n} from "lucide-react";',
    "RequestForm: add Package import",
)

# Replace the ProductRow header block (function signature + first <div> with name/sku/license)
old_block = (
    'function ProductRow({\n'
    '  product,\n'
    '  quantity,\n'
    '  onChange,\n'
    '}: {\n'
    '  product: CatalogProduct;\n'
    '  quantity: number;\n'
    '  onChange: (q: number) => void;\n'
    '}) {\n'
    '  const outOfStock = product.stock <= 0;\n'
    '\n'
    '  return (\n'
    '    <Card className={cn(outOfStock && "opacity-60")}>\n'
    '      <CardContent className="p-4 space-y-2.5">\n'
    '        <div className="flex items-start justify-between gap-2">\n'
    '          <div className="min-w-0">\n'
    '            <p className="font-medium text-brand-dark text-sm leading-tight truncate">\n'
    '              {product.name}\n'
    '            </p>\n'
    '            <p className="text-xs text-brand-dark/60 truncate">\n'
    '              {product.sku ?? "\u2014"}\n'
    '              {product.category ? ` \u00b7 ${product.category.name}` : ""}\n'
    '            </p>\n'
    '          </div>\n'
    '          {product.requiresLicense && (\n'
    '            <Badge variant="secondary" className="shrink-0 gap-1">\n'
    '              <ShieldAlert className="h-3 w-3" />\n'
    '              License\n'
    '            </Badge>\n'
    '          )}\n'
    '        </div>'
)

new_block = (
    'function ProductRow({\n'
    '  product,\n'
    '  quantity,\n'
    '  onChange,\n'
    '}: {\n'
    '  product: CatalogProduct;\n'
    '  quantity: number;\n'
    '  onChange: (q: number) => void;\n'
    '}) {\n'
    '  const outOfStock = product.stock <= 0;\n'
    '\n'
    '  return (\n'
    '    <Card className={cn(outOfStock && "opacity-60")}>\n'
    '      <CardContent className="p-3 space-y-2.5">\n'
    '        <div className="flex gap-3">\n'
    '          <div className="shrink-0 w-16 h-16 rounded-md overflow-hidden bg-brand-bg flex items-center justify-center border border-border">\n'
    '            {product.photoUrl ? (\n'
    '              // eslint-disable-next-line @next/next/no-img-element\n'
    '              <img\n'
    '                src={product.photoUrl}\n'
    '                alt={product.name}\n'
    '                className="w-full h-full object-cover"\n'
    '              />\n'
    '            ) : (\n'
    '              <Package className="w-6 h-6 text-brand-dark/30" />\n'
    '            )}\n'
    '          </div>\n'
    '          <div className="flex-1 min-w-0 flex items-start justify-between gap-2">\n'
    '            <div className="min-w-0 space-y-0.5">\n'
    '              <p className="font-medium text-brand-dark text-sm leading-tight line-clamp-2">\n'
    '                {product.name}\n'
    '              </p>\n'
    '              <p className="text-xs text-brand-dark/60 truncate">\n'
    '                {product.sku ?? "\u2014"}\n'
    '                {product.category ? ` \u00b7 ${product.category.name}` : ""}\n'
    '              </p>\n'
    '              {product.activeIngredient && (\n'
    '                <p className="text-xs text-brand-dark/50 italic truncate">\n'
    '                  {product.activeIngredient}\n'
    '                </p>\n'
    '              )}\n'
    '            </div>\n'
    '            {product.requiresLicense && (\n'
    '              <Badge variant="secondary" className="shrink-0 gap-1">\n'
    '                <ShieldAlert className="h-3 w-3" />\n'
    '                License\n'
    '              </Badge>\n'
    '            )}\n'
    '          </div>\n'
    '        </div>'
)

src = apply(src, old_block, new_block, "RequestForm: rewrite ProductRow header with image + activeIngredient")

write_back(rf, src, crlf)

print("\n[OK] All patches applied successfully.\n")
print("Next steps:")
print("  1) npx dotenv -e .env.local -- prisma db push")
print("  2) npx dotenv -e .env.local -- npx tsx prisma/backfill-active-ingredients.ts")
print("  3) git add . && git commit -m 'feat: product image + active ingredient in request card' && git push")
