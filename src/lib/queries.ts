import { sql } from "./db";
import type { Params } from "./links";
import type { Pt } from "./deals";

export async function upsertRoute(p: Pick<Params, "o" | "d" | "dep" | "ret">) {
  const r = await sql`
    INSERT INTO routes (origin, destination, depart_date, return_date)
    VALUES (${p.o}, ${p.d}, ${p.dep}, ${p.ret})
    ON CONFLICT (origin, destination, depart_date, return_date) DO UPDATE SET origin = EXCLUDED.origin
    RETURNING id`;
  return r[0].id as number;
}

/** 30-day price observations for a route, oldest first. */
export async function history(routeId: number): Promise<Pt[]> {
  const rows = await sql`
    SELECT price::float8 AS price, EXTRACT(EPOCH FROM timestamp) * 1000 AS ts
    FROM price_history
    WHERE route_id = ${routeId} AND timestamp > now() - interval '30 days'
    ORDER BY timestamp`;
  return rows.map((r) => ({ price: Number(r.price), ts: Number(r.ts) }));
}

/** Routes whose latest price (last 24h) is <= 90% of their 30-day average. */
export async function topDeals(limit = 5) {
  return sql`
    SELECT r.origin, r.destination, r.depart_date::text AS dep, r.return_date AS ret,
           l.price::float8 AS price, a.avg30::float8 AS avg30,
           (a.avg30 - l.price)::float8 AS saving, l.ts
    FROM routes r
    JOIN LATERAL (SELECT price, timestamp AS ts FROM price_history WHERE route_id = r.id ORDER BY timestamp DESC LIMIT 1) l ON true
    JOIN LATERAL (SELECT AVG(price) AS avg30, COUNT(*) AS n FROM price_history
                  WHERE route_id = r.id AND timestamp > now() - interval '30 days') a ON true
    WHERE l.ts > now() - interval '24 hours' AND a.n >= 3 AND l.price <= 0.9 * a.avg30 AND r.depart_date >= current_date
    ORDER BY saving DESC LIMIT ${limit}`;
}
