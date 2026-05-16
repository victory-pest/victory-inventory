// patch-bottom-nav.js
// Enlarges icons + labels in the mobile BottomNav for better usability.
//
// Run from C:\victory-inventory\ :
//     node patch-bottom-nav.js

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

const f = "components/layout/BottomNav.tsx";
console.log(`\n>>> Patching ${f}`);
backup(f);
let [src, crlf] = readNormalize(f);

// 1) Enlarge wrapper: padding + label size + gap
src = apply(
  src,
  '"flex flex-col items-center justify-center gap-0.5 py-2 text-[10px] font-medium transition-colors",',
  '"flex flex-col items-center justify-center gap-1 py-2.5 text-xs font-medium transition-colors",',
  "BottomNav: enlarge padding (py-2 -> py-2.5), gap (0.5 -> 1), label (text-[10px] -> text-xs)"
);

// 2) Enlarge icon
src = apply(
  src,
  '<Icon className={cn("h-5 w-5", active && "stroke-[2.5]")} />',
  '<Icon className={cn("h-6 w-6", active && "stroke-[2.5]")} />',
  "BottomNav: enlarge icons (h-5 w-5 -> h-6 w-6)"
);

writeBack(f, src, crlf);

console.log("\n[OK] BottomNav enlarged.\n");
console.log("Next steps:");
console.log("  1) git add . && git commit -m \"feat: larger mobile bottom nav icons and labels\" && git push origin master");
console.log("  2) Wait ~1 min for Vercel auto-redeploy");
console.log("  3) Reload the app on your phone and compare");
