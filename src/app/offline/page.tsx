"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

type Saved = { href: string; o: string; d: string; dep: string; ret: string };

export default function Offline() {
  const [items, setItems] = useState<Saved[] | null>(null);

  useEffect(() => {
    if (!("caches" in window)) return setItems([]);
    caches
      .open("ff-v1-api")
      .then((c) => c.keys())
      .then((keys) =>
        setItems(
          keys.map((k) => {
            const q = new URL(k.url).searchParams;
            return { href: `/results?${q}`, o: q.get("o") ?? "", d: q.get("d") ?? "", dep: q.get("dep") ?? "", ret: q.get("ret") ?? "" };
          }),
        ),
      )
      .catch(() => setItems([]));
  }, []);

  return (
    <div className="wrap grid gap-4">
      <h1>You are offline</h1>
      <p>New searches need a connection. Searches you already ran on this device can still be opened:</p>
      {items === null ? null : items.length === 0 ? (
        <p>No saved searches yet.</p>
      ) : (
        <ul className="grid gap-2 sm:grid-cols-2">
          {items.map((s) => (
            <li key={s.href} className="card">
              <p className="font-bold">{s.o} to {s.d}</p>
              <p className="text-sm">{s.dep}{s.ret ? ` to ${s.ret}` : ""}</p>
              <Link href={s.href}>Open saved results</Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
