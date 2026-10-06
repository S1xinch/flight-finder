import { sql } from "@/lib/db";
import { json } from "@/lib/http";
import { sendMail } from "@/lib/mail";
import { refreshBlocking } from "@/lib/search";

export const maxDuration = 60;
const PER_RUN = 3; // each route is one live lookup (~1 Bright Data call); keeps a run inside maxDuration and the free quota

/** Scheduled by GitHub Actions. Refreshes the stalest watched routes, then emails due alerts. */
export async function GET(req: Request) {
  if (!process.env.CRON_SECRET || req.headers.get("authorization") !== `Bearer ${process.env.CRON_SECRET}`)
    return json({ error: "unauthorized" }, 401);

  // ponytail: the route is refreshed with the passengers/cabin of one of its alerts; per-alert pricing would need a route per variant.
  const routes = await sql`
    SELECT * FROM (
      SELECT DISTINCT ON (a.route_id) a.route_id, r.origin AS o, r.destination AS d, r.depart_date::text AS dep,
             r.return_date AS ret, a.passengers AS pax, a.cabin,
             (SELECT max(timestamp) FROM price_history h WHERE h.route_id = a.route_id) AS last_ts
      FROM price_alerts a JOIN routes r ON r.id = a.route_id
      WHERE a.alert_status = 'active' AND r.depart_date >= current_date
      ORDER BY a.route_id) t
    WHERE last_ts IS NULL OR last_ts < now() - interval '3 hours'
    ORDER BY last_ts NULLS FIRST LIMIT ${PER_RUN}`;

  const results = await refreshBlocking(routes.map((r) => ({ o: r.o, d: r.d, dep: r.dep, ret: r.ret, pax: r.pax, cabin: r.cabin })));

  let refreshed = 0;
  let emailed = 0;
  for (const [i, r] of routes.entries()) {
    const res = results[i];
    if (!res?.flights.length) continue;
    refreshed++;
    const min = Math.min(...res.flights.map((f) => f.price));
    const alerts = await sql`
      SELECT a.id, a.price_threshold::float8 AS threshold, a.frequency, a.last_price::float8 AS last_price,
             a.last_notified_at, u.email
      FROM price_alerts a JOIN users u ON u.id = a.user_id
      WHERE a.route_id = ${r.route_id} AND a.alert_status = 'active' AND u.email_alerts`;
    for (const a of alerts) {
      if (min > a.threshold) continue;
      const stale = !a.last_notified_at || Date.now() - new Date(a.last_notified_at).getTime() > 864e5;
      if (a.frequency === "daily" ? !stale : a.last_price === min) continue;
      await sendMail(
        a.email,
        `Price drop: ${r.o} to ${r.d} now $${min}`,
        `The lowest fare for ${r.o} to ${r.d} on ${r.dep} is now $${min} (your alert level was $${a.threshold.toFixed(0)}).\n\nSee it: ${process.env.APP_URL}/results?o=${r.o}&d=${r.d}&dep=${r.dep}${r.ret ? `&ret=${r.ret}` : ""}&pax=${r.pax}&cabin=${r.cabin}\n\nManage alerts: ${process.env.APP_URL}/dashboard`,
      );
      await sql`UPDATE price_alerts SET last_price = ${min}, last_notified_at = now() WHERE id = ${a.id}`;
      emailed++;
    }
  }
  return json({ refreshed, emailed });
}
