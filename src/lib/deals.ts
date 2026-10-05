export type Pt = { price: number; ts: number };

const DAY = 864e5;
const avg = (a: Pt[]) => (a.length ? a.reduce((s, p) => s + p.price, 0) / a.length : null);

/**
 * Deal = current price <= 90% of the 30-day average (needs >= 3 samples).
 * High = >= 110% of it. dealCount = samples in the window that would have qualified.
 */
export function dealInfo(current: number, hist: Pt[], now = Date.now()) {
  const h30 = hist.filter((p) => p.ts >= now - 30 * DAY);
  const avg7 = avg(hist.filter((p) => p.ts >= now - 7 * DAY));
  const avg30 = avg(h30);
  const enough = avg30 !== null && h30.length >= 3;
  const sorted = [...hist].sort((a, b) => a.ts - b.ts);
  let lastChange: number | null = null;
  for (let i = 1; i < sorted.length; i++) if (sorted[i].price !== sorted[i - 1].price) lastChange = sorted[i].ts;
  return {
    avg7,
    avg30,
    samples: h30.length,
    isDeal: enough && current * 10 <= 9 * avg30!,
    isHigh: enough && current * 10 >= 11 * avg30!,
    dealCount: enough ? h30.filter((p) => p.price * 10 <= 9 * avg30!).length : 0,
    lastChange,
  };
}
export type DealInfo = ReturnType<typeof dealInfo>;
