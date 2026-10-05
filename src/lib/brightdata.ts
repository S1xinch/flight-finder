import { googleFlightsUrl, type Params } from "./links";
import { normalize, type Flight } from "./normalize";

const BASE = "https://api.brightdata.com/datasets/v3";
const DATASET = "gd_mhng7wen1rw0a3gvpf"; // Google Flights, collect by URL
const DEADLINE_MS = 55_000; // route maxDuration is 60s
const headers = () => ({
  Authorization: `Bearer ${process.env.BRIGHTDATA_API_KEY}`,
  "Content-Type": "application/json",
});

// Sync endpoint returns JSON, or NDJSON for multi-record output.
const parse = (text: string) => {
  try {
    return JSON.parse(text);
  } catch {
    return text.split("\n").filter(Boolean).map((l) => JSON.parse(l));
  }
};

async function poll(id: string, until: number) {
  while (Date.now() < until) {
    await new Promise((r) => setTimeout(r, 2000));
    const p = await fetch(`${BASE}/progress/${id}`, { headers: headers() });
    const { status } = await p.json();
    if (status === "failed") throw new Error("Bright Data job failed");
    if (status === "ready") {
      const s = await fetch(`${BASE}/snapshot/${id}?format=json`, { headers: headers() });
      return parse(await s.text());
    }
  }
  throw new Error("Bright Data timed out");
}

export async function fetchFlights(p: Params): Promise<Flight[]> {
  const until = Date.now() + DEADLINE_MS;
  const res = await fetch(`${BASE}/scrape?dataset_id=${DATASET}&notify=false&include_errors=true`, {
    method: "POST",
    headers: headers(),
    body: JSON.stringify({ input: [{ url: googleFlightsUrl(p) }] }),
    signal: AbortSignal.timeout(DEADLINE_MS),
  });
  if (!res.ok) throw new Error(`Bright Data ${res.status}`);
  let data = parse(await res.text());
  if (data && !Array.isArray(data) && data.snapshot_id) data = await poll(data.snapshot_id, until);
  const flights = normalize(data);
  if (!flights.length) console.warn("brightdata: no flights parsed from", JSON.stringify(data).slice(0, 600));
  return flights;
}
