"use client";

import { money, useCurrency } from "@/lib/money";

/** A USD amount shown in the visitor's display currency (used by server-rendered pages). */
export default function Price({ usd }: { usd: number }) {
  useCurrency();
  return <>{money(usd)}</>;
}
