"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";

type Alert = { id: number; origin: string; destination: string; dep: string; ret: string; passengers: number; cabin: string; drop_pct: number; threshold: number; frequency: string; status: string; current_price: number | null; updated: number | null };
type Search = { o: string; d: string; dep: string; ret: string; pax: number; cabin: string };
type Booking = { id: number; airline: string; route: string; date: string; confirmation: string; totalPrice: number | null };

const api = (url: string, method = "GET", body?: unknown) =>
  fetch(url, { method, headers: body ? { "Content-Type": "application/json" } : undefined, body: body ? JSON.stringify(body) : undefined });
const link = (o: string, d: string, dep: string, ret: string, pax: number, cabin: string) =>
  `/results?o=${o}&d=${d}&dep=${dep}${ret ? `&ret=${ret}` : ""}&pax=${pax}&cabin=${cabin}`;

export default function Dashboard() {
  const router = useRouter();
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [searches, setSearches] = useState<Search[]>([]);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [emailAlerts, setEmailAlerts] = useState(true);
  const [err, setErr] = useState("");

  const load = useCallback(async () => {
    const [a, s, b, u] = await Promise.all([api("/api/alerts"), api("/api/searches"), api("/api/bookings"), api("/api/account")]);
    if (a.status === 401) return router.push("/login");
    setAlerts(await a.json());
    setSearches(await s.json());
    setBookings(await b.json());
    setEmailAlerts((await u.json()).emailAlerts);
  }, [router]);
  useEffect(() => { load(); }, [load]);

  async function act(url: string, method: string, body?: unknown) {
    const r = await api(url, method, body);
    if (!r.ok) setErr((await r.json().catch(() => ({}))).error ?? "Something went wrong.");
    else setErr("");
    await load();
  }

  async function addBooking(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const f = e.currentTarget;
    const fd = Object.fromEntries(new FormData(f));
    const r = await api("/api/bookings", "POST", fd);
    if (r.ok) f.reset();
    else setErr((await r.json().catch(() => ({}))).error ?? "Could not save.");
    await load();
  }

  async function signOut() {
    await api("/api/auth/logout", "POST", {});
    router.push("/");
    router.refresh();
  }

  async function deleteAccount() {
    if (!confirm("Delete your account and all saved data? This cannot be undone.")) return;
    await api("/api/account", "DELETE");
    router.push("/");
    router.refresh();
  }

  return (
    <div className="grid gap-8">
      {err && <p role="alert" className="err">{err}</p>}

      <section aria-labelledby="alerts" className="card">
        <h2 id="alerts" className="mb-3">Price alerts</h2>
        {alerts.length === 0 ? (
          <p>No watched routes. Open a search and use “Email me when the price drops”.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[640px]">
              <thead><tr><th scope="col">Route</th><th scope="col">Current</th><th scope="col">Alert at</th><th scope="col">Frequency</th><th scope="col">Status</th><th scope="col"><span className="sr-only">Actions</span></th></tr></thead>
              <tbody>
                {alerts.map((a) => (
                  <tr key={a.id}>
                    <td><Link href={link(a.origin, a.destination, a.dep, a.ret, a.passengers, a.cabin)}>{a.origin} to {a.destination}</Link><br /><span className="text-sm">{a.dep}{a.ret ? ` to ${a.ret}` : ""}</span></td>
                    <td>{a.current_price ? `$${Math.round(a.current_price)}` : "n/a"}{a.updated ? <><br /><span className="text-sm">{new Date(a.updated).toLocaleDateString()}</span></> : null}</td>
                    <td>${Math.round(a.threshold)} ({a.drop_pct}% drop)</td>
                    <td>
                      <label htmlFor={`f${a.id}`} className="sr-only">Frequency</label>
                      <select id={`f${a.id}`} className="input" value={a.frequency} onChange={(e) => act("/api/alerts", "PATCH", { id: a.id, frequency: e.target.value })}>
                        <option value="daily">At most daily</option>
                        <option value="on_change">On change</option>
                      </select>
                    </td>
                    <td>{a.status === "active" ? "Active" : "Paused"}</td>
                    <td className="whitespace-nowrap">
                      <button className="btn btn-plain mr-2" onClick={() => act("/api/alerts", "PATCH", { id: a.id, status: a.status === "active" ? "paused" : "active" })}>{a.status === "active" ? "Pause" : "Resume"}</button>
                      <button className="btn btn-plain" onClick={() => act(`/api/alerts?id=${a.id}`, "DELETE")}>Delete</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <section aria-labelledby="searches" className="card">
        <h2 id="searches" className="mb-3">Saved searches</h2>
        {searches.length === 0 ? <p>Your recent searches will appear here.</p> : (
          <ul className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {searches.map((s) => (
              <li key={`${s.o}${s.d}${s.dep}${s.ret}`}>
                <Link href={link(s.o, s.d, s.dep, s.ret, s.pax, s.cabin)}>{s.o} to {s.d}</Link> <span className="text-sm">{s.dep}{s.ret ? ` to ${s.ret}` : ""}. Search again</span>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section aria-labelledby="bookings" className="card">
        <h2 id="bookings" className="mb-1">Booking history</h2>
        <p className="mb-3 text-sm">Record trips you booked on partner sites. Details are encrypted at rest and only you can see them.</p>
        <form onSubmit={addBooking} className="mb-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
          <div><label htmlFor="b-conf">Confirmation number</label><input id="b-conf" name="confirmation" required maxLength={40} className="input" /></div>
          <div><label htmlFor="b-air">Airline</label><input id="b-air" name="airline" required maxLength={80} className="input" /></div>
          <div><label htmlFor="b-route">Route</label><input id="b-route" name="route" required maxLength={80} placeholder="JFK to LAX" className="input" /></div>
          <div><label htmlFor="b-date">Travel date</label><input id="b-date" name="date" type="date" className="input" /></div>
          <div><label htmlFor="b-price">Total price</label><input id="b-price" name="totalPrice" type="number" min={0} step="0.01" className="input" /></div>
          <div className="sm:col-span-2 lg:col-span-5"><button className="btn">Save booking</button></div>
        </form>
        {bookings.length === 0 ? <p>No bookings recorded.</p> : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[560px]">
              <thead><tr><th scope="col">Confirmation</th><th scope="col">Airline</th><th scope="col">Route</th><th scope="col">Date</th><th scope="col">Price</th><th scope="col"><span className="sr-only">Actions</span></th></tr></thead>
              <tbody>
                {bookings.map((b) => (
                  <tr key={b.id}>
                    <td>{b.confirmation}</td><td>{b.airline}</td><td>{b.route}</td><td>{b.date || "n/a"}</td>
                    <td>{b.totalPrice != null ? `$${b.totalPrice}` : "n/a"}</td>
                    <td><button className="btn btn-plain" onClick={() => act(`/api/bookings?id=${b.id}`, "DELETE")}>Delete</button></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <section aria-labelledby="settings" className="card grid gap-4">
        <h2 id="settings">Account settings</h2>
        <label className="flex items-center gap-2 font-normal">
          <input type="checkbox" checked={emailAlerts} onChange={(e) => act("/api/account", "PATCH", { emailAlerts: e.target.checked })} />
          Send price alert emails
        </label>
        <p className="flex flex-wrap gap-3">
          <a className="btn btn-plain" href="/api/account?export=1">Download my data</a>
          <button className="btn btn-plain" onClick={signOut}>Sign out</button>
          <button className="btn btn-plain" onClick={deleteAccount}>Delete my account</button>
        </p>
      </section>
    </div>
  );
}
