import { userId } from "@/lib/auth";
import { sql } from "@/lib/db";
import { json, limit } from "@/lib/http";
import { parseParams } from "@/lib/links";

const MAX_SAVED = 200;
const str = (v: unknown, max: number) => String(v ?? "").slice(0, max);
const int = (v: unknown, lo: number, hi: number) => Math.min(hi, Math.max(lo, Math.round(Number(v) || 0)));

/**
 * GET /api/saved                  -> all saved flights (dashboard)
 * GET /api/saved?o&d&dep&ret      -> just the ids saved for one route (results page: which Save buttons are on)
 */
export async function GET(req: Request) {
  const uid = await userId();
  if (!uid) return json({ error: "Sign in required" }, 401);
  const q = new URL(req.url).searchParams;
  if (q.get("o")) {
    const rows = await sql`
      SELECT id, flight_id AS "flightId" FROM saved_flights
      WHERE user_id = ${uid} AND origin = ${q.get("o")!.toUpperCase()} AND destination = ${(q.get("d") ?? "").toUpperCase()}
        AND depart_date = ${q.get("dep") ?? ""} AND return_date = ${q.get("ret") ?? ""}`;
    return json(rows);
  }
  return json(
    await sql`
      SELECT id, flight_id AS "flightId", origin, destination, depart_date::text AS dep, return_date AS ret,
             passengers, cabin, flight, saved_price::float8 AS price, currency, created_at
      FROM saved_flights WHERE user_id = ${uid} ORDER BY depart_date, created_at DESC`,
  );
}

/** Save one fare from the results page. The body comes from the browser, so every field is validated and size-limited. */
export async function POST(req: Request) {
  const uid = await userId();
  if (!uid) return json({ error: "Sign in required" }, 401);
  const rl = await limit(req, "saved", 60);
  if (rl) return rl;
  const b = await req.json().catch(() => ({}));
  const p = parseParams((k) => (b[k] == null ? null : String(b[k])));
  if (typeof p === "string") return json({ error: p }, 400);
  const f = b.flight ?? {};
  const price = Number(f.price);
  const id = str(f.id, 300);
  if (!id || !(price > 0 && price < 1e6)) return json({ error: "Invalid flight." }, 400);
  const link = str(f.bookingUrl, 8000);

  const flight = {
    airline: str(f.airline, 100),
    flightNumber: str(f.flightNumber, 80),
    departure: str(f.departure, 20),
    arrival: str(f.arrival, 20),
    durationMin: int(f.durationMin, 0, 5000),
    stops: int(f.stops, 0, 9),
    emissionsKg: int(f.emissionsKg, 0, 100000),
    aircraft: str(f.aircraft, 100),
    bookingProvider: str(f.bookingProvider, 60),
    bookingUrl: link.startsWith("https://") ? link : "", // only https links are ever rendered as a button
  };

  const count = (await sql`SELECT count(*)::int AS n FROM saved_flights WHERE user_id = ${uid}`)[0].n;
  if (count >= MAX_SAVED) return json({ error: `You can save up to ${MAX_SAVED} flights.` }, 400);

  const cur = /^[A-Z]{3}$/.test(str(f.currency, 3)) ? str(f.currency, 3) : "USD";
  const rows = await sql`
    INSERT INTO saved_flights (user_id, flight_id, origin, destination, depart_date, return_date, passengers, cabin, flight, saved_price, currency)
    VALUES (${uid}, ${id}, ${p.o}, ${p.d}, ${p.dep}, ${p.ret}, ${p.pax}, ${p.cabin}, ${JSON.stringify(flight)}::jsonb, ${price}, ${cur})
    ON CONFLICT (user_id, flight_id, origin, destination, depart_date, return_date) DO UPDATE SET saved_price = saved_flights.saved_price
    RETURNING id`;
  return json({ ok: true, id: rows[0].id });
}

export async function DELETE(req: Request) {
  const uid = await userId();
  if (!uid) return json({ error: "Sign in required" }, 401);
  await sql`DELETE FROM saved_flights WHERE id = ${Number(new URL(req.url).searchParams.get("id"))} AND user_id = ${uid}`;
  return json({ ok: true });
}
