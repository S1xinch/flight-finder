export type Params = { o: string; d: string; dep: string; ret: string; pax: number; cabin: string };

export const CABINS = ["economy", "premium", "business", "first"] as const;
const DATE = /^\d{4}-\d{2}-\d{2}$/;

/** Validate query params. Returns Params, or an error string. */
export function parseParams(get: (k: string) => string | null): Params | string {
  const o = (get("o") ?? "").toUpperCase();
  const d = (get("d") ?? "").toUpperCase();
  const dep = get("dep") ?? "";
  const ret = get("ret") ?? "";
  const pax = Number(get("pax") ?? 1);
  const cabin = get("cabin") ?? "economy";
  const today = new Date().toISOString().slice(0, 10);
  if (!/^[A-Z]{3}$/.test(o) || !/^[A-Z]{3}$/.test(d)) return "Choose where you are flying from and to (city, airport or code).";
  if (o === d) return "Origin and destination must differ.";
  if (!DATE.test(dep) || isNaN(Date.parse(dep))) return "Choose a departure date.";
  if (dep < today) return "Departure date is in the past.";
  if (ret && (!DATE.test(ret) || ret < dep)) return "Return date must be on or after departure.";
  if (!Number.isInteger(pax) || pax < 1 || pax > 9) return "Passengers must be 1-9.";
  if (!(CABINS as readonly string[]).includes(cabin)) return "Unknown cabin.";
  return { o, d, dep, ret, pax, cabin };
}

export const googleFlightsUrl = (p: Params) =>
  "https://www.google.com/travel/flights?hl=en&curr=USD&q=" +
  encodeURIComponent(
    `Flights from ${p.o} to ${p.d} on ${p.dep}${p.ret ? ` through ${p.ret}` : ""} for ${p.pax} adult${p.pax > 1 ? "s" : ""} ${p.cabin} class`,
  );

export function partnerLinks(p: Params) {
  const yymmdd = (s: string) => s.slice(2).replace(/-/g, "");
  const skyscanner = `https://www.skyscanner.com/transport/flights/${p.o.toLowerCase()}/${p.d.toLowerCase()}/${yymmdd(p.dep)}/${p.ret ? yymmdd(p.ret) + "/" : ""}?adultsv2=${p.pax}&cabinclass=${p.cabin === "premium" ? "premiumeconomy" : p.cabin}`;
  const kayak = `https://www.kayak.com/flights/${p.o}-${p.d}/${p.dep}/${p.ret ? p.ret + "/" : ""}${p.cabin === "economy" ? "" : p.cabin === "premium" ? "premium/" : p.cabin + "/"}${p.pax}adults`;
  return [
    { name: "Google Flights", url: googleFlightsUrl(p) },
    { name: "Skyscanner", url: skyscanner },
    { name: "Kayak", url: kayak },
  ];
}
