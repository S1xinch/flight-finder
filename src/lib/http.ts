import { redis } from "./redis";

export const json = (data: unknown, status = 200) => Response.json(data, { status });

const ip = (req: Request) => req.headers.get("x-forwarded-for")?.split(",")[0].trim() || "local";

/** Fixed-window rate limit per IP + bucket. Returns a 429 Response when exceeded, else null. */
export async function limit(req: Request, bucket: string, max: number, windowSec = 60) {
  const k = `rl:${bucket}:${ip(req)}`;
  const n = await redis.incr(k);
  if (n === 1) await redis.expire(k, windowSec);
  return n > max ? json({ error: "Too many requests. Try again shortly." }, 429) : null;
}
