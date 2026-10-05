import { userId } from "@/lib/auth";
import { sql } from "@/lib/db";
import { json, limit } from "@/lib/http";
import { parseParams, partnerLinks } from "@/lib/links";
import { dealFor, search } from "@/lib/search";

export const maxDuration = 60;

export async function GET(req: Request) {
  const rl = await limit(req, "search", 10);
  if (rl) return rl;
  const q = new URL(req.url).searchParams;
  const p = parseParams((k) => q.get(k));
  if (typeof p === "string") return json({ error: p }, 400);

  try {
    const r = await search(p);
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
    const msg = e instanceof Error && e.message.startsWith("Daily") ? e.message : "The flight source is unavailable. Try again in a minute.";
    return json({ error: msg }, 502);
  }
}
