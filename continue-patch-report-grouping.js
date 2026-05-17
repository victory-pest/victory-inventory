// continue-patch-report-grouping.js
// Continues from where patch-report-grouping.js failed.
// - Skips lib/reports.ts and page.tsx (already patched in first run)
// - Uses single-line finds for ReportSidebar (more robust)
// - Idempotent: re-running won't duplicate or break anything

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

// Idempotent: if already applied (find missing, replace present), skip.
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

function applyAll(src, find, replace, expectedCount, label) {
  const fc = countOccurrences(src, find);
  const rc = countOccurrences(src, replace);
  if (fc === 0 && rc >= expectedCount) {
    console.log(`  [skip  ] ${label} (already applied)`);
    return src;
  }
  if (fc !== expectedCount) {
    throw new Error(`[${label}] expected ${expectedCount} matches, found ${fc}`);
  }
  console.log(`  [patch ] ${label} (${expectedCount} replacements)`);
  return src.split(find).join(replace);
}

// ───────────────────────────────────────────────────────────────
// 3) components/reports/ReportSidebar.tsx  (robust single-line finds)
// ───────────────────────────────────────────────────────────────
{
  const f = "components/reports/ReportSidebar.tsx";
  console.log(`\n>>> Patching ${f}`);
  backup(f);
  let [src, crlf] = readNormalize(f);

  // 3a) Insert sortedDefinitions block before `function hrefFor(...)`
  src = apply(
    src,
    "  function hrefFor(id: string) {",
    "  const sortedDefinitions = [...definitions].sort((a, b) =>\n    a.title.localeCompare(b.title),\n  );\n  function hrefFor(id: string) {",
    "ReportSidebar: add sortedDefinitions before hrefFor"
  );

  // 3b) Replace both `{definitions.map(` with `{sortedDefinitions.map(` (2 occurrences)
  src = applyAll(
    src,
    "{definitions.map((d) => (",
    "{sortedDefinitions.map((d) => (",
    2,
    "ReportSidebar: use sortedDefinitions in both .map calls"
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

  // 4c) Pass groupBy to ExportButtons (use single-line find for the last prop)
  src = apply(
    src,
    "          filenameBase={filenameBase}\n        />",
    "          filenameBase={filenameBase}\n          groupBy={groupBy}\n        />",
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

  // 5c) Open: wrap rendering in arrow-body + Fragment with section header
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
    "ReportTable: open Fragment grouping wrapper"
  );

  // 5d) Close: close Fragment + arrow function
  src = apply(
    src,
    "              })}\n            </TableRow>\n          ))}\n        </TableBody>",
    "              })}\n            </TableRow>\n              </Fragment>\n            );\n          })}\n        </TableBody>",
    "ReportTable: close Fragment grouping wrapper"
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

  // 6a) Add Fragment import (insert after "use client";)
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

  // 6c) Rewrite rows mapping to include group headers
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
    "ReportPdfDocument: insert group header View"
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

  // 7c) Pass groupBy to ReportPdfDocument (use single-line find)
  src = apply(
    src,
    "          generatedAt={new Date().toLocaleString()}\n        />,",
    "          generatedAt={new Date().toLocaleString()}\n          groupBy={groupBy}\n        />,",
    "ExportButtons: pass groupBy to ReportPdfDocument"
  );

  // 7d) Rewrite Excel sheetRows construction to insert group header rows
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

console.log("\n[OK] All remaining patches applied.\n");
console.log("Next steps:");
console.log("  1) git add . && git commit -m \"feat: grouped catalog report + alpha-sorted sidebar\" && git push origin master");
console.log("  2) Wait ~1 min for Vercel auto-redeploy");
console.log("  3) Test: manager login -> /reports -> sidebar alphabetical, Product Catalog grouped");
