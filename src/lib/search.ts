import { snapshot, trigger } from "./brightdata";
import { sql } from "./db";
import { dealInfo } from "./deals";
import { searchDirect, Unsupported } from "./direct";
import type { Params } from "./links";
import type { Flight } from "./normalize";
import { history, upsertRoute } from "./queries";
import { redis } from "./redis";

type Source = "direct" | "brightdata";
export type Result = { flights: Flight[]; fetchedAt: number; source?: Source };
type Done = Result & { cached: boolean; routeId: number };

const TTL = 3600; // 1 hour, per plan
// Plan key is flights_[origin]_[destination]_[date]_[passengers]; return date and cabin added so they can't collide.
const key = (p: Params) => `flights_${p.o}_${p.d}_${p.dep}_${p.pax}_${p.ret || "ow"}_${p.cabin}`;
const pendingKey = (p: Params) => `pending_${key(p)}`;

/** Cached result for a search, or null. */
export async function hit(p: Params): Promise<Done | null> {
  const r = await redis.get<Result>(key(p));
  return r ? { ...r, cached: true, routeId: await upsertRoute(p) } : null;
}

/** Cache a finished search and log its cheapest fare to price history. Shared by both data sources. */
async function store(p: Params, flights: Flight[], source: Source): Promise<Done> {
  const result: Result = { flights, fetchedAt: Date.now(), source };
  const routeId = await upsertRoute(p);
  if (flights.length) {
    await redis.set(key(p), result, { ex: TTL });
    const best = flights.reduce((a, b) => (b.price < a.price ? b : a));
    await sql`INSERT INTO price_history (route_id, price, stops, airline)
              VALUES (${routeId}, ${best.price}, ${best.stops}, ${best.airline})`;
  }
  return { ...result, cached: false, routeId };
}

/**
 * Fast path: read Google Flights directly (1-3 s, no credits). Returns the finished search, or null when it is switched
 * off, over its daily cap, paused after repeated failures, or errored; callers then fall back to Bright Data.
 * Kill switch: SEARCH_PROVIDER=brightdata.
 */
export async function direct(p: Params): Promise<Done | null> {
  if ((process.env.SEARCH_PROVIDER ?? "direct-first") === "brightdata") return null;
  if (await redis.get("direct_down")) return null;

  const day = `direct_${new Date().toISOString().slice(0, 10)}`;
  const used = await redis.incr(day);
  if (used === 1) await redis.expire(day, 172800);
  if (used > Number(process.env.DIRECT_DAILY_CAP ?? 600)) return null; // be polite to the source

  let flights: Flight[];
  try {
    flights = await searchDirect(p);
  } catch (e) {
    if (e instanceof Unsupported) return null; // fall back without counting it against the source
    console.error("direct search failed", e instanceof Error ? e.message : e);
    const fails = await redis.incr("direct_fail");
    await redis.expire("direct_fail", 600);
    if (fails >= 3) await redis.set("direct_down", 1, { ex: 600 }); // three failures in a row: pause for 10 minutes
    return null;
  }
  await redis.del("direct_fail");
  return store(p, flights, "direct");
}

/** Start a Bright Data lookup (bounded by DAILY_SEARCH_CAP). Reuses an in-flight lookup for the same search. */
export async function start(p: Params): Promise<string> {
  const pk = pendingKey(p);
  const existing = await redis.get<string>(pk);
  if (existing) return existing;
  const day = `quota:${new Date().toISOString().slice(0, 10)}`;
  const used = await redis.incr(day);
  if (used === 1) await redis.expire(day, 172800);
  if (used > Number(process.env.DAILY_SEARCH_CAP ?? 100)) throw new Error("Daily live-search limit reached. Try again tomorrow.");
  const id = await trigger(p);
  await redis.set(pk, id, { ex: 600 });
  return id;
}

/** Result when the Bright Data lookup has finished (cached + price logged), or null while it is still running. */
export async function finish(p: Params, id: string): Promise<Done | null> {
  const pk = pendingKey(p);
  if ((await redis.get<string>(pk)) !== id) {
    const done = await hit(p); // another poller already finished it
    if (done) return done;
    throw new Error("Unknown or expired search. Start the search again.");
  }
  let snap;
  try {
    snap = await snapshot(id);
  } catch (e) {
    await redis.del(pk);
    throw e;
  }
  if (snap.status !== "ready") return null;
  if (!(await redis.del(pk))) return (await hit(p)) ?? null; // lost the race to another poller
  return store(p, snap.flights, "brightdata");
}

/** Refresh several searches (scheduled alerts): fast path first, Bright Data for any that need it. Entries are null if they failed. */
export async function refreshBlocking(ps: Params[], ms = 50_000) {
  const out: (Done | null)[] = ps.map(() => null);
  const slow: number[] = [];
  for (const [i, p] of ps.entries()) {
    out[i] = await direct(p);
    if (!out[i]) slow.push(i);
  }
  const ids = await Promise.all(slow.map((i) => start(ps[i]).catch((e) => (console.error("start failed", e), null))));
  const until = Date.now() + ms;
  while (Date.now() < until && ids.some((id, n) => id && !out[slow[n]])) {
    await new Promise((r) => setTimeout(r, 4000));
    await Promise.all(
      ids.map(async (id, n) => {
        const i = slow[n];
        if (!id || out[i]) return;
        try {
          out[i] = await finish(ps[i], id);
        } catch (e) {
          console.error("finish failed", e);
          ids[n] = null;
        }
      }),
    );
  }
  return out;
}

/** Deal stats for the cheapest fare in a result. */
export async function dealFor(routeId: number, flights: Flight[]) {
  const hist = await history(routeId);
  const min = flights.length ? Math.min(...flights.map((f) => f.price)) : 0;
  return { hist, deal: dealInfo(min, hist) };
}
