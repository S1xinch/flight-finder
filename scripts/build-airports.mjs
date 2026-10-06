// Builds src/data/airports.json from OurAirports (public domain): https://ourairports.com/data/
// Usage: node scripts/build-airports.mjs
import { mkdirSync, writeFileSync } from "node:fs";

const res = await fetch("https://davidmegginson.github.io/ourairports-data/airports.csv");
if (!res.ok) throw new Error(`download failed: ${res.status}`);
const text = await res.text();

// Minimal CSV parser (quoted fields, doubled quotes, newlines inside quotes).
function* rows(s) {
  let row = [], field = "", q = false;
  for (let i = 0; i < s.length; i++) {
    const c = s[i];
    if (q) {
      if (c === '"' && s[i + 1] === '"') { field += '"'; i++; }
      else if (c === '"') q = false;
      else field += c;
    } else if (c === '"') q = true;
    else if (c === ",") { row.push(field); field = ""; }
    else if (c === "\n") { row.push(field); yield row; row = []; field = ""; }
    else if (c !== "\r") field += c;
  }
  if (field || row.length) { row.push(field); yield row; }
}

const it = rows(text);
const head = it.next().value;
const col = Object.fromEntries(head.map((h, i) => [h, i]));
const RANK = { large_airport: 2, medium_airport: 1, small_airport: 0 };
const out = [];
for (const r of it) {
  const iata = r[col.iata_code];
  const rank = RANK[r[col.type]];
  if (!/^[A-Z]{3}$/.test(iata) || rank === undefined || r[col.scheduled_service] !== "yes") continue;
  // [iata, name, city, ISO country, rank]
  out.push([iata, r[col.name], r[col.municipality] || r[col.name], r[col.iso_country], rank]);
}
out.sort((a, b) => b[4] - a[4] || a[0].localeCompare(b[0]));
mkdirSync("src/data", { recursive: true });
writeFileSync("src/data/airports.json", JSON.stringify(out));
console.log(`${out.length} airports written`);
