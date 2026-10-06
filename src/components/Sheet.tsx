"use client";

import { useEffect, useRef } from "react";

const EASE = "cubic-bezier(0.32, 0.72, 0, 1)"; // iOS sheet curve
const reduced = () => matchMedia("(prefers-reduced-motion: reduce)").matches;
// Where a release at `v` px/s would coast to (Apple's momentum projection, deceleration 0.998).
const project = (v: number) => ((v / 1000) * 0.998) / (1 - 0.998);

/** Bottom sheet on a native <dialog> (focus trap, Escape, inert background). Drag the grip down to dismiss. */
export default function Sheet({ open, onClose, title, children }: { open: boolean; onClose: () => void; title: string; children: React.ReactNode }) {
  const ref = useRef<HTMLDialogElement>(null);
  const drag = useRef<{ y0: number; dy: number; samples: { t: number; y: number }[] } | null>(null);

  // Current on-screen offset, so a new motion always starts from where the sheet actually is.
  const offset = (d: HTMLElement) => new DOMMatrix(getComputedStyle(d).transform).m42 || 0;

  function slide(d: HTMLElement, from: number, to: number | string, ms: number) {
    d.getAnimations().forEach((a) => a.cancel());
    if (reduced()) return Promise.resolve();
    return d.animate([{ transform: `translateY(${from}px)` }, { transform: `translateY(${typeof to === "number" ? `${to}px` : to})` }], { duration: ms, easing: EASE, fill: "forwards" }).finished.catch(() => {});
  }

  async function dismiss() {
    const d = ref.current;
    if (!d) return;
    await slide(d, offset(d), "100%", 300);
    d.getAnimations().forEach((a) => a.cancel());
    d.style.transform = "";
    onClose();
  }

  useEffect(() => {
    const d = ref.current;
    if (!d) return;
    if (open && !d.open) {
      d.getAnimations().forEach((a) => a.cancel());
      d.showModal();
      slide(d, d.offsetHeight, 0, 420);
    } else if (!open && d.open) d.close();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  function down(e: React.PointerEvent<HTMLDivElement>) {
    const d = ref.current!;
    d.getAnimations().forEach((a) => a.cancel());
    e.currentTarget.setPointerCapture(e.pointerId);
    drag.current = { y0: e.clientY - offset(d), dy: offset(d), samples: [{ t: e.timeStamp, y: e.clientY }] };
  }
  function move(e: React.PointerEvent<HTMLDivElement>) {
    const s = drag.current;
    if (!s) return;
    const raw = e.clientY - s.y0;
    s.dy = raw < 0 ? raw / 6 : raw; // resist when pulled above the top
    s.samples.push({ t: e.timeStamp, y: e.clientY });
    s.samples = s.samples.filter((p) => e.timeStamp - p.t < 100);
    ref.current!.style.transform = `translateY(${s.dy}px)`;
  }
  function up() {
    const s = drag.current;
    drag.current = null;
    const d = ref.current;
    if (!s || !d) return;
    const first = s.samples[0];
    const last = s.samples[s.samples.length - 1];
    const v = last.t > first.t ? ((last.y - first.y) / (last.t - first.t)) * 1000 : 0; // px/s, + is downward
    const projected = s.dy + project(v);
    d.style.transform = "";
    if (projected > d.offsetHeight * 0.5) {
      slide(d, s.dy, "100%", 300).then(() => {
        d.getAnimations().forEach((a) => a.cancel());
        onClose();
      });
    } else slide(d, s.dy, 0, 380);
  }

  return (
    <dialog
      ref={ref}
      className="sheet"
      aria-labelledby="sheet-title"
      onCancel={(e) => {
        e.preventDefault();
        dismiss();
      }}
      onClick={(e) => e.target === e.currentTarget && dismiss()}
      onClose={onClose}
    >
      <div className="sheet-grab" onPointerDown={down} onPointerMove={move} onPointerUp={up} onPointerCancel={up}>
        <div className="sheet-grip" aria-hidden="true" />
        <div className="flex items-center justify-between pb-2">
          <h2 id="sheet-title" className="text-lg">{title}</h2>
          <button type="button" className="btn" onPointerDown={(e) => e.stopPropagation()} onClick={dismiss}>Done</button>
        </div>
      </div>
      <div className="sheet-body">{children}</div>
    </dialog>
  );
}
