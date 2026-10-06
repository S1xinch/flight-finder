import { userId } from "@/lib/auth";
import { flightCode, normalizeStatus, pickFlight, type FlightStatus } from "@/lib/flightstatus";
import { json, limit } from "@/lib/http";
import { redis } from "@/lib/redis";

type Cached = { found: false } | { found: true; status: FlightStatus };

/**
 * GET /api/status?flight=DL%20742&date=2026-10-07
 * Live status of one flight from Aviationstack. The free plan allows 100 requests a month, so lookups need sign-in,
 * are cached for 15 minutes, and stop at AVIATIONSTACK_MONTHLY_CAP (default 90, leaving a few for spare).
 */
export async function GET(req: Request) {
  const uid = await userId();
  if (!uid) return json({ error: "Sign in required" }, 401);
  const rl = await limit(req, "status", 10);
  if (rl) return rl;

  const q = new URL(req.url).searchParams;
  const code = flightCode(q.get("flight") ?? "");
  const date = q.get("date") ?? "";
  if (!code || !/^\d{4}-\d{2}-\d{2}$/.test(date)) return json({ error: "Invalid flight or date." }, 400);
  const key = process.env.AVIATIONSTACK_API_KEY;
  if (!key) return json({ error: "Flight status is not set up yet." }, 503);

  const ck = `status_${code}_${date}`;
  const hit = await redis.get<Cached>(ck);
  if (hit) return json({ ...hit, cached: true });

  const month = `avs_${new Date().toISOString().slice(0, 7)}`;
  const used = await redis.incr(month);
  if (used === 1) await redis.expire(month, 40 * 86400);
  if (used > Number(process.env.AVIATIONSTACK_MONTHLY_CAP ?? 90)) return json({ error: "Flight status checks for this month are used up. They reset on the 1st." }, 429);

  try {
    const url = `https://api.aviationstack.com/v1/flights?access_key=${encodeURIComponent(key)}&flight_iata=${code}&limit=10`;
    const res = await fetch(url, { signal: AbortSignal.timeout(10_000) });
    const body = await res.json();
    if (!res.ok || body.error) throw new Error(`Aviationstack ${res.status}: ${JSON.stringify(body.error ?? {}).slice(0, 200)}`);
    const row = pickFlight(body.data, date);
    const out: Cached = row ? { found: true, status: normalizeStatus(row) } : { found: false };
    await redis.set(ck, out, { ex: 900 });
    return json({ ...out, cached: false });
  } catch (e) {
    console.error("status failed", e);
    return json({ error: "Flight status is unavailable right now. Try again later." }, 502);
  }
}
