"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import LocationInput from "@/components/LocationInput";
import { parseParams } from "@/lib/links";

export default function SearchForm({ defaults = {} }: { defaults?: Record<string, string> }) {
  const router = useRouter();
  const [err, setErr] = useState("");
  const [o, setO] = useState((defaults.o ?? "").toUpperCase());
  const [d, setD] = useState((defaults.d ?? "").toUpperCase());
  const today = new Date().toISOString().slice(0, 10);

  function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const p = parseParams((k) => (k === "o" ? o : k === "d" ? d : String(fd.get(k) ?? "")));
    if (typeof p === "string") return setErr(p);
    setErr("");
    router.push(`/results?${new URLSearchParams({ o: p.o, d: p.d, dep: p.dep, ...(p.ret ? { ret: p.ret } : {}), pax: String(p.pax), cabin: p.cabin })}`);
  }

  return (
    <form onSubmit={submit} noValidate className="card grid max-w-4xl gap-4 sm:grid-cols-2 lg:grid-cols-3" aria-describedby={err ? "form-err" : undefined}>
      <div className="grid items-end gap-2 sm:col-span-2 sm:grid-cols-[1fr_auto_1fr] lg:col-span-3">
        <LocationInput id="o" label="From" code={o} onCode={setO} invalid={!!err && !o} />
        <button type="button" className="btn btn-plain swap justify-self-center" aria-label="Swap origin and destination" onClick={() => { setO(d); setD(o); }}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M7 4 3 8l4 4M3 8h14M17 20l4-4-4-4M21 16H7" />
          </svg>
        </button>
        <LocationInput id="d" label="To" code={d} onCode={setD} invalid={!!err && !d} />
      </div>
      <div>
        <label htmlFor="dep">Departure date</label>
        <input id="dep" name="dep" type="date" min={today} className="input" defaultValue={defaults.dep} />
      </div>
      <div>
        <label htmlFor="ret">Return date (optional)</label>
        <input id="ret" name="ret" type="date" min={today} className="input" defaultValue={defaults.ret} />
      </div>
      <div>
        <label htmlFor="pax">Passengers</label>
        <input id="pax" name="pax" type="number" min={1} max={9} inputMode="numeric" className="input" defaultValue={defaults.pax ?? "1"} />
      </div>
      <div>
        <label htmlFor="cabin">Cabin</label>
        <select id="cabin" name="cabin" className="input" defaultValue={defaults.cabin ?? "economy"}>
          <option value="economy">Economy</option>
          <option value="premium">Premium economy</option>
          <option value="business">Business</option>
          <option value="first">First</option>
        </select>
      </div>
      {err && <p id="form-err" role="alert" className="err sm:col-span-2 lg:col-span-3">{err}</p>}
      <div className="sm:col-span-2 lg:col-span-3">
        <button className="btn">Search flights</button>
      </div>
    </form>
  );
}
