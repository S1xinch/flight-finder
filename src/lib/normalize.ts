export type Flight = {
  id: string;
  airline: string;
  flightNumber: string;
  departure: string;
  arrival: string;
  durationMin: number;
  stops: number;
  price: number;
  currency: string;
};

const num = (v: unknown) => {
  const n = typeof v === "number" ? v : parseFloat(String(v ?? "").replace(/[^0-9.]/g, ""));
  return Number.isFinite(n) ? n : NaN;
};

/** Hour (0-23) from "08:15" or an ISO datetime; -1 if unparseable. */
export const hourOf = (s: string) => {
  const m = /(\d{1,2}):\d{2}/.exec(s);
  return m ? Number(m[1]) : -1;
};

/** Bright Data Google Flights records -> flat flight list. Skips rows without a usable price. */
export function normalize(raw: unknown): Flight[] {
  const out: Flight[] = [];
  for (const rec of Array.isArray(raw) ? raw : [raw]) {
    const list = (rec as { flights?: unknown })?.flights;
    if (!Array.isArray(list)) continue;
    for (const f of list) {
      const price = num(f.price);
      if (!(price > 0)) continue;
      const flightNumber = String(f.flight_number ?? "");
      const departure = String(f.departure_time ?? "");
      out.push({
        id: `${flightNumber}-${departure}-${out.length}`,
        airline: String(f.airline ?? "Unknown"),
        flightNumber,
        departure,
        arrival: String(f.arrival_time ?? ""),
        durationMin: num(f.duration_minutes) || 0,
        stops: num(f.stops) || 0,
        price,
        currency: String(f.currency ?? "USD"),
      });
    }
  }
  return out;
}
