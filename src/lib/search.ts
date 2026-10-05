import { fetchFlights } from "./brightdata";
import { sql } from "./db";
import { dealInfo } from "./deals";
import type { Params } from "./links";
import type { Flight } from "./normalize";
import { history, upsertRoute } from "./queries";
import { redis } from "./redis";

export type Result = { flights: Flight[]; fetchedAt: number };

const TTL = 3600; // 1 hour, per plan
// Plan key is flights_[origin]_[destination]_[date]_[passengers]; return date and cabin added so they can't collide.
const key = (p: Params) => `flights_${p.o}_${p.d}_${p.dep}_${p.pax}_${p.ret || "ow"}_${p.cabin}`;

/** Cached search. Cache miss spends one live lookup, bounded by DAILY_SEARCH_CAP. */
export async function search(p: Params, fresh = false) {
  if (!fresh) {
    const hit = await redis.get<Result>(key(p));
    if (hit) return { ...hit, cached: true, routeId: await upsertRoute(p) };
  }
  const day = `quota:${new Date().toISOString().slice(0, 10)}`;
  const used = await redis.incr(day);
  if (used === 1) await redis.expire(day, 172800);
  if (used > Number(process.env.DAILY_SEARCH_CAP ?? 100)) throw new Error("Daily live-search limit reached. Try again tomorrow.");

  const flights = await fetchFlights(p);
  const result: Result = { flights, fetchedAt: Date.now() };
  const routeId = await upsertRoute(p);
  if (flights.length) {
    await redis.set(key(p), result, { ex: TTL });
    const best = flights.reduce((a, b) => (b.price < a.price ? b : a));
    await sql`INSERT INTO price_history (route_id, price, stops, airline)
              VALUES (${routeId}, ${best.price}, ${best.stops}, ${best.airline})`;
  }
  return { ...result, cached: false, routeId };
}

/** Deal stats for the cheapest fare in a result. */
export async function dealFor(routeId: number, flights: Flight[]) {
  const hist = await history(routeId);
  const min = flights.length ? Math.min(...flights.map((f) => f.price)) : 0;
  return { hist, deal: dealInfo(min, hist) };
}
