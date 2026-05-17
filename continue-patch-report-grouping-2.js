// continue-patch-report-grouping-2.js
// Final patch: handles the last 3 files that the previous continue script
// either failed on or hadn't reached yet.
// - ReportTable.tsx (failed at Fragment import — single-line find now)
// - ReportPdfDocument.tsx (not reached)
// - ExportButtons.tsx (not reached)
// Idempotent: skips already-applied patches.

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
// 5) components/reports/ReportTable.tsx
// ───────────────────────────────────────────────────────────────
{
  const f = "components/reports/ReportTable.tsx";
  console.log(`\n>>> Patching ${f}`);
  backup(f);
  let [src, crlf] = readNormalize(f);

  // 5a) Add Fragment import — SINGLE-LINE find (was failing as multi-line)
  src = apply(
    src,
    'import { cn } from "@/lib/utils";',
    'import { Fragment } from "react";\nimport { cn } from "@/lib/utils";',
    "ReportTable: add Fragment import"
  );

  // 5b) Add groupBy prop — shorter multi-line (just 2 lines, unique anchor)
  src = apply(
    src,
    "  rows: ReportRow[];\n}) {",
    "  rows: ReportRow[];\n  groupBy?: string;\n}) {",
    "ReportTable: add groupBy prop"
  );

  // 5c) Open Fragment wrapper around each row
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

  // 5d) Close Fragment + arrow function
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

  // 6a) Add Fragment import — SINGLE-LINE find on react-pdf import close
  src = apply(
    src,
    '} from "@react-pdf/renderer";',
    '} from "@react-pdf/renderer";\nimport { Fragment } from "react";',
    "ReportPdfDocument: add Fragment import after react-pdf imports"
  );

  // 6b) Add groupBy to Props
  src = apply(
    src,
    "  rows: ReportRow[];\n  generatedAt: string;\n};",
    "  rows: ReportRow[];\n  generatedAt: string;\n  groupBy?: string;\n};",
    "ReportPdfDocument: add groupBy to Props"
  );

  // 6c) Rewrite rows mapping with group headers
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

  // 7c) Pass groupBy to ReportPdfDocument
  src = apply(
    src,
    "          generatedAt={new Date().toLocaleString()}\n        />,",
    "          generatedAt={new Date().toLocaleString()}\n          groupBy={groupBy}\n        />,",
    "ExportButtons: pass groupBy to ReportPdfDocument"
  );

  // 7d) Rewrite Excel sheetRows construction
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
console.log("  3) Test as manager: /reports -> sidebar alphabetical, Product Catalog grouped");
