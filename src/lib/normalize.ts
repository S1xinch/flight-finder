export type Segment = {
  airline: string;
  flightNumber: string;
  aircraft: string;
  from: string;
  to: string;
  depart: string;
  arrive: string;
  durationMin: number;
};
export type Leg = {
  title: string;
  date: string;
  stops: number;
  from: string;
  to: string;
  depart: string;
  arrive: string;
  durationMin: number;
  emissionsKg: number;
  segments: Segment[];
};
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
  legs: Leg[];
  aircraft: string;
  emissionsKg: number;
  amenities: string[];
  bookingUrl: string;
  bookingProvider: string;
  typicalLow: number;
  typicalHigh: number;
};

const num = (v: unknown) => {
  const n = typeof v === "number" ? v : parseFloat(String(v ?? "").replace(/[^0-9.]/g, ""));
  return Number.isFinite(n) ? n : 0;
};
const str = (v: unknown) => String(v ?? "").trim();

/** "7" -> "7:00"; "10:15" and "7:05 PM" are kept. */
const clock = (s: unknown) => {
  const m = /^(\d{1,2})(?::(\d{2}))?\s*([ap]m)?/i.exec(str(s));
  return m ? `${m[1]}:${m[2] ?? "00"}${m[3] ? ` ${m[3].toUpperCase()}` : ""}` : str(s);
};

/** Hour (0-23) from "08:15", "8:15 PM" or an ISO datetime; -1 if unparseable. Times without AM/PM are read as 24-hour. */
export const hourOf = (s: string) => {
  const m = /(\d{1,2}):\d{2}/.exec(s);
  if (!m) return -1;
  let h = Number(m[1]);
  if (/pm/i.test(s) && h < 12) h += 12;
  if (/am/i.test(s) && h === 12) h = 0;
  return h;
};

/** Minutes from text like "Travel time: 6 hr 15 min" or "45 min". */
const minutes = (v: unknown) => {
  const s = typeof v === "string" ? v : v == null ? "" : JSON.stringify(v);
  const h = /(\d+)\s*h/i.exec(s);
  const m = /(\d+)\s*m/i.exec(s);
  return (h ? Number(h[1]) * 60 : 0) + (m ? Number(m[1]) : 0);
};

const kg = (v: unknown) => num(/([\d,.]+)\s*kg/i.exec(str(v))?.[1]);

/* eslint-disable @typescript-eslint/no-explicit-any */
function toLeg(l: any): Leg {
  const segments: Segment[] = (l?.segments ?? []).map((s: any) => ({
    airline: str(s.airline_name),
    flightNumber: `${str(s.marketing_code)} ${str(s.flight_number)}`.trim(),
    aircraft: str(s.aircraft_name),
    from: str(s.depart_airport_iata),
    to: str(s.arrive_airport_iata),
    depart: clock(s.depart_time),
    arrive: clock(s.arrive_time),
    durationMin: minutes(s.segment_travel_time_text) + minutes(s.layover_after),
  }));
  return {
    title: str(l?.leg_title ?? l?.leg_type_text),
    date: str(l?.date).slice(0, 10),
    stops: num(l?.stops),
    from: str(l?.origin_airport),
    to: str(l?.destination_airport),
    depart: clock(l?.depart_local ?? segments[0]?.depart),
    arrive: clock(l?.arrive_local ?? segments.at(-1)?.arrive),
    durationMin: segments.reduce((a, s) => a + s.durationMin, 0),
    emissionsKg: kg(l?.emissions_text),
    segments,
  };
}

function toFlight(row: any, i: number): Flight | null {
  const providers: any[] = (row?.providers ?? []).filter((p: any) => num(p?.primary_price) > 0);
  const cheapest = providers.reduce((a, b) => (!a || num(b.primary_price) < num(a.primary_price) ? b : a), null);
  const price = num(row?.pricing?.best_total_price) || (cheapest ? num(cheapest.primary_price) : 0);
  const legs: Leg[] = (row?.legs ?? []).map(toLeg);
  if (!(price > 0) || !legs.length) return null;
  const out = legs[0];
  const link = str(cheapest?.link);
  return {
    id: `${str(row.itinerary_id) || i}`,
    airline: [...new Set(legs.flatMap((l) => l.segments.map((s) => s.airline)).filter(Boolean))].join(", ") || "Unknown",
    flightNumber: out.segments.map((s) => s.flightNumber).join(", "),
    departure: out.depart,
    arrival: out.arrive,
    durationMin: out.durationMin,
    stops: out.stops,
    price,
    currency: str(row?.pricing?.currency) || "USD",
    legs,
    aircraft: [...new Set(out.segments.map((s) => s.aircraft).filter(Boolean))].join(", "),
    emissionsKg: legs.reduce((a, l) => a + l.emissionsKg, 0),
    amenities: Array.isArray(row?.legs?.[0]?.amenity_badges) ? row.legs[0].amenity_badges.map(str) : [],
    // Untrusted scraper output: only allow https links.
    bookingUrl: link.startsWith("https://") ? link : "",
    bookingProvider: str(cheapest?.provider_name),
    typicalLow: num(row?.pricing?.typical_range_low),
    typicalHigh: num(row?.pricing?.typical_range_high),
  };
}
/* eslint-enable @typescript-eslint/no-explicit-any */

/** Bright Data Google Flights itinerary rows -> flights. Rows with errors or no price are skipped. */
export function normalize(raw: unknown): Flight[] {
  const out: Flight[] = [];
  for (const row of Array.isArray(raw) ? raw : [raw]) {
    const f = toFlight(row, out.length);
    if (f) out.push(f);
  }
  return out;
}
