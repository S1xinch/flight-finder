import type { Flight, Leg, Segment } from "./normalize";

/** The parts of a fli-js FlightResult this app reads (kept structural so this file has no dependency on the vendored library). */
type FliLeg = {
  airline: string;
  flight_number: string;
  departure_airport: string;
  arrival_airport: string;
  departure_datetime: Date | string;
  arrival_datetime: Date | string;
  duration: number;
  aircraft?: string | null;
  legroom_short?: string | null;
  amenities?: { wifi?: boolean | null; wifi_tier?: string | null; power?: boolean | null; usb_power?: boolean | null } | null;
  co2_emissions_g?: number | null;
};
export type FliResult = {
  legs: FliLeg[];
  price: number;
  currency?: string | null;
  duration: number;
  stops: number;
  co2_emissions_g?: number | null;
  primary_airline?: string | null;
  primary_airline_name?: string | null;
};

// fli returns local wall-clock times encoded as UTC, so the clock part is already the airport's local time.
const iso = (d: Date | string) => (d instanceof Date ? d.toISOString() : String(d));
const hhmm = (d: Date | string) => iso(d).slice(11, 16);
const ymd = (d: Date | string) => iso(d).slice(0, 10);
const kg = (g?: number | null) => Math.round((g ?? 0) / 1000);
const uniq = (a: string[]) => [...new Set(a.filter(Boolean))];

const airlineOf = (s: FliResult) => {
  const primary = s.primary_airline_name || s.legs[0]?.airline || "Unknown";
  const others = uniq(s.legs.map((l) => l.airline).filter((c) => c !== s.primary_airline));
  return others.length && s.primary_airline ? `${primary} + ${others.join(", ")}` : primary;
};

function toLeg(s: FliResult, i: number): Leg {
  const first = s.legs[0];
  const last = s.legs[s.legs.length - 1];
  const segments: Segment[] = s.legs.map((l) => ({
    airline: l.airline === s.primary_airline && s.primary_airline_name ? s.primary_airline_name : l.airline,
    flightNumber: `${l.airline} ${l.flight_number}`,
    aircraft: l.aircraft ?? "",
    from: l.departure_airport,
    to: l.arrival_airport,
    depart: hhmm(l.departure_datetime),
    arrive: hhmm(l.arrival_datetime),
    durationMin: l.duration,
  }));
  return {
    title: i === 0 ? "Outbound" : "Return",
    date: ymd(first.departure_datetime),
    stops: s.stops,
    from: first.departure_airport,
    to: last.arrival_airport,
    depart: hhmm(first.departure_datetime),
    arrive: hhmm(last.arrival_datetime),
    durationMin: s.duration,
    emissionsKg: kg(s.co2_emissions_g ?? s.legs.reduce((a, l) => a + (l.co2_emissions_g ?? 0), 0)),
    segments,
  };
}

/**
 * fli results -> flights. A one-way row is a FlightResult; a round-trip row is [outbound, return] where the return
 * carries the total price. Rows without a usable price or legs are skipped.
 */
export function fromFli(rows: (FliResult | FliResult[])[], bookingUrl: (row: FliResult | FliResult[]) => string): Flight[] {
  const out: Flight[] = [];
  const seen = new Set<string>();
  for (const row of rows) {
    const sides = Array.isArray(row) ? row : [row];
    const outbound = sides[0];
    const total = sides[sides.length - 1]?.price;
    if (!outbound?.legs?.length || !(total > 0)) continue;
    const id = sides.flatMap((s) => s.legs.map((l) => `${l.airline}${l.flight_number}@${iso(l.departure_datetime).slice(0, 16)}`)).join("_");
    if (seen.has(id)) continue;
    seen.add(id);
    const first = outbound.legs[0];
    const w = first.amenities;
    let url = "";
    try {
      url = bookingUrl(row);
    } catch {}
    out.push({
      id,
      airline: uniq(sides.map(airlineOf)).join(", "),
      flightNumber: outbound.legs.map((l) => `${l.airline} ${l.flight_number}`).join(", "),
      departure: hhmm(first.departure_datetime),
      arrival: hhmm(outbound.legs[outbound.legs.length - 1].arrival_datetime),
      durationMin: outbound.duration,
      stops: outbound.stops,
      price: total,
      currency: sides[sides.length - 1].currency || "USD",
      legs: sides.map(toLeg),
      aircraft: uniq(outbound.legs.map((l) => l.aircraft ?? "")).join(", "),
      emissionsKg: sides.reduce((a, s) => a + toLeg(s, 0).emissionsKg, 0),
      amenities: uniq([
        first.legroom_short ? `Legroom ${first.legroom_short}` : "",
        w?.wifi ? (w.wifi_tier === "free" ? "Free Wi-Fi" : "Wi-Fi") : "",
        w?.power ? "In-seat power" : "",
        w?.usb_power ? "USB outlets" : "",
      ]),
      bookingUrl: url.startsWith("https://") ? url : "",
      bookingProvider: "Google Flights",
      typicalLow: 0,
      typicalHigh: 0,
    });
  }
  return out;
}
