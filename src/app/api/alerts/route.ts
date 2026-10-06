import { userId } from "@/lib/auth";
import { sql } from "@/lib/db";
import { json, limit } from "@/lib/http";
import { parseParams } from "@/lib/links";
import { upsertRoute } from "@/lib/queries";
import { hit } from "@/lib/search";

const FREQ = ["daily", "on_change"];

export async function GET() {
  const uid = await userId();
  if (!uid) return json({ error: "Sign in required" }, 401);
  const rows = await sql`
    SELECT a.id, r.origin, r.destination, r.depart_date::text AS dep, r.return_date AS ret, a.passengers, a.cabin,
           a.drop_pct, a.price_threshold::float8 AS threshold, a.frequency, a.alert_status AS status,
           (SELECT price::float8 FROM price_history WHERE route_id = a.route_id ORDER BY timestamp DESC LIMIT 1) AS current_price,
           (SELECT EXTRACT(EPOCH FROM timestamp) * 1000 FROM price_history WHERE route_id = a.route_id ORDER BY timestamp DESC LIMIT 1) AS updated
    FROM price_alerts a JOIN routes r ON r.id = a.route_id
    WHERE a.user_id = ${uid} ORDER BY a.created_at DESC`;
  return json(rows);
}

export async function POST(req: Request) {
  const uid = await userId();
  if (!uid) return json({ error: "Sign in required" }, 401);
  const rl = await limit(req, "alert-create", 10);
  if (rl) return rl;
  const b = await req.json().catch(() => ({}));
  const p = parseParams((k) => (b[k] == null ? null : String(b[k])));
  if (typeof p === "string") return json({ error: p }, 400);
  const dropPct = Number(b.dropPct ?? 10);
  const frequency = String(b.frequency ?? "daily");
  if (!Number.isInteger(dropPct) || dropPct < 1 || dropPct > 90) return json({ error: "Drop must be 1-90%." }, 400);
  if (!FREQ.includes(frequency)) return json({ error: "Frequency must be daily or on_change." }, 400);
  const count = (await sql`SELECT count(*)::int AS n FROM price_alerts WHERE user_id = ${uid}`)[0].n;
  if (count >= 20) return json({ error: "You can watch up to 20 routes." }, 400);

  // Baseline = the cached fares from the search the user is looking at (no extra live lookup).
  const r = await hit(p);
  if (!r?.flights.length) return json({ error: "Search this route first (results expire after an hour), then set the alert." }, 400);
  const base = Math.min(...r.flights.map((f) => f.price));
  const routeId = await upsertRoute(p);
  await sql`
    INSERT INTO price_alerts (user_id, route_id, passengers, cabin, drop_pct, price_threshold, frequency)
    VALUES (${uid}, ${routeId}, ${p.pax}, ${p.cabin}, ${dropPct}, ${base * (1 - dropPct / 100)}, ${frequency})`;
  return json({ ok: true });
}

export async function PATCH(req: Request) {
  const uid = await userId();
  if (!uid) return json({ error: "Sign in required" }, 401);
  const b = await req.json().catch(() => ({}));
  const status = b.status === undefined ? null : String(b.status);
  const frequency = b.frequency === undefined ? null : String(b.frequency);
  if ((status && !["active", "paused"].includes(status)) || (frequency && !FREQ.includes(frequency)))
    return json({ error: "Invalid value" }, 400);
  await sql`
    UPDATE price_alerts SET alert_status = COALESCE(${status}, alert_status), frequency = COALESCE(${frequency}, frequency)
    WHERE id = ${Number(b.id)} AND user_id = ${uid}`;
  return json({ ok: true });
}

export async function DELETE(req: Request) {
  const uid = await userId();
  if (!uid) return json({ error: "Sign in required" }, 401);
  await sql`DELETE FROM price_alerts WHERE id = ${Number(new URL(req.url).searchParams.get("id"))} AND user_id = ${uid}`;
  return json({ ok: true });
}
