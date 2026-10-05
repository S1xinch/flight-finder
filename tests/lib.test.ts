import assert from "node:assert/strict";
import { test } from "node:test";
import { dealInfo } from "../src/lib/deals.ts";
import { parseParams } from "../src/lib/links.ts";
import { hourOf, normalize } from "../src/lib/normalize.ts";

test("normalize reads Bright Data records and skips unpriced rows", () => {
  const raw = [
    {
      flights: [
        { airline: "Delta", flight_number: "DL 1234", departure_time: "08:15", arrival_time: "11:45", duration_minutes: 330, stops: 0, price: "328.00", currency: "USD" },
        { airline: "X", price: "" },
      ],
    },
  ];
  const f = normalize(raw);
  assert.equal(f.length, 1);
  assert.equal(f[0].price, 328);
  assert.equal(f[0].durationMin, 330);
  assert.equal(normalize({ nope: 1 }).length, 0);
  assert.equal(hourOf("2026-12-01T18:05:00"), 18);
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
