import { userId } from "@/lib/auth";
import { sql } from "@/lib/db";
import { json, limit } from "@/lib/http";
import { parseParams, partnerLinks } from "@/lib/links";
import { dealFor, finish, hit, start } from "@/lib/search";

/**
 * GET /api/search?...          -> cached result, or starts a live lookup and returns {pending, snap} (202)
 * GET /api/search?...&snap=ID  -> result when the lookup has finished, else {pending, snap} again
 */
export async function GET(req: Request) {
  const q = new URL(req.url).searchParams;
  const snap = q.get("snap");
  const rl = await limit(req, snap ? "search-poll" : "search", snap ? 60 : 10);
  if (rl) return rl;
  const p = parseParams((k) => q.get(k));
  if (typeof p === "string") return json({ error: p }, 400);

  try {
    const r = snap ? await finish(p, snap) : await hit(p);
    if (!r) return json({ pending: true, snap: snap ?? (await start(p)) }, 202);

    const { hist, deal } = await dealFor(r.routeId, r.flights);
    const uid = await userId();
    if (uid) {
      await sql`
        INSERT INTO saved_searches (user_id, origin, destination, departure_date, return_date, passengers, cabin)
        SELECT ${uid}, ${p.o}, ${p.d}, ${p.dep}, ${p.ret}, ${p.pax}, ${p.cabin}
        WHERE NOT EXISTS (
          SELECT 1 FROM saved_searches WHERE user_id = ${uid} AND origin = ${p.o} AND destination = ${p.d}
            AND departure_date = ${p.dep} AND return_date = ${p.ret} AND created_at > now() - interval '1 day')`;
    }
    return json({ ...r, deal, history: hist, links: partnerLinks(p), params: p });
  } catch (e) {
    console.error("search failed", e);
    const user = e instanceof Error && /^(Daily|Unknown)/.test(e.message);
    return json({ error: user ? (e as Error).message : "The flight source is unavailable. Try again in a minute." }, 502);
  }
}
