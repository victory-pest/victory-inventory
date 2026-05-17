// hotfix-reporttable-destructure.js
// Adds groupBy to the function destructure in ReportTable.tsx
// (previous patch added it to the type annotation but not to the destructure)

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

const f = "components/reports/ReportTable.tsx";
console.log(`>>> Hotfixing ${f}`);
let [src, crlf] = readNormalize(f);

src = apply(
  src,
  "  columns,\n  rows,\n}: {",
  "  columns,\n  rows,\n  groupBy,\n}: {",
  "ReportTable: add groupBy to destructure (was missing)"
);

writeBack(f, src, crlf);
console.log("\n[OK] Hotfix applied.\n");
console.log("Next:");
console.log("  git add . && git commit -m \"fix: destructure groupBy in ReportTable\" && git push origin master");
