// patch-active-ingredient-form.js
// Adds `activeIngredient` field to the Product create/edit form, API routes,
// and the settings page loader.
//
// Run from C:\victory-inventory\ :
//     node patch-active-ingredient-form.js

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
  fs.copyFileSync(p, bp);
  console.log(`  [backup] ${bp}`);
}

function apply(src, find, replace, label) {
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
// 1) components/settings/CatalogTab.tsx
// ───────────────────────────────────────────────────────────────
{
  const f = "components/settings/CatalogTab.tsx";
  console.log(`\n>>> Patching ${f}`);
  backup(f);
  let [src, crlf] = readNormalize(f);

  // 1a) ProductRow type
  src = apply(
    src,
    "  unitCost: number;\n  epaRegistration: string | null;\n  photoUrl: string | null;",
    "  unitCost: number;\n  epaRegistration: string | null;\n  activeIngredient: string | null;\n  photoUrl: string | null;",
    "CatalogTab: add activeIngredient to ProductRow type"
  );

  // 1b) ProductDialog useState
  src = apply(
    src,
    '  const [epa, setEpa] = useState(row?.epaRegistration ?? "");\n  const [photoUrl, setPhotoUrl] = useState<string | null>(row?.photoUrl ?? null);',
    '  const [epa, setEpa] = useState(row?.epaRegistration ?? "");\n  const [activeIngredient, setActiveIngredient] = useState(\n    row?.activeIngredient ?? "",\n  );\n  const [photoUrl, setPhotoUrl] = useState<string | null>(row?.photoUrl ?? null);',
    "CatalogTab: add activeIngredient state hook"
  );

  // 1c) UI: combine EPA + Active Ingredient in a 2-col grid
  src = apply(
    src,
    '          <div className="space-y-1.5">\n            <Label>EPA registration</Label>\n            <Input value={epa} onChange={(e) => setEpa(e.target.value)} />\n          </div>\n\n          <ImageUpload',
    '          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">\n            <div className="space-y-1.5">\n              <Label>EPA registration</Label>\n              <Input value={epa} onChange={(e) => setEpa(e.target.value)} />\n            </div>\n            <div className="space-y-1.5">\n              <Label>Active ingredient</Label>\n              <Input\n                value={activeIngredient}\n                onChange={(e) => setActiveIngredient(e.target.value)}\n                placeholder="e.g. Fipronil 9.1%"\n              />\n            </div>\n          </div>\n\n          <ImageUpload',
    "CatalogTab: add Active Ingredient input next to EPA registration"
  );

  // 1d) Save payload
  src = apply(
    src,
    "      epaRegistration: epa.trim() || null,\n      photoUrl,",
    "      epaRegistration: epa.trim() || null,\n      activeIngredient: activeIngredient.trim() || null,\n      photoUrl,",
    "CatalogTab: include activeIngredient in save payload"
  );

  writeBack(f, src, crlf);
}

// ───────────────────────────────────────────────────────────────
// 2) app/api/products/route.ts  (POST)
// ───────────────────────────────────────────────────────────────
{
  const f = "app/api/products/route.ts";
  console.log(`\n>>> Patching ${f}`);
  backup(f);
  let [src, crlf] = readNormalize(f);

  // 2a) Zod schema
  src = apply(
    src,
    "  epaRegistration: z.string().max(60).nullable().optional(),\n  photoUrl: z.string().url().nullable().optional(),",
    "  epaRegistration: z.string().max(60).nullable().optional(),\n  activeIngredient: z.string().max(500).nullable().optional(),\n  photoUrl: z.string().url().nullable().optional(),",
    "POST /products: add activeIngredient to Zod schema"
  );

  // 2b) Prisma create payload
  src = apply(
    src,
    "      epaRegistration: parsed.data.epaRegistration ?? null,\n      photoUrl: parsed.data.photoUrl ?? null,",
    "      epaRegistration: parsed.data.epaRegistration ?? null,\n      activeIngredient: parsed.data.activeIngredient ?? null,\n      photoUrl: parsed.data.photoUrl ?? null,",
    "POST /products: persist activeIngredient via prisma.product.create"
  );

  writeBack(f, src, crlf);
}

// ───────────────────────────────────────────────────────────────
// 3) app/api/products/[id]/route.ts  (PATCH)
// ───────────────────────────────────────────────────────────────
{
  const f = "app/api/products/[id]/route.ts";
  console.log(`\n>>> Patching ${f}`);
  backup(f);
  let [src, crlf] = readNormalize(f);

  // 3a) Zod schema (the `rest` spread in the handler already covers persistence)
  src = apply(
    src,
    "  epaRegistration: z.string().max(60).nullable().optional(),\n  photoUrl: z.string().url().nullable().optional(),",
    "  epaRegistration: z.string().max(60).nullable().optional(),\n  activeIngredient: z.string().max(500).nullable().optional(),\n  photoUrl: z.string().url().nullable().optional(),",
    "PATCH /products/[id]: add activeIngredient to Zod schema"
  );

  writeBack(f, src, crlf);
}

// ───────────────────────────────────────────────────────────────
// 4) app/(dashboard)/settings/page.tsx
// ───────────────────────────────────────────────────────────────
{
  const f = "app/(dashboard)/settings/page.tsx";
  console.log(`\n>>> Patching ${f}`);
  backup(f);
  let [src, crlf] = readNormalize(f);

  src = apply(
    src,
    "    epaRegistration: p.epaRegistration,\n    photoUrl: p.photoUrl,",
    "    epaRegistration: p.epaRegistration,\n    activeIngredient: p.activeIngredient,\n    photoUrl: p.photoUrl,",
    "settings/page: include activeIngredient in productRows map"
  );

  writeBack(f, src, crlf);
}

console.log("\n[OK] All 7 patches applied across 4 files.\n");
console.log("Next steps:");
console.log("  1) git add . && git commit -m \"feat: editable active ingredient in product form\" && git push origin master");
console.log("  2) Wait ~1 min for Vercel auto-redeploy");
console.log("  3) Test: super_admin or manager login -> Settings -> Catalog -> Products -> Edit any product -> see the new field");
