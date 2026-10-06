import { json, limit } from "@/lib/http";
import { redis } from "@/lib/redis";

type Rates = { date: string; rates: Record<string, number> };

/** USD exchange rates from the European Central Bank via Frankfurter (free, no key). ECB publishes once per working day. */
export async function GET(req: Request) {
  const rl = await limit(req, "rates", 30);
  if (rl) return rl;
  const hit = await redis.get<Rates>("fx_usd");
  if (hit) return json(hit);
  try {
    const res = await fetch("https://api.frankfurter.dev/v1/latest?base=USD", { signal: AbortSignal.timeout(8000) });
    if (!res.ok) throw new Error(`Frankfurter ${res.status}`);
    const j = await res.json();
    if (typeof j.date !== "string" || typeof j.rates !== "object") throw new Error("Unexpected rates response");
    const out: Rates = { date: j.date, rates: j.rates };
    await redis.set("fx_usd", out, { ex: 6 * 3600 });
    return json(out);
  } catch (e) {
    console.error("rates failed", e);
    return json({ error: "Exchange rates are unavailable right now." }, 502);
  }
}
