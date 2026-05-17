// patch-catalog-report.js
// Adds a new "Product Catalog" report to the reports system.
// Inherits PDF / Excel / Print exports for free from existing infrastructure.
//
// Run from C:\victory-inventory\ :
//     node patch-catalog-report.js

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
// 1) lib/reports.ts
// ───────────────────────────────────────────────────────────────
{
  const f = "lib/reports.ts";
  console.log(`\n>>> Patching ${f}`);
  backup(f);
  let [src, crlf] = readNormalize(f);

  // 1a) Add "catalog" to ReportType union (at the top of the list)
  src = apply(
    src,
    'export type ReportType =\n  | "stock"\n  | "below-min"',
    'export type ReportType =\n  | "catalog"\n  | "stock"\n  | "below-min"',
    "lib/reports: add 'catalog' to ReportType union"
  );

  // 1b) Add needsLocation? to ReportDefinition type
  src = apply(
    src,
    "  managerOnly: boolean;\n  needsDateRange: boolean;\n  columns: ReportColumn[];",
    "  managerOnly: boolean;\n  needsDateRange: boolean;\n  needsLocation?: boolean;\n  columns: ReportColumn[];",
    "lib/reports: add needsLocation? to ReportDefinition"
  );

  // 1c) Insert catalog definition at top of REPORT_DEFINITIONS
  src = apply(
    src,
    'export const REPORT_DEFINITIONS: ReportDefinition[] = [\n  {\n    id: "stock",',
    `export const REPORT_DEFINITIONS: ReportDefinition[] = [
  {
    id: "catalog",
    title: "Product Catalog",
    description: "Master list of products with all attributes, grouped by category",
    managerOnly: false,
    needsDateRange: false,
    needsLocation: false,
    columns: [
      { key: "name", label: "Product" },
      { key: "sku", label: "SKU" },
      { key: "category", label: "Category" },
      { key: "activeIngredient", label: "Active Ingredient" },
      { key: "epaRegistration", label: "EPA Reg #" },
      { key: "supplier", label: "Supplier" },
      { key: "unit", label: "Unit" },
      { key: "unitCost", label: "Unit Cost", align: "right", format: "currency" },
      { key: "licenses", label: "Licenses" },
      { key: "status", label: "Status", format: "status" },
    ],
  },
  {
    id: "stock",`,
    "lib/reports: insert catalog ReportDefinition at top of REPORT_DEFINITIONS"
  );

  // 1d) Add activeFilter? to ReportFilters type
  src = apply(
    src,
    "  rangeStart: Date;\n  rangeEnd: Date;\n  locationId: string | null;\n};",
    '  rangeStart: Date;\n  rangeEnd: Date;\n  locationId: string | null;\n  activeFilter?: "active" | "inactive" | "all";\n};',
    "lib/reports: add activeFilter to ReportFilters type"
  );

  // 1e) Add case in runReport switch (right after "switch (type) {")
  src = apply(
    src,
    'switch (type) {\n    case "stock":\n      return runStockReport(filters);',
    'switch (type) {\n    case "catalog":\n      return runCatalogReport(filters);\n    case "stock":\n      return runStockReport(filters);',
    "lib/reports: add 'catalog' case in runReport switch"
  );

  // 1f) Add runCatalogReport function BEFORE runStockReport
  src = apply(
    src,
    "async function runStockReport(filters: ReportFilters): Promise<ReportResult> {",
    `async function runCatalogReport(filters: ReportFilters): Promise<ReportResult> {
  const activeFilter = filters.activeFilter ?? "active";
  const products = await prisma.product.findMany({
    where: {
      companyId: filters.companyId,
      ...(activeFilter === "active" ? { active: true } : {}),
      ...(activeFilter === "inactive" ? { active: false } : {}),
    },
    include: {
      category: { select: { name: true } },
      supplier: { select: { name: true } },
      unit: { select: { abbreviation: true, name: true } },
      licenses: { include: { licenseType: { select: { name: true } } } },
    },
    orderBy: [{ category: { name: "asc" } }, { name: "asc" }],
  });

  const rows: ReportRow[] = products.map((p) => ({
    name: p.name,
    sku: p.sku ?? "",
    category: p.category?.name ?? "",
    activeIngredient: p.activeIngredient ?? "",
    epaRegistration: p.epaRegistration ?? "",
    supplier: p.supplier?.name ?? "",
    unit: p.unit?.abbreviation ?? p.unit?.name ?? "",
    unitCost: Number(p.unitCost),
    licenses: p.licenses.map((l) => l.licenseType.name).join(", "),
    status: p.active ? "active" : "inactive",
  }));

  return { rows };
}

async function runStockReport(filters: ReportFilters): Promise<ReportResult> {`,
    "lib/reports: add runCatalogReport function"
  );

  writeBack(f, src, crlf);
}

// ───────────────────────────────────────────────────────────────
// 2) app/(dashboard)/reports/page.tsx
// ───────────────────────────────────────────────────────────────
{
  const f = "app/(dashboard)/reports/page.tsx";
  console.log(`\n>>> Patching ${f}`);
  backup(f);
  let [src, crlf] = readNormalize(f);

  // 2a) Add 'active' to searchParams type
  src = apply(
    src,
    "    type?: string;\n    range?: string;\n    from?: string;\n    to?: string;\n    location?: string;\n  }>;",
    "    type?: string;\n    range?: string;\n    from?: string;\n    to?: string;\n    location?: string;\n    active?: string;\n  }>;",
    "reports/page: add 'active' to searchParams type"
  );

  // 2b) Parse activeFilter from sp.active right after we have sp
  src = apply(
    src,
    "  const sp = await searchParams;\n  const allowedIds = definitions.map((d) => d.id);",
    `  const sp = await searchParams;
  const allowedIds = definitions.map((d) => d.id);
  const activeFilter: "active" | "inactive" | "all" =
    sp.active === "inactive" ? "inactive" : sp.active === "all" ? "all" : "active";`,
    "reports/page: parse activeFilter from URL"
  );

  // 2c) Pass activeFilter to runReport
  src = apply(
    src,
    "  const result = await runReport(type, {\n    companyId: user.companyId,\n    role: user.role,\n    userLocationId: user.locationId ?? null,\n    rangeStart: start,\n    rangeEnd: end,\n    locationId: effectiveLocationId,\n  });",
    "  const result = await runReport(type, {\n    companyId: user.companyId,\n    role: user.role,\n    userLocationId: user.locationId ?? null,\n    rangeStart: start,\n    rangeEnd: end,\n    locationId: effectiveLocationId,\n    activeFilter,\n  });",
    "reports/page: pass activeFilter to runReport"
  );

  // 2d) Replace simple subtitle with branching version that handles catalog
  src = apply(
    src,
    "  const subtitle = def.needsDateRange\n    ? `${formatDateRange(start, end)} \u00b7 ${locationName}`\n    : locationName;",
    `  let subtitle: string;
  if (def.needsDateRange) {
    subtitle = \`\${formatDateRange(start, end)} \u00b7 \${locationName}\`;
  } else if (def.needsLocation ?? true) {
    subtitle = locationName;
  } else {
    subtitle =
      activeFilter === "active"
        ? "Active products only"
        : activeFilter === "inactive"
          ? "Inactive products only"
          : "All products";
  }`,
    "reports/page: branched subtitle that supports catalog (no date/location)"
  );

  // 2e) Update ReportFilters component props
  src = apply(
    src,
    "            <ReportFilters\n              type={type}\n              rangePreset={rangePreset}\n              customFrom={customFrom}\n              customTo={customTo}\n              locationId={locationParam}\n              locations={locations}\n              showDate={def.needsDateRange}\n              showLocation={user.role !== \"supervisor\"}\n            />",
    "            <ReportFilters\n              type={type}\n              rangePreset={rangePreset}\n              customFrom={customFrom}\n              customTo={customTo}\n              locationId={locationParam}\n              locations={locations}\n              showDate={def.needsDateRange}\n              showLocation={(def.needsLocation ?? true) && user.role !== \"supervisor\"}\n              activeFilter={activeFilter}\n              showActiveFilter={type === \"catalog\"}\n            />",
    "reports/page: pass activeFilter+showActiveFilter to ReportFilters, use def.needsLocation"
  );

  writeBack(f, src, crlf);
}

// ───────────────────────────────────────────────────────────────
// 3) components/reports/ReportFilters.tsx
// ───────────────────────────────────────────────────────────────
{
  const f = "components/reports/ReportFilters.tsx";
  console.log(`\n>>> Patching ${f}`);
  backup(f);
  let [src, crlf] = readNormalize(f);

  // 3a) Add new props to type Props
  src = apply(
    src,
    "  showDate: boolean;\n  showLocation: boolean;\n};",
    '  showDate: boolean;\n  showLocation: boolean;\n  activeFilter?: "active" | "inactive" | "all";\n  showActiveFilter?: boolean;\n};',
    "ReportFilters: add activeFilter+showActiveFilter to Props type"
  );

  // 3b) Destructure new props in function signature
  src = apply(
    src,
    "  showDate,\n  showLocation,\n}: Props) {",
    "  showDate,\n  showLocation,\n  activeFilter,\n  showActiveFilter,\n}: Props) {",
    "ReportFilters: destructure new props"
  );

  // 3c) Insert Status filter at end of JSX (right before closing wrapper div)
  src = apply(
    src,
    `              {l.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}
    </div>
  );
}`,
    `              {l.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}

      {showActiveFilter && (
        <div className="space-y-1.5">
          <Label className="text-xs uppercase tracking-wide text-brand-dark/60">
            Status
          </Label>
          <Select
            value={activeFilter ?? "active"}
            onValueChange={(v) =>
              navigate({ active: v === "active" ? null : v })
            }
          >
            <SelectTrigger className="w-[160px] bg-white">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="active">Active only</SelectItem>
              <SelectItem value="inactive">Inactive only</SelectItem>
              <SelectItem value="all">All products</SelectItem>
            </SelectContent>
          </Select>
        </div>
      )}
    </div>
  );
}`,
    "ReportFilters: add Status select after Location"
  );

  writeBack(f, src, crlf);
}

console.log("\n[OK] All patches applied across 3 files.\n");
console.log("Next steps:");
console.log("  1) git add . && git commit -m \"feat: product catalog report with PDF/Excel export\" && git push origin master");
console.log("  2) Wait ~1 min for Vercel auto-redeploy");
console.log("  3) Test: manager or supervisor login -> Reports -> 'Product Catalog' should be first in the sidebar");
console.log("  4) Try PDF/Excel/Print buttons, toggle Status filter Active/Inactive/All");
