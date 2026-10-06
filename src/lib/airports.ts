export type Airport = { code: string; name: string; city: string; country: string; rank: number };
export type AirportRow = [string, string, string, string, number];

export const toAirport = (r: AirportRow): Airport => ({
  code: r[0],
  name: r[1],
  city: r[2].split("(")[0].trim(), // "Sydney (Mascot)" -> "Sydney"
  country: r[3],
  rank: r[4],
});

/** Lowercase, accent-free text for matching ("Zürich" matches "zurich"). */
export const norm = (s: string) =>
  s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().trim();

let regionNames: Intl.DisplayNames | undefined;
export function countryName(iso: string) {
  try {
    regionNames ??= new Intl.DisplayNames(["en"], { type: "region" });
    return regionNames.of(iso) ?? iso;
  } catch {
    return iso;
  }
}

// Multi-airport cities: every airport in the list also matches the metro name and its 3-letter metro code,
// so "new york" or "NYC" finds JFK, LGA and EWR (EWR's own city is "Newark").
const METROS: Record<string, [string, string[]]> = {
  NYC: ["New York", ["JFK", "LGA", "EWR"]],
  LON: ["London", ["LHR", "LGW", "STN", "LTN", "LCY", "SEN"]],
  PAR: ["Paris", ["CDG", "ORY", "BVA"]],
  TYO: ["Tokyo", ["HND", "NRT"]],
  CHI: ["Chicago", ["ORD", "MDW"]],
  WAS: ["Washington", ["IAD", "DCA", "BWI"]],
  LAX: ["Los Angeles", ["LAX", "BUR", "LGB", "SNA", "ONT"]],
  SFO: ["San Francisco Bay Area", ["SFO", "OAK", "SJC"]],
  MIL: ["Milan", ["MXP", "LIN", "BGY"]],
  ROM: ["Rome", ["FCO", "CIA"]],
  MOW: ["Moscow", ["SVO", "DME", "VKO"]],
  OSA: ["Osaka", ["KIX", "ITM", "UKB"]],
  SEL: ["Seoul", ["ICN", "GMP"]],
  BJS: ["Beijing", ["PEK", "PKX"]],
  SHA: ["Shanghai", ["PVG", "SHA"]],
  STO: ["Stockholm", ["ARN", "BMA", "NYO"]],
  SAO: ["Sao Paulo", ["GRU", "CGH", "VCP"]],
  BUE: ["Buenos Aires", ["EZE", "AEP"]],
  YTO: ["Toronto", ["YYZ", "YTZ"]],
  MIA: ["Miami", ["MIA", "FLL", "PBI"]],
  DFW: ["Dallas", ["DFW", "DAL"]],
  HOU: ["Houston", ["IAH", "HOU"]],
  BKK: ["Bangkok", ["BKK", "DMK"]],
  IST: ["Istanbul", ["IST", "SAW"]],
  JKT: ["Jakarta", ["CGK", "HLP"]],
  BER: ["Berlin", ["BER"]],
  SYD: ["Sydney", ["SYD"]],
};
const ALIASES: Record<string, string[]> = {};
for (const [metro, [city, codes]] of Object.entries(METROS))
  for (const c of codes) (ALIASES[c] ??= []).push(norm(city), metro.toLowerCase());

// First airport listed per metro is the city's main one and wins ties (JFK before LGA, CDG before BVA).
const PRIMARY = new Set(Object.values(METROS).map(([, codes]) => codes[0]));

/** Score one airport for a normalised query; 0 = no match. */
function score(a: Airport, q: string) {
  const code = a.code.toLowerCase();
  const city = norm(a.city);
  const name = norm(a.name);
  const aliases = ALIASES[a.code] ?? [];
  let s = 0;
  if (code === q) s = 100;
  else if (city === q || aliases.includes(q)) s = 90;
  else if (city.startsWith(q)) s = 80;
  else if (aliases.some((x) => x.startsWith(q))) s = 75;
  else if (name.split(/[\s-]+/).some((w) => w.startsWith(q)) || name.startsWith(q)) s = 60;
  else if (city.includes(q)) s = 35;
  else if (name.includes(q)) s = 40;
  else if (norm(countryName(a.country)).startsWith(q)) s = 30;
  else if (code.startsWith(q)) s = 25;
  return s ? s + a.rank * 3 + (PRIMARY.has(a.code) ? 5 : 0) : 0;
}

/** Best matches for typed text: city, airport name, country or code. Needs 2+ characters. */
export function searchAirports(list: Airport[], text: string, limit = 8): Airport[] {
  const q = norm(text);
  if (q.length < 2) return [];
  const hits: [number, Airport][] = [];
  for (const a of list) {
    const s = score(a, q);
    if (s) hits.push([s, a]);
  }
  return hits.sort((x, y) => y[0] - x[0] || x[1].code.localeCompare(y[1].code)).slice(0, limit).map((h) => h[1]);
}

/** "New York, United States" */
export const place = (a: Airport) => `${a.city}, ${countryName(a.country)}`;
/** Text shown in the input after choosing: "New York (JFK)" */
export const label = (a: Airport) => `${a.city} (${a.code})`;
