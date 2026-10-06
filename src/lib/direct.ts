import { fromFli, type FliResult } from "./fromfli";
import type { Params } from "./links";
import type { Flight } from "./normalize";

/** The direct client cannot handle this search (e.g. unknown airport). Not a sign the source is down. */
export class Unsupported extends Error {}

/**
 * Fast path: read Google Flights' public search page with the vendored fli-js client (src/vendor/fli).
 * Typically 1-3 seconds, no credits. Unofficial: it can break or be blocked, so callers fall back to Bright Data.
 * Throws on network, parse or unsupported-airport errors; returns [] when Google has no fares.
 */
export async function searchDirect(p: Params): Promise<Flight[]> {
  const fli = await import("@/vendor/fli");
  const dep = fli.Airport[p.o as keyof typeof fli.Airport];
  const arr = fli.Airport[p.d as keyof typeof fli.Airport];
  if (!dep || !arr) throw new Unsupported(`Airport not supported by direct search: ${!dep ? p.o : p.d}`);

  const seg = (a: typeof dep, b: typeof arr, date: string) =>
    new fli.FlightSegment({ departure_airport: [[[a, 0]]], arrival_airport: [[[b, 0]]], travel_date: date });
  const seat = { economy: fli.SeatType.ECONOMY, premium: fli.SeatType.PREMIUM_ECONOMY, business: fli.SeatType.BUSINESS, first: fli.SeatType.FIRST }[p.cabin];

  const filters = new fli.FlightSearchFilters({
    passenger_info: { adults: p.pax, children: 0, infants_in_seat: 0, infants_on_lap: 0 },
    flight_segments: p.ret ? [seg(dep, arr, p.dep), seg(arr, dep, p.ret)] : [seg(dep, arr, p.dep)],
    trip_type: p.ret ? fli.TripType.ROUND_TRIP : fli.TripType.ONE_WAY,
    seat_type: seat,
    stops: fli.MaxStops.ANY,
    sort_by: fli.SortBy.CHEAPEST,
  });

  const search = new fli.SearchFlights();
  const rows = (await search.search(filters, { currency: "USD", language: "en", country: "US", signal: AbortSignal.timeout(20_000) })) ?? [];
  const flights = fromFli(rows as unknown as (FliResult | FliResult[])[], (r) =>
    search.buildFlightBookingUrl(r as never, { currency: "USD" }),
  );
  return flights.sort((a, b) => a.price - b.price).slice(0, 45);
}
