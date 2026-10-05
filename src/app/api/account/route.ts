import { clearSession, userId } from "@/lib/auth";
import { dec } from "@/lib/crypto";
import { sql } from "@/lib/db";
import { json } from "@/lib/http";

/** GDPR export: everything stored about the signed-in user. */
export async function GET(req: Request) {
  const uid = await userId();
  if (!uid) return json({ error: "Sign in required" }, 401);
  const [user] = await sql`SELECT email, email_verified, email_alerts, created_at FROM users WHERE id = ${uid}`;
  if (!user) return json({ error: "Not found" }, 404);
  if (!new URL(req.url).searchParams.has("export")) return json({ email: user.email, emailAlerts: user.email_alerts });
  const searches = await sql`SELECT origin, destination, departure_date, return_date, passengers, cabin, created_at FROM saved_searches WHERE user_id = ${uid}`;
  const alerts = await sql`
    SELECT r.origin, r.destination, r.depart_date, r.return_date, a.drop_pct, a.price_threshold, a.frequency, a.alert_status, a.created_at
    FROM price_alerts a JOIN routes r ON r.id = a.route_id WHERE a.user_id = ${uid}`;
  const bookings = (await sql`SELECT flight_data, confirmation_number, total_price, booked_at FROM bookings WHERE user_id = ${uid}`).map((r) => ({
    ...JSON.parse(dec(r.flight_data)),
    confirmation: dec(r.confirmation_number),
    total_price: r.total_price,
    booked_at: r.booked_at,
  }));
  return new Response(JSON.stringify({ user, searches, alerts, bookings }, null, 2), {
    headers: { "Content-Type": "application/json", "Content-Disposition": 'attachment; filename="flight-finder-data.json"' },
  });
}

export async function PATCH(req: Request) {
  const uid = await userId();
  if (!uid) return json({ error: "Sign in required" }, 401);
  const b = await req.json().catch(() => ({}));
  await sql`UPDATE users SET email_alerts = ${b.emailAlerts === true}, updated_at = now() WHERE id = ${uid}`;
  return json({ ok: true });
}

/** GDPR erasure: cascades to searches, alerts and bookings. */
export async function DELETE() {
  const uid = await userId();
  if (!uid) return json({ error: "Sign in required" }, 401);
  await sql`DELETE FROM users WHERE id = ${uid}`;
  await clearSession();
  return json({ ok: true });
}
