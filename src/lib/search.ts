import { snapshot, trigger } from "./brightdata";
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
const pendingKey = (p: Params) => `pending_${key(p)}`;

/** Cached result for a search, or null. */
export async function hit(p: Params) {
  const r = await redis.get<Result>(key(p));
  return r ? { ...r, cached: true, routeId: await upsertRoute(p) } : null;
}

/** Start a live lookup (bounded by DAILY_SEARCH_CAP). Reuses an in-flight lookup for the same search. */
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

/** Result when the lookup has finished (cached + price logged), or null while it is still running. */
export async function finish(p: Params, id: string) {
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

  const result: Result = { flights: snap.flights, fetchedAt: Date.now() };
  const routeId = await upsertRoute(p);
  if (snap.flights.length) {
    await redis.set(key(p), result, { ex: TTL });
    const best = snap.flights.reduce((a, b) => (b.price < a.price ? b : a));
    await sql`INSERT INTO price_history (route_id, price, stops, airline)
              VALUES (${routeId}, ${best.price}, ${best.stops}, ${best.airline})`;
  }
  return { ...result, cached: false, routeId };
}

/** Start several lookups and wait for them (used by the scheduled refresh). Entries are null if they failed or timed out. */
export async function refreshBlocking(ps: Params[], ms = 50_000) {
  const out: (Awaited<ReturnType<typeof finish>>)[] = ps.map(() => null);
  const ids = await Promise.all(ps.map((p) => start(p).catch((e) => (console.error("start failed", e), null))));
  const until = Date.now() + ms;
  while (Date.now() < until && ids.some((id, i) => id && !out[i])) {
    await new Promise((r) => setTimeout(r, 4000));
    await Promise.all(
      ids.map(async (id, i) => {
        if (!id || out[i]) return;
        try {
          out[i] = await finish(ps[i], id);
        } catch (e) {
          console.error("finish failed", e);
          ids[i] = null;
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
