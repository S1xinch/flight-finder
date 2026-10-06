import type { Params } from "./links";
import { normalize, type Flight } from "./normalize";

const BASE = "https://api.brightdata.com/datasets/v3";
const DATASET = "gd_mhng7wen1rw0a3gvpf"; // Google Flights, collect by URL
const headers = () => ({
  Authorization: `Bearer ${process.env.BRIGHTDATA_API_KEY}`,
  "Content-Type": "application/json",
});
const call = (path: string, init: RequestInit = {}) =>
  fetch(`${BASE}${path}`, { ...init, headers: headers(), signal: AbortSignal.timeout(20_000) });

// Snapshot output is JSON, or NDJSON for multi-record output.
const parse = (text: string) => {
  try {
    return JSON.parse(text);
  } catch {
    return text.split("\n").filter(Boolean).map((l) => JSON.parse(l));
  }
};

// Each returned flight row can cost a credit, so keep this small: ~15 searches/day fits the 5,000 free credits/month.
const LIMIT_PER_SEARCH = 10;

/** Start an async Bright Data "discover by input filters" search. Returns its snapshot id. */
export async function trigger(p: Params): Promise<string> {
  const input = {
    origin: p.o,
    destination: p.d,
    departure: p.dep,
    ...(p.ret ? { return: p.ret } : {}),
    // The live validator wants these exact spellings (the docs' snake_case values are rejected).
    trip_type: p.ret ? "Round trip" : "One way",
    adults: p.pax,
    children: 0,
    infants_in_seat: 0,
    infants_on_lap: 0,
    cabin: { economy: "Economy", premium: "Premium economy", business: "Business", first: "First" }[p.cabin],
    currency: "USD",
    language: "en",
    country: "US",
  };
  const res = await call(
    `/trigger?dataset_id=${DATASET}&type=discover_new&discover_by=input_filters&limit_per_input=${LIMIT_PER_SEARCH}&include_errors=true`,
    { method: "POST", body: JSON.stringify([input]) },
  );
  const text = await res.text();
  if (!res.ok) throw new Error(`Bright Data ${res.status}: ${text.slice(0, 1200)}`);
  const id = parse(text).snapshot_id;
  if (!id) throw new Error(`Bright Data returned no snapshot id: ${text.slice(0, 200)}`);
  return id;
}

export type Snap = { status: "running" } | { status: "ready"; flights: Flight[] };

/** Check a collection; when finished, return the normalized flights. */
export async function snapshot(id: string): Promise<Snap> {
  const pr = await call(`/progress/${id}`);
  if (!pr.ok) throw new Error(`Bright Data progress ${pr.status}: ${(await pr.text()).slice(0, 200)}`);
  const { status } = await pr.json();
  if (status === "failed") throw new Error("Bright Data job failed");
  if (status !== "ready") return { status: "running" };

  const sr = await call(`/snapshot/${id}?format=json`);
  if (sr.status === 202) return { status: "running" };
  const text = await sr.text();
  if (!sr.ok) throw new Error(`Bright Data snapshot ${sr.status}: ${text.slice(0, 200)}`);
  const data = parse(text);
  const flights = normalize(data);
  const rows: { error?: string }[] = Array.isArray(data) ? data : [data];
  console.log(`brightdata ${rows.length} rows, ${flights.length} parsed, errors:`, JSON.stringify([...new Set(rows.map((r) => r?.error).filter(Boolean))]).slice(0, 500));
  // Depart/arrive times arrive without AM/PM in some rows; log a few so the 24-hour assumption can be checked.
  console.log("brightdata times:", JSON.stringify(rows.slice(0, 10).map((r) => (r as { legs?: { depart_local?: string; arrive_local?: string }[] }).legs?.[0]).map((l) => [l?.depart_local, l?.arrive_local])));
  return { status: "ready", flights };
}
