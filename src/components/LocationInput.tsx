"use client";

import { useEffect, useRef, useState } from "react";
import { label, place, searchAirports, toAirport, type Airport, type AirportRow } from "@/lib/airports";

// 4,000 airports (~70 KB gzipped) load on first use, not with the page.
let loading: Promise<Airport[]> | null = null;
const load = () => (loading ??= import("@/data/airports.json").then((m) => (m.default as AirportRow[]).map(toAirport)));

const RECENT = "ff_recent_locations";
const recentCodes = (): string[] => {
  try {
    return JSON.parse(localStorage.getItem(RECENT) ?? "[]");
  } catch {
    return [];
  }
};
const remember = (code: string) => {
  try {
    localStorage.setItem(RECENT, JSON.stringify([code, ...recentCodes().filter((c) => c !== code)].slice(0, 5)));
  } catch {}
};

type Props = { id: string; label: string; code: string; onCode: (code: string) => void; invalid?: boolean };

/** Accessible combobox: type a city, airport name, country or code; the chosen airport code goes to `onCode`. */
export default function LocationInput({ id, label: text, code, onCode, invalid }: Props) {
  const [list, setList] = useState<Airport[]>([]);
  const [q, setQ] = useState(code);
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);
  const typed = useRef(false); // true while the text is user input rather than a chosen label
  const listId = `${id}-list`;

  useEffect(() => {
    if (code) load().then(setList); // need names to show the label for a preset code
  }, [code]);

  // Show the label for the current code when it changes from outside (swap button, URL).
  useEffect(() => {
    if (typed.current) return;
    const a = list.find((x) => x.code === code);
    setQ(a ? label(a) : code);
  }, [code, list]);

  const showRecent = !typed.current || q.trim().length < 2;
  const results: Airport[] = !open
    ? []
    : showRecent
      ? recentCodes().map((c) => list.find((a) => a.code === c)).filter((a): a is Airport => !!a)
      : searchAirports(list, q);

  function choose(a: Airport) {
    typed.current = false;
    onCode(a.code);
    setQ(label(a));
    setOpen(false);
    remember(a.code);
  }

  function onBlur() {
    setOpen(false);
    if (!typed.current) return;
    if (!q.trim()) {
      typed.current = false;
      return onCode("");
    }
    const top = searchAirports(list, q, 1)[0];
    if (top) return choose(top);
    typed.current = false; // no match: go back to the last good choice
    const a = list.find((x) => x.code === code);
    setQ(a ? label(a) : code);
  }

  function onKeyDown(e: React.KeyboardEvent) {
    if (e.key === "ArrowDown" || e.key === "ArrowUp") {
      e.preventDefault();
      setOpen(true);
      setActive((i) => Math.max(0, Math.min(results.length - 1, i + (e.key === "ArrowDown" ? 1 : -1))));
    } else if (e.key === "Enter" && open && results[active]) {
      e.preventDefault();
      choose(results[active]);
    } else if (e.key === "Escape" && open) {
      e.preventDefault();
      setOpen(false);
    }
  }

  const expanded = open && results.length > 0;
  return (
    <div className="relative">
      <label htmlFor={id}>{text}</label>
      <input
        id={id}
        role="combobox"
        aria-expanded={expanded}
        aria-controls={listId}
        aria-autocomplete="list"
        aria-activedescendant={expanded ? `${id}-opt-${active}` : undefined}
        aria-invalid={invalid}
        autoComplete="off"
        autoCapitalize="off"
        spellCheck={false}
        inputMode="search"
        enterKeyHint="search"
        className="input"
        placeholder="City, airport or code"
        value={q}
        onFocus={(e) => {
          load().then(setList);
          setOpen(true);
          setActive(0);
          e.currentTarget.select();
        }}
        onChange={(e) => {
          typed.current = true;
          setQ(e.target.value);
          setOpen(true);
          setActive(0);
        }}
        onKeyDown={onKeyDown}
        onBlur={onBlur}
      />
      {expanded && (
        <ul id={listId} role="listbox" aria-label={`${text} suggestions`} className="loc-list">
          {showRecent && <li role="presentation" className="loc-head">Recent</li>}
          {results.map((a, i) => (
            <li
              key={a.code}
              id={`${id}-opt-${i}`}
              role="option"
              aria-selected={i === active}
              data-active={i === active}
              className="loc-opt"
              onMouseDown={(e) => e.preventDefault()} // keep focus in the input so blur doesn't fire first
              onClick={() => choose(a)}
              onMouseEnter={() => setActive(i)}
            >
              <span className="loc-code">{a.code}</span>
              <span>
                <strong>{place(a)}</strong>
                <br />
                <span className="text-sm">{a.name}</span>
              </span>
            </li>
          ))}
        </ul>
      )}
      <p role="status" className="sr-only">
        {expanded ? `${results.length} suggestions. Use the up and down arrow keys, then Enter.` : ""}
      </p>
    </div>
  );
}
