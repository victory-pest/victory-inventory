// patch-report-grouping.js
// Adds:
//   1) Group-by-category support to the report framework (web/PDF/Excel)
//   2) Catalog report uses groupBy="category" with JS sort fallback
//   3) Sidebar sorted alphabetically by report title
//
// Run from C:\victory-inventory\ :
//     node patch-report-grouping.js

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

  // 1a) Add groupBy? field to ReportDefinition
  src = apply(
    src,
    "  needsDateRange: boolean;\n  needsLocation?: boolean;\n  columns: ReportColumn[];",
    "  needsDateRange: boolean;\n  needsLocation?: boolean;\n  groupBy?: string;\n  columns: ReportColumn[];",
    "lib/reports: add groupBy? to ReportDefinition"
  );

  // 1b) Set groupBy on catalog definition
  src = apply(
    src,
    '    needsDateRange: false,\n    needsLocation: false,\n    columns: [',
    '    needsDateRange: false,\n    needsLocation: false,\n    groupBy: "category",\n    columns: [',
    "lib/reports: set groupBy='category' on catalog definition"
  );

  // 1c) Add JS sort in runCatalogReport (defensive — covers nullable category fields)
  src = apply(
    src,
    "    status: p.active ? \"active\" : \"inactive\",\n  }));\n\n  return { rows };\n}\n\nasync function runStockReport",
    "    status: p.active ? \"active\" : \"inactive\",\n  }));\n\n  rows.sort(\n    (a, b) =>\n      String(a.category).localeCompare(String(b.category)) ||\n      String(a.name).localeCompare(String(b.name)),\n  );\n\n  return { rows };\n}\n\nasync function runStockReport",
    "lib/reports: JS-side sort by category then name in runCatalogReport"
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

  src = apply(
    src,
    "          <ReportViewer\n            companyName={tenant.name}\n            reportTitle={def.title}\n            reportSubtitle={subtitle}\n            columns={def.columns}\n            rows={result.rows}\n            filenameBase={filenameBase}\n          />",
    "          <ReportViewer\n            companyName={tenant.name}\n            reportTitle={def.title}\n            reportSubtitle={subtitle}\n            columns={def.columns}\n            rows={result.rows}\n            filenameBase={filenameBase}\n            groupBy={def.groupBy}\n          />",
    "reports/page: pass def.groupBy to ReportViewer"
  );

  writeBack(f, src, crlf);
}

// ───────────────────────────────────────────────────────────────
// 3) components/reports/ReportSidebar.tsx (alphabetical sort)
// ───────────────────────────────────────────────────────────────
{
  const f = "components/reports/ReportSidebar.tsx";
  console.log(`\n>>> Patching ${f}`);
  backup(f);
  let [src, crlf] = readNormalize(f);

  // 3a) Add sortedDefinitions var
  src = apply(
    src,
    "  const params = useSearchParams();\n  function hrefFor(id: string) {",
    "  const params = useSearchParams();\n  const sortedDefinitions = [...definitions].sort((a, b) =>\n    a.title.localeCompare(b.title),\n  );\n  function hrefFor(id: string) {",
    "ReportSidebar: add sortedDefinitions (alphabetical)"
  );

  // 3b) Desktop nav uses sorted
  src = apply(
    src,
    '<nav className="hidden md:block sticky top-20 self-start space-y-1">\n        {definitions.map((d) => (',
    '<nav className="hidden md:block sticky top-20 self-start space-y-1">\n        {sortedDefinitions.map((d) => (',
    "ReportSidebar: desktop nav uses sortedDefinitions"
  );

  // 3c) Mobile chips uses sorted
  src = apply(
    src,
    '<div className="md:hidden flex gap-2 overflow-x-auto pb-2 -mx-4 px-4">\n        {definitions.map((d) => (',
    '<div className="md:hidden flex gap-2 overflow-x-auto pb-2 -mx-4 px-4">\n        {sortedDefinitions.map((d) => (',
    "ReportSidebar: mobile chips uses sortedDefinitions"
  );

  writeBack(f, src, crlf);
}

// ───────────────────────────────────────────────────────────────
// 4) components/reports/ReportViewer.tsx
// ───────────────────────────────────────────────────────────────
{
  const f = "components/reports/ReportViewer.tsx";
  console.log(`\n>>> Patching ${f}`);
  backup(f);
  let [src, crlf] = readNormalize(f);

  // 4a) Add groupBy to Props
  src = apply(
    src,
    "  rows: ReportRow[];\n  filenameBase: string;\n};",
    "  rows: ReportRow[];\n  filenameBase: string;\n  groupBy?: string;\n};",
    "ReportViewer: add groupBy to Props"
  );

  // 4b) Destructure groupBy
  src = apply(
    src,
    "  rows,\n  filenameBase,\n}: Props) {",
    "  rows,\n  filenameBase,\n  groupBy,\n}: Props) {",
    "ReportViewer: destructure groupBy"
  );

  // 4c) Pass groupBy to ExportButtons
  src = apply(
    src,
    "        <ExportButtons\n          companyName={companyName}\n          reportTitle={reportTitle}\n          reportSubtitle={reportSubtitle}\n          columns={columns}\n          rows={rows}\n          filenameBase={filenameBase}\n        />",
    "        <ExportButtons\n          companyName={companyName}\n          reportTitle={reportTitle}\n          reportSubtitle={reportSubtitle}\n          columns={columns}\n          rows={rows}\n          filenameBase={filenameBase}\n          groupBy={groupBy}\n        />",
    "ReportViewer: pass groupBy to ExportButtons"
  );

  // 4d) Pass groupBy to ReportTable
  src = apply(
    src,
    "<ReportTable columns={columns} rows={rows} />",
    "<ReportTable columns={columns} rows={rows} groupBy={groupBy} />",
    "ReportViewer: pass groupBy to ReportTable"
  );

  writeBack(f, src, crlf);
}

// ───────────────────────────────────────────────────────────────
// 5) components/reports/ReportTable.tsx
// ───────────────────────────────────────────────────────────────
{
  const f = "components/reports/ReportTable.tsx";
  console.log(`\n>>> Patching ${f}`);
  backup(f);
  let [src, crlf] = readNormalize(f);

  // 5a) Add Fragment import
  src = apply(
    src,
    '"use client";\nimport { cn } from "@/lib/utils";',
    '"use client";\nimport { Fragment } from "react";\nimport { cn } from "@/lib/utils";',
    "ReportTable: add Fragment import"
  );

  // 5b) Add groupBy prop
  src = apply(
    src,
    "export function ReportTable({\n  columns,\n  rows,\n}: {\n  columns: ReportColumn[];\n  rows: ReportRow[];\n}) {",
    "export function ReportTable({\n  columns,\n  rows,\n  groupBy,\n}: {\n  columns: ReportColumn[];\n  rows: ReportRow[];\n  groupBy?: string;\n}) {",
    "ReportTable: add groupBy prop"
  );

  // 5c) Open: replace `rows.map((r, idx) => (\n            <TableRow key={idx}>` with grouping wrapper
  src = apply(
    src,
    "          {rows.map((r, idx) => (\n            <TableRow key={idx}>",
    `          {rows.map((r, idx) => {
            const currentGroup = groupBy ? String(r[groupBy] ?? "") : "";
            const prevGroup =
              idx > 0 && groupBy ? String(rows[idx - 1][groupBy] ?? "") : "";
            const isNewGroup = !!groupBy && currentGroup !== prevGroup;
            return (
              <Fragment key={idx}>
                {isNewGroup && (
                  <TableRow className="bg-brand-bg/60 hover:bg-brand-bg/60">
                    <TableCell
                      colSpan={columns.length}
                      className="font-bold text-brand-primary uppercase text-xs tracking-wider py-2.5"
                    >
                      {currentGroup || "(uncategorized)"}
                    </TableCell>
                  </TableRow>
                )}
                <TableRow>`,
    "ReportTable: open grouping wrapper around each row"
  );

  // 5d) Close: replace `</TableRow>\n          ))}\n        </TableBody>` with close of wrapper
  src = apply(
    src,
    "              })}\n            </TableRow>\n          ))}\n        </TableBody>",
    "              })}\n            </TableRow>\n              </Fragment>\n            );\n          })}\n        </TableBody>",
    "ReportTable: close grouping wrapper"
  );

  writeBack(f, src, crlf);
}

// ───────────────────────────────────────────────────────────────
// 6) components/reports/ReportPdfDocument.tsx
// ───────────────────────────────────────────────────────────────
{
  const f = "components/reports/ReportPdfDocument.tsx";
  console.log(`\n>>> Patching ${f}`);
  backup(f);
  let [src, crlf] = readNormalize(f);

  // 6a) Add Fragment import — first move the existing react-pdf import line and prepend
  src = apply(
    src,
    '"use client";\n\nimport {\n  Document,',
    '"use client";\n\nimport { Fragment } from "react";\nimport {\n  Document,',
    "ReportPdfDocument: add Fragment import"
  );

  // 6b) Add groupBy to Props
  src = apply(
    src,
    "  rows: ReportRow[];\n  generatedAt: string;\n};",
    "  rows: ReportRow[];\n  generatedAt: string;\n  groupBy?: string;\n};",
    "ReportPdfDocument: add groupBy to Props"
  );

  // 6c) Rewrite the rows mapping to insert group header rows
  src = apply(
    src,
    `            props.rows.map((row, idx) => (
              <View
                key={idx}
                style={[
                  styles.tableRow,
                  { backgroundColor: idx % 2 === 0 ? "white" : "#FAFAFA" },
                ]}
                wrap={false}
              >
                {props.columns.map((c) => (
                  <Text
                    key={c.key}
                    style={[
                      styles.td,
                      {
                        width: \`\${colWidth}%\`,
                        textAlign:
                          c.align === "right"
                            ? "right"
                            : c.align === "center"
                              ? "center"
                              : "left",
                      },
                    ]}
                  >
                    {formatCell(row[c.key], c.format)}
                  </Text>
                ))}
              </View>
            ))`,
    `            props.rows.map((row, idx) => {
              const currentGroup = props.groupBy
                ? String(row[props.groupBy] ?? "")
                : "";
              const prevGroup =
                idx > 0 && props.groupBy
                  ? String(props.rows[idx - 1][props.groupBy] ?? "")
                  : "";
              const isNewGroup =
                !!props.groupBy && currentGroup !== prevGroup;
              return (
                <Fragment key={idx}>
                  {isNewGroup && (
                    <View
                      style={{
                        flexDirection: "row",
                        backgroundColor: "#E3F2FD",
                        borderTopWidth: 0.5,
                        borderTopColor: "#1565C0",
                        borderBottomWidth: 0.5,
                        borderBottomColor: "#1565C0",
                      }}
                      wrap={false}
                    >
                      <Text
                        style={{
                          padding: 5,
                          fontFamily: "Helvetica-Bold",
                          color: "#1565C0",
                          fontSize: 9,
                          width: "100%",
                        }}
                      >
                        {(currentGroup || "(uncategorized)").toUpperCase()}
                      </Text>
                    </View>
                  )}
                  <View
                    style={[
                      styles.tableRow,
                      { backgroundColor: idx % 2 === 0 ? "white" : "#FAFAFA" },
                    ]}
                    wrap={false}
                  >
                    {props.columns.map((c) => (
                      <Text
                        key={c.key}
                        style={[
                          styles.td,
                          {
                            width: \`\${colWidth}%\`,
                            textAlign:
                              c.align === "right"
                                ? "right"
                                : c.align === "center"
                                  ? "center"
                                  : "left",
                          },
                        ]}
                      >
                        {formatCell(row[c.key], c.format)}
                      </Text>
                    ))}
                  </View>
                </Fragment>
              );
            })`,
    "ReportPdfDocument: insert group header View before each new category"
  );

  writeBack(f, src, crlf);
}

// ───────────────────────────────────────────────────────────────
// 7) components/reports/ExportButtons.tsx
// ───────────────────────────────────────────────────────────────
{
  const f = "components/reports/ExportButtons.tsx";
  console.log(`\n>>> Patching ${f}`);
  backup(f);
  let [src, crlf] = readNormalize(f);

  // 7a) Add groupBy to Props
  src = apply(
    src,
    "  rows: ReportRow[];\n  filenameBase: string;\n};",
    "  rows: ReportRow[];\n  filenameBase: string;\n  groupBy?: string;\n};",
    "ExportButtons: add groupBy to Props"
  );

  // 7b) Destructure groupBy
  src = apply(
    src,
    "  rows,\n  filenameBase,\n}: Props) {",
    "  rows,\n  filenameBase,\n  groupBy,\n}: Props) {",
    "ExportButtons: destructure groupBy"
  );

  // 7c) Pass groupBy to ReportPdfDocument
  src = apply(
    src,
    "        <ReportPdfDocument\n          logoUrl={logoUrl}\n          companyName={companyName}\n          reportTitle={reportTitle}\n          reportSubtitle={reportSubtitle}\n          columns={columns}\n          rows={rows}\n          generatedAt={new Date().toLocaleString()}\n        />,",
    "        <ReportPdfDocument\n          logoUrl={logoUrl}\n          companyName={companyName}\n          reportTitle={reportTitle}\n          reportSubtitle={reportSubtitle}\n          columns={columns}\n          rows={rows}\n          generatedAt={new Date().toLocaleString()}\n          groupBy={groupBy}\n        />,",
    "ExportButtons: pass groupBy to ReportPdfDocument"
  );

  // 7d) Rewrite Excel row construction to insert group header rows
  src = apply(
    src,
    `      const sheetRows = [
        columns.map((c) => c.label),
        ...rows.map((r) =>
          columns.map((c) => {
            const raw = r[c.key];
            if (c.format === "number" || c.format === "currency") return Number(raw ?? 0);
            if (c.format === "percent") return Number(raw ?? 0);
            if (c.format === "date" || c.format === "datetime") {
              if (raw === null || raw === undefined || raw === "") return "";
              try {
                return new Date(String(raw));
              } catch {
                return String(raw);
              }
            }
            return formatCell(raw, c.format);
          }),
        ),
      ];`,
    `      const cellFor = (r: ReportRow, c: ReportColumn): string | number | Date => {
        const raw = r[c.key];
        if (c.format === "number" || c.format === "currency") return Number(raw ?? 0);
        if (c.format === "percent") return Number(raw ?? 0);
        if (c.format === "date" || c.format === "datetime") {
          if (raw === null || raw === undefined || raw === "") return "";
          try {
            return new Date(String(raw));
          } catch {
            return String(raw);
          }
        }
        return formatCell(raw, c.format);
      };
      const sheetRows: (string | number | Date)[][] = [
        columns.map((c) => c.label),
      ];
      let prevGroup: string | undefined;
      for (const r of rows) {
        const currentGroup = groupBy ? String(r[groupBy] ?? "") : undefined;
        if (groupBy && currentGroup !== prevGroup) {
          sheetRows.push([
            (currentGroup || "(uncategorized)").toUpperCase(),
            ...Array(columns.length - 1).fill(""),
          ]);
          prevGroup = currentGroup;
        }
        sheetRows.push(columns.map((c) => cellFor(r, c)));
      }`,
    "ExportButtons: Excel — insert group header rows between categories"
  );

  writeBack(f, src, crlf);
}

console.log("\n[OK] All patches applied across 7 files.\n");
console.log("Next steps:");
console.log("  1) git add . && git commit -m \"feat: grouped catalog report + alpha-sorted sidebar\" && git push origin master");
console.log("  2) Wait ~1 min for Vercel auto-redeploy");
console.log("  3) Test as manager: /reports -> sidebar should be alphabetical");
console.log("  4) Test Product Catalog -> sections by Category, products alphabetic within");
console.log("  5) Try PDF + Excel exports -> both should show category headers");
