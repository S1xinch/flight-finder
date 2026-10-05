"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { parseParams } from "@/lib/links";

export default function SearchForm({ defaults = {} }: { defaults?: Record<string, string> }) {
  const router = useRouter();
  const [err, setErr] = useState("");
  const today = new Date().toISOString().slice(0, 10);

  function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const p = parseParams((k) => String(fd.get(k) ?? ""));
    if (typeof p === "string") return setErr(p);
    setErr("");
    router.push(`/results?${new URLSearchParams({ o: p.o, d: p.d, dep: p.dep, ...(p.ret ? { ret: p.ret } : {}), pax: String(p.pax), cabin: p.cabin })}`);
  }

  return (
    <form onSubmit={submit} noValidate className="card grid max-w-4xl gap-4 sm:grid-cols-2 lg:grid-cols-3" aria-describedby={err ? "form-err" : undefined}>
      <div>
        <label htmlFor="o">From (airport code)</label>
        <input id="o" name="o" className="input uppercase" maxLength={3} placeholder="JFK" autoComplete="off" defaultValue={defaults.o} aria-invalid={!!err} />
      </div>
      <div>
        <label htmlFor="d">To (airport code)</label>
        <input id="d" name="d" className="input uppercase" maxLength={3} placeholder="LAX" autoComplete="off" defaultValue={defaults.d} aria-invalid={!!err} />
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
        <input id="pax" name="pax" type="number" min={1} max={9} className="input" defaultValue={defaults.pax ?? "1"} />
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
