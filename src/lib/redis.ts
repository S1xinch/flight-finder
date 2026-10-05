import { Redis } from "@upstash/redis";

// Works with plain Upstash vars and with the names the Vercel Marketplace integration injects (KV_REST_API_*).
export const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL ?? process.env.KV_REST_API_URL ?? "",
  token: process.env.UPSTASH_REDIS_REST_TOKEN ?? process.env.KV_REST_API_TOKEN ?? "",
});
