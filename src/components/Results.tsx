"use client";

import dynamic from "next/dynamic";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import type { DealInfo, Pt } from "@/lib/deals";
import { hourOf, type Flight } from "@/lib/normalize";

const PriceChart = dynamic(() => import("./PriceChart"), { ssr: false, loading: () => <p>Loading chart…</p> });

type Data = {
  flights: Flight[];
  fetchedAt: number;
  cached: boolean;
  deal: DealInfo;
  history: Pt[];
  links: { name: string; url: string }[];
  params: { o: string; d: string; dep: string; ret: string; pax: number; cabin: string };
};
type SortKey = "price" | "durationMin" | "departure";

const WINDOWS = ["00:00 – 06:00", "06:00 – 12:00", "12:00 – 18:00", "18:00 – 00:00"];
const money = (n: number, cur = "USD") =>
  new Intl.NumberFormat("en-US", { style: "currency", currency: cur, maximumFractionDigits: 0 }).format(n);
const dur = (m: number) => (m ? `${Math.floor(m / 60)}h ${m % 60}m` : "n/a");
const ago = (ms: number) => {
  const m = Math.max(0, Math.round(ms / 60000));
  return m < 1 ? "just now" : m < 60 ? `${m} minute${m > 1 ? "s" : ""} ago` : `${Math.round(m / 60)} hour${m >= 90 ? "s" : ""} ago`;
};

export default function Results({ params }: { params: Record<string, string> }) {
  const [data, setData] = useState<Data | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [now, setNow] = useState(0);

  const [direct, setDirect] = useState(false);
  const [stops, setStops] = useState([true, true, true]); // non-stop, 1 stop, 2+
  const [skip, setSkip] = useState<Set<string>>(new Set());
  const [windows, setWindows] = useState([true, true, true, true]);
  const [maxHours, setMaxHours] = useState("");
  const [minPrice, setMinPrice] = useState("");
  const [maxPrice, setMaxPrice] = useState(0);
  const [sort, setSort] = useState<{ key: SortKey; dir: 1 | -1 }>({ key: "price", dir: 1 });
  const [open, setOpen] = useState<string | null>(null);

  useEffect(() => {
    setNow(Date.now());
    const i = setInterval(() => setNow(Date.now()), 60000);
    return () => clearInterval(i);
  }, []);

  const qs = new URLSearchParams(params).toString();
  useEffect(() => {
    if (!params.o) return;
    const ctl = new AbortController();
    setLoading(true);
    setError("");
    setData(null);
    fetch(`/api/search?${qs}`, { signal: ctl.signal })
      .then(async (r) => {
        const j = await r.json();
        if (!r.ok) throw new Error(j.error ?? "Search failed.");
        setData(j);
        setMaxPrice(Math.ceil(Math.max(0, ...j.flights.map((f: Flight) => f.price))));
        setSkip(new Set());
      })
      .catch((e) => e.name !== "AbortError" && setError(e.message))
      .finally(() => !ctl.signal.aborted && setLoading(false));
    return () => ctl.abort();
  }, [qs]); // eslint-disable-line react-hooks/exhaustive-deps

  const airlines = useMemo(() => [...new Set(data?.flights.map((f) => f.airline))].sort(), [data]);
  const ceiling = useMemo(() => Math.ceil(Math.max(0, ...(data?.flights.map((f) => f.price) ?? []))), [data]);

  const rows = useMemo(() => {
    if (!data) return [];
    const hrs = Number(maxHours);
    return data.flights
      .filter((f) => (direct ? f.stops === 0 : stops[Math.min(f.stops, 2)]))
      .filter((f) => !skip.has(f.airline))
      .filter((f) => {
        const h = hourOf(f.departure);
        return h < 0 || windows[Math.floor(h / 6)];
      })
      .filter((f) => !hrs || !f.durationMin || f.durationMin <= hrs * 60)
      .filter((f) => f.price >= (Number(minPrice) || 0) && f.price <= maxPrice)
      .sort((a, b) => {
        const x = sort.key === "departure" ? a.departure.localeCompare(b.departure) : a[sort.key] - b[sort.key];
        return x * sort.dir || a.price - b.price;
      });
  }, [data, direct, stops, skip, windows, maxHours, minPrice, maxPrice, sort]);

  if (!params.o) return <p>Enter a search above to see fares.</p>;
  if (loading) return <p role="status">Searching live fares. This can take up to a minute the first time; repeat searches are instant for an hour.</p>;
  if (error) return <p role="alert" className="err">{error}</p>;
  if (!data) return null;
  if (!data.flights.length) return <p role="status">No fares were returned for this search. Try other dates or airports.</p>;

  const { deal, params: p } = data;
  const toggleSort = (key: SortKey) => setSort((s) => (s.key === key ? { key, dir: (-s.dir) as 1 | -1 } : { key, dir: 1 }));
  const ariaSort = (key: SortKey) => (sort.key === key ? (sort.dir === 1 ? "ascending" : "descending") : "none");
  const SortBtn = ({ k, children }: { k: SortKey; children: React.ReactNode }) => (
    <button type="button" onClick={() => toggleSort(k)} className="font-bold underline">
      {children}
      {sort.key === k ? (sort.dir === 1 ? " ▲" : " ▼") : ""}
    </button>
  );

  return (
    <div className="grid gap-6">
      <section className="card grid gap-3" aria-labelledby="summary">
        <h2 id="summary">{p.o} to {p.d}, {p.dep}{p.ret ? ` – ${p.ret}` : ""}</h2>
        <p>
          Updated {now ? ago(now - data.fetchedAt) : "…"}
          {data.cached ? " (cached results are refreshed hourly)" : ""}. Lowest fare {money(Math.min(...data.flights.map((f) => f.price)), data.flights[0].currency)}.
        </p>
        <p className="flex flex-wrap items-center gap-3">
          {deal.isDeal && <span className="badge badge-deal">Hot Deal</span>}
          {deal.isHigh && <span className="badge badge-high">High Price</span>}
          {deal.samples >= 3 && deal.avg30 !== null ? (
            <span>
              30-day average {money(deal.avg30)}
              {deal.avg7 !== null && <>, 7-day average {money(deal.avg7)}</>}.{" "}
              {deal.dealCount} of {deal.samples} observations in 30 days were deals.
              {deal.lastChange && <> Price last changed {new Date(deal.lastChange).toLocaleString()}.</>}
            </span>
          ) : (
            <span>Not enough price history yet to rate this fare ({deal.samples} observation{deal.samples === 1 ? "" : "s"}; 3 needed).</span>
          )}
        </p>
        <p className="flex flex-wrap gap-4">
          <span>Compare on:</span>
          {data.links.map((l) => (
            <a key={l.name} href={l.url} target="_blank" rel="noopener noreferrer">{l.name}</a>
          ))}
        </p>
      </section>

      <section className="card" aria-labelledby="hist">
        <h2 id="hist" className="mb-2">30-day price history</h2>
        {data.history.length >= 2 ? <PriceChart data={data.history} /> : <p>History builds each time this route is searched or watched.</p>}
      </section>

      <Watch params={p} />

      <div className="grid gap-6 lg:grid-cols-[260px_1fr]">
        <aside aria-label="Filters" className="card grid h-fit gap-3">
          <h2 className="text-lg">Filters</h2>
          <details open>
            <summary className="cursor-pointer font-bold">Stops</summary>
            <label className="mt-2 flex items-center gap-2 font-normal">
              <input type="checkbox" checked={direct} onChange={(e) => setDirect(e.target.checked)} /> Direct flights only
            </label>
            {["Non-stop", "1 stop", "2+ stops"].map((t, i) => (
              <label key={t} className="flex items-center gap-2 font-normal">
                <input type="checkbox" disabled={direct} checked={direct ? i === 0 : stops[i]} onChange={() => setStops(stops.map((s, j) => (j === i ? !s : s)))} /> {t}
              </label>
            ))}
          </details>
          <details open>
            <summary className="cursor-pointer font-bold">Departure time</summary>
            {WINDOWS.map((t, i) => (
              <label key={t} className="flex items-center gap-2 font-normal">
                <input type="checkbox" checked={windows[i]} onChange={() => setWindows(windows.map((s, j) => (j === i ? !s : s)))} /> {t}
              </label>
            ))}
          </details>
          <details open>
            <summary className="cursor-pointer font-bold">Airlines</summary>
            {airlines.map((a) => (
              <label key={a} className="flex items-center gap-2 font-normal">
                <input type="checkbox" checked={!skip.has(a)} onChange={() => setSkip((s) => { const n = new Set(s); n.has(a) ? n.delete(a) : n.add(a); return n; })} /> {a}
              </label>
            ))}
          </details>
          <details open>
            <summary className="cursor-pointer font-bold">Duration and price</summary>
            <label htmlFor="mh" className="mt-2">Max duration (hours)</label>
            <input id="mh" type="number" min={1} className="input" value={maxHours} onChange={(e) => setMaxHours(e.target.value)} />
            <label htmlFor="mn" className="mt-2">Min price</label>
            <input id="mn" type="number" min={0} className="input" value={minPrice} onChange={(e) => setMinPrice(e.target.value)} />
            <label htmlFor="mx" className="mt-2">Max price: {money(maxPrice)}</label>
            <input id="mx" type="range" min={0} max={ceiling} value={maxPrice} onChange={(e) => setMaxPrice(Number(e.target.value))} className="w-full" />
          </details>
        </aside>

        <section aria-labelledby="fares" className="min-w-0">
          <h2 id="fares" className="mb-2">{rows.length} of {data.flights.length} fares</h2>
          <div className="card overflow-x-auto p-0">
            <table className="w-full min-w-[720px]">
              <thead>
                <tr>
                  <th scope="col" aria-sort={ariaSort("departure")}><SortBtn k="departure">Departs</SortBtn></th>
                  <th scope="col">Arrives</th>
                  <th scope="col" aria-sort={ariaSort("durationMin")}><SortBtn k="durationMin">Duration</SortBtn></th>
                  <th scope="col">Stops</th>
                  <th scope="col">Airline</th>
                  <th scope="col" aria-sort={ariaSort("price")}><SortBtn k="price">Price</SortBtn></th>
                  <th scope="col"><span className="sr-only">Actions</span></th>
                </tr>
              </thead>
              <tbody>
                {rows.map((f) => (
                  <FareRow key={f.id} f={f} open={open === f.id} onToggle={() => setOpen(open === f.id ? null : f.id)} book={data.links[0]} />
                ))}
              </tbody>
            </table>
          </div>
          <p className="mt-2 text-sm">
            Prices are the totals shown by the source. Baggage, taxes and seat fees are not itemised by the data source; check
            them on the booking site before you pay.
          </p>
        </section>
      </div>
    </div>
  );
}

function FareRow({ f, open, onToggle, book }: { f: Flight; open: boolean; onToggle: () => void; book: { name: string; url: string } }) {
  return (
    <>
      <tr>
        <td>{f.departure || "n/a"}</td>
        <td>{f.arrival || "n/a"}</td>
        <td>{dur(f.durationMin)}</td>
        <td>{f.stops === 0 ? "Non-stop" : `${f.stops} stop${f.stops > 1 ? "s" : ""}`}</td>
        <td>{f.airline}</td>
        <td className="font-bold">{money(f.price, f.currency)}</td>
        <td className="whitespace-nowrap">
          <button type="button" className="btn btn-plain mr-2" aria-expanded={open} onClick={onToggle}>{open ? "Hide" : "Details"}</button>
          <a className="btn" href={book.url} target="_blank" rel="noopener noreferrer">View on {book.name}</a>
        </td>
      </tr>
      {open && (
        <tr>
          <td colSpan={7} className="bg-[#f7f7f7]">
            <dl className="grid gap-x-6 gap-y-1 sm:grid-cols-2">
              <div><dt className="inline font-bold">Flight: </dt><dd className="inline">{f.flightNumber || "n/a"} ({f.airline})</dd></div>
              <div><dt className="inline font-bold">Times: </dt><dd className="inline">{f.departure} to {f.arrival}</dd></div>
              <div><dt className="inline font-bold">Duration: </dt><dd className="inline">{dur(f.durationMin)}</dd></div>
              <div><dt className="inline font-bold">Stops: </dt><dd className="inline">{f.stops}</dd></div>
            </dl>
            <p className="mt-2 text-sm">Aircraft type, fare breakdown, baggage rules and seat prices are shown on the booking site.</p>
          </td>
        </tr>
      )}
    </>
  );
}

function Watch({ params: p }: { params: Data["params"] }) {
  const [pct, setPct] = useState("10");
  const [freq, setFreq] = useState("daily");
  const [state, setState] = useState<{ ok: boolean; text: string } | null>(null);
  const [busy, setBusy] = useState(false);

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setState(null);
    const res = await fetch("/api/alerts", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...p, pax: p.pax, dropPct: Number(pct), frequency: freq }),
    });
    const j = await res.json().catch(() => ({}));
    setBusy(false);
    setState(res.ok ? { ok: true, text: "Watching this route. Manage it in your dashboard." } : { ok: false, text: j.error ?? "Could not save." });
    if (res.status === 401) setState({ ok: false, text: "login" });
  }

  return (
    <form onSubmit={save} className="card grid gap-3 sm:grid-cols-[1fr_1fr_auto] sm:items-end" aria-labelledby="watch">
      <h2 id="watch" className="sm:col-span-3">Email me when the price drops</h2>
      <div>
        <label htmlFor="pct">Drop by (%)</label>
        <input id="pct" type="number" min={1} max={90} className="input" value={pct} onChange={(e) => setPct(e.target.value)} />
      </div>
      <div>
        <label htmlFor="freq">Alert frequency</label>
        <select id="freq" className="input" value={freq} onChange={(e) => setFreq(e.target.value)}>
          <option value="daily">At most daily</option>
          <option value="on_change">Whenever the price changes</option>
        </select>
      </div>
      <button className="btn" disabled={busy}>Watch route</button>
      {state && (
        <p role={state.ok ? "status" : "alert"} className={`sm:col-span-3 ${state.ok ? "" : "err"}`}>
          {state.text === "login" ? <>Sign in to watch routes. <Link href="/login">Sign in</Link> or <Link href="/register">create an account</Link>.</> : state.text}
        </p>
      )}
    </form>
  );
}
