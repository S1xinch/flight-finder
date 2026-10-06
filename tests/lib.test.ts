import assert from "node:assert/strict";
import { test } from "node:test";
import { searchAirports, toAirport, type AirportRow } from "../src/lib/airports.ts";
import { dealInfo } from "../src/lib/deals.ts";
import { parseParams } from "../src/lib/links.ts";
import { hourOf, normalize } from "../src/lib/normalize.ts";

// Trimmed from a real Bright Data "Google Flights discover" row (JFK -> LAX, one way).
const row = {
  itinerary_id: "ABC",
  pricing: { best_total_price: 294, currency: "USD", typical_range_low: 205, typical_range_high: 710 },
  providers: [
    { provider_name: "Delta", provider_type: "Airline", primary_price: 349, link: "https://www.google.com/travel/clk/f?u=b" },
    { provider_name: "Delta", provider_type: "Airline", primary_price: 294, link: "https://www.google.com/travel/clk/f?u=a" },
  ],
  legs: [
    {
      leg_title: "Departing flight  Thu, Dec 17",
      date: "2026-12-17T00:00:00.000Z",
      emissions_text: "244 kg CO2e",
      amenity_badges: ["Free Wi-Fi"],
      stops: "0",
      origin_airport: "JFK",
      destination_airport: "LAX",
      depart_local: "7",
      arrive_local: "10:15",
      segments: [
        {
          airline_name: "Delta", marketing_code: "DL", flight_number: "742", aircraft_name: "Boeing 767",
          depart_time: "7", depart_airport_iata: "JFK", arrive_time: "10:15", arrive_airport_iata: "LAX",
          segment_travel_time_text: "Travel time: 6 hr 15 min", layover_after: null,
        },
      ],
    },
  ],
};

test("normalize reads a Bright Data itinerary row", () => {
  const [f] = normalize([row]);
  assert.equal(f.price, 294);
  assert.equal(f.currency, "USD");
  assert.equal(f.airline, "Delta");
  assert.equal(f.flightNumber, "DL 742");
  assert.equal(f.departure, "7:00");
  assert.equal(f.arrival, "10:15");
  assert.equal(f.durationMin, 375);
  assert.equal(f.stops, 0);
  assert.equal(f.emissionsKg, 244);
  assert.equal(f.aircraft, "Boeing 767");
  assert.equal(f.typicalHigh, 710);
  assert.equal(f.bookingProvider, "Delta");
  assert.equal(f.bookingUrl, "https://www.google.com/travel/clk/f?u=a"); // cheapest provider
});

test("normalize skips error rows and rejects non-https booking links", () => {
  assert.equal(normalize([{ error: "Parse error", error_code: "parse_error" }, { nope: 1 }]).length, 0);
  const bad = { ...row, providers: [{ provider_name: "X", primary_price: 100, link: "javascript:alert(1)" }] };
  assert.equal(normalize([bad])[0].bookingUrl, "");
  assert.equal(hourOf("2026-12-01T18:05:00"), 18);
  assert.equal(hourOf("7:05 PM"), 19);
});

test("searchAirports matches city, name, code and metro, main airport first", () => {
  const list = (
    [
      ["EWR", "Newark Liberty International Airport", "Newark", "US", 2],
      ["LGA", "LaGuardia Airport", "New York", "US", 2],
      ["JFK", "John F. Kennedy International Airport", "New York", "US", 2],
      ["LHR", "London Heathrow Airport", "London", "GB", 2],
      ["ZRH", "Zürich Airport", "Zürich", "CH", 2],
    ] as AirportRow[]
  ).map(toAirport);
  const codes = (q: string) => searchAirports(list, q).map((a) => a.code);
  assert.deepEqual(codes("new york"), ["JFK", "EWR", "LGA"]); // JFK first; EWR found through the metro name
  assert.deepEqual(codes("nyc"), ["JFK", "EWR", "LGA"]);
  assert.equal(codes("heathrow")[0], "LHR");
  assert.equal(codes("lhr")[0], "LHR");
  assert.equal(codes("zurich")[0], "ZRH"); // accent-insensitive
  assert.equal(codes("switz")[0], "ZRH"); // country name
  assert.deepEqual(codes("j"), []); // needs 2+ characters
});

test("dealInfo flags <=90% of 30d avg, needs 3 samples", () => {
  const now = Date.now();
  const day = 864e5;
  const hist = [100, 100, 100, 100].map((price, i) => ({ price, ts: now - (i + 1) * day }));
  assert.equal(dealInfo(90, hist, now).isDeal, true);
  assert.equal(dealInfo(91, hist, now).isDeal, false);
  assert.equal(dealInfo(110, hist, now).isHigh, true);
  assert.equal(dealInfo(50, hist.slice(0, 2), now).isDeal, false);
  assert.equal(dealInfo(1, [], now).avg30, null);
});

test("parseParams validates", () => {
  const q = (o: Record<string, string>) => parseParams((k) => o[k] ?? null);
  const future = "2999-01-01";
  assert.equal(typeof q({ o: "jfk", d: "lax", dep: future }), "object");
  assert.equal(typeof q({ o: "jfk", d: "jfk", dep: future }), "string");
  assert.equal(typeof q({ o: "jf", d: "lax", dep: future }), "string");
  assert.equal(typeof q({ o: "jfk", d: "lax", dep: future, ret: "2998-01-01" }), "string");
  assert.equal(typeof q({ o: "jfk", d: "lax", dep: future, pax: "12" }), "string");
});
