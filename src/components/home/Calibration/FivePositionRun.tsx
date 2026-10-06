"use client";

import { useRef } from "react";
import gsap from "gsap";
import { useGSAP } from "@gsap/react";
import { armAtLoad, claimPrerun, driveTimeline, observeChart } from "@/lib/instrument";
import { PRERUN_TIMEOUT_MS } from "@/lib/prerunScript";
import { formatReading, UNIT, type ReadingKind } from "./format";
import styles from "./Calibration.module.css";

gsap.registerPlugin(useGSAP);

/*
 * "Five-position run" (approved 2026-10-04). The record fills in the way a
 * timegrapher run does: the limit is set, each position is tested in turn and
 * its reading lands on the plot, then the record signs off. Same rules as
 * Zero-set and the Inspection pass: linear, stepped or damped; never a fade or
 * slide. Hooks are data-fp attributes in Calibration.tsx.
 *
 *   0.00  the ±2 band edges appear at zero and step out to ±2; fill on at lock
 *   0.30  the cursor steps onto Dial up (overshoot, settle)
 *   per row, 0.40 apart:
 *         the dot snaps on at zero and travels to the reading (damped, 2px
 *         overshoot, settles); the leader is drawn behind it from zero. As it
 *         settles, Rate and Amp. count up from zero in even steps and land on
 *         the same frame. The cursor then steps to the next row in one step.
 *   after Crown up: cursor off; Mean rate and Spread count and land; Limit locks
 *   sign-off: Result on, its tick draws (= Zero-set, Inspection pass)
 *
 * Beats paced at about twice the first build's after the user asked for a steadier,
 * less rushed run (2026-10-04): this one is read, not glanced at.
 *
 * Runs once per page view, when the whole table is in view below the header
 * (observeChart: about 60% of it if it can't fit), or sooner after a jump to
 * /#calibration (see observeChart). The "before" state is applied only if the table
 * is still ahead of the reader once the page has loaded
 * (after any scroll restoration); otherwise the record renders finished. A fresh
 * /#calibration load or an arrival from another page shows it from the first
 * frame (prerunScript.ts, claimPrerun), so the finished values never flash first.
 * Reduced motion: never armed — final state only. No hover state.
 *
 * Hidden text uses opacity set in one step (never tweened), not visibility, so
 * the table keeps its final values in the accessibility tree throughout; the
 * rolling digits are an aria-hidden overlay.
 */

const PHONE = "(max-width: 860px)"; // = the single-column breakpoint in Calibration.module.css
const reduced = () => matchMedia("(prefers-reduced-motion: reduce)").matches;

// Limit
const BAND_STEPS = 3;
const BAND_DUR = 0.24; // 80ms a step

// Rows
const CURSOR_IN = 0.3;
const ROW_STEP = 0.4; // between row starts; the next dot sets off as this row's count finishes its last steps
const TRAVEL = 0.24;
const TRAVEL_EASE = "power2.out"; // = Inspection probe
const SETTLE = 0.12;
const OVERSHOOT = { desktop: 2, phone: 1 }; // px past the reading before settling

// Counting: whole display units (0.1 s, 1°), at most COUNT_STEPS of them, evenly
// spaced so each value holds for ~3 frames and reads as a count, not a flicker
const COUNT_STEPS = 6;
const COUNT_DUR = 0.36;
const LIMIT_GAP = 0.12; // totals land → Limit locks
const SIGNOFF_GAP = 0.12; // Limit → Result
const TICK_DUR = 0.2;

/** n even steps that land exactly at the end. GSAP's steps(n) reaches its last value
 *  at n/(n+1) of the tween, so counts with different step counts would land apart */
const stepped = (n: number) => (p: number) => (p >= 1 ? 1 : Math.floor(p * n) / n);

export default function FivePositionRun() {
  const ref = useRef<HTMLSpanElement>(null);

  useGSAP(
    (_, contextSafe) => {
      const cursor = ref.current!;
      const record = cursor.parentElement!;
      const q = <T extends HTMLElement = HTMLElement>(root: ParentNode, s: string) =>
        Array.from(root.querySelectorAll<T>(s));
      const one = (root: ParentNode, s: string) => root.querySelector<HTMLElement>(s)!;

      const table = one(record, '[data-fp="table"]');
      const rows = q(table, '[data-fp="row"]').map((row) => ({
        row,
        dot: one(row, '[data-fp="dot"]'),
        leader: one(row, '[data-fp="leader"]'),
        readings: q(row, '[data-fp="reading"]'),
      }));
      const totals = q(record, '[data-fp="total"] [data-fp="reading"]');
      const limit = one(record, '[data-fp="limit"]');
      const result = one(record, '[data-fp="result"]');
      const tick = one(record, '[data-fp="tick"]');

      const parts = (reading: HTMLElement) => ({
        val: one(reading, '[data-fp="val"]'),
        roll: one(reading, '[data-fp="roll"]'),
      });
      const allReadings = [...rows.flatMap((r) => r.readings), ...totals];
      const vals = allReadings.map((r) => parts(r).val);
      const rolls = allReadings.map((r) => parts(r).roll);

      // ---- Before state ------------------------------------------------------
      const arm = () => {
        gsap.set(table, { "--band": 0, "--band-edge": "transparent", "--band-fill": "transparent" });
        gsap.set([...rows.flatMap((r) => [r.dot, r.leader])], { visibility: "hidden" });
        gsap.set([...vals, limit, result], { opacity: 0 });
        gsap.set(tick, { scaleX: 0, transformOrigin: "0 50%" });
      };

      // ---- The run -----------------------------------------------------------
      const buildRun = () => {
        const overshoot = matchMedia(PHONE).matches ? OVERSHOOT.phone : OVERSHOOT.desktop;
        const rec = record.getBoundingClientRect();
        const tl = gsap.timeline({ paused: true });

        /** Count a reading up from zero from `at`; the real value takes over on the last step */
        const count = (reading: HTMLElement, at: number) => {
          const { val, roll: overlay } = parts(reading);
          const kind = reading.dataset.kind as ReadingKind;
          const suffix = reading.dataset.suffix ?? "";
          const unit = UNIT[kind];
          const units = Math.round(Number(reading.dataset.value) / unit); // as displayed
          const steps = Math.max(1, Math.min(COUNT_STEPS, Math.abs(units)));
          const r = { t: 0 };
          let shown = -1; // redraw only when the stepped value changes, not every frame
          tl.to(
            r,
            {
              t: 1,
              duration: COUNT_DUR,
              ease: stepped(steps),
              onUpdate: () => {
                if (r.t === shown) return;
                shown = r.t;
                const landed = r.t >= 1;
                overlay.textContent = landed ? "" : formatReading(Math.round(units * r.t) * unit, kind) + suffix;
                val.style.opacity = landed ? "" : "0";
              },
            },
            at,
          );
        };

        // Limit: edges on at zero, step out to ±2, fill on as they lock
        tl.set(table, { "--band-edge": "var(--border-strong)", "--band": 0 }, 0)
          .to(table, { "--band": 1, duration: BAND_DUR, ease: stepped(BAND_STEPS) }, 0)
          .set(table, { "--band-fill": "var(--chart-band)" }, BAND_DUR);

        // Rows: dot + leader share one state; leader is drawn from zero to the dot
        const renders: (() => void)[] = [];
        let lastLock = 0;
        rows.forEach(({ row, dot, leader, readings }, i) => {
          const start = CURSOR_IN + i * ROW_STEP;
          const r = row.getBoundingClientRect();
          const track = dot.parentElement!.getBoundingClientRect();
          const d = dot.getBoundingClientRect();
          const dx = d.left + d.width / 2 - (track.left + track.width / 2); // zero → reading, px
          const dir = Math.sign(dx) || 1;
          const s = { x: 0 }; // distance travelled from zero
          renders.push(() => {
            gsap.set(dot, { x: s.x - dx });
            gsap.set(leader, { scaleX: dx ? s.x / dx : 1 });
          });

          // Cursor: steps onto the row (first row overshoots and settles, as the header marker)
          const y = r.top - rec.top;
          if (i === 0) {
            tl.set(cursor, { visibility: "visible", height: r.height, y: y + overshoot }, start).to(
              cursor,
              { y, duration: SETTLE, ease: "power2.inOut" },
              start,
            );
          } else {
            tl.set(cursor, { height: r.height, y }, start);
          }

          tl.set(dot, { visibility: "visible" }, start)
            .set(leader, { visibility: "visible", transformOrigin: dx >= 0 ? "0 50%" : "100% 50%" }, start)
            .to(s, { x: dx + dir * overshoot, duration: TRAVEL, ease: TRAVEL_EASE }, start)
            .to(s, { x: dx, duration: SETTLE, ease: "power2.inOut" }, start + TRAVEL);

          // Rate and Amp. count as the dot settles and land on the same frame
          const settled = start + TRAVEL;
          readings.forEach((el) => count(el, settled));
          lastLock = settled + COUNT_DUR;
        });
        // Every frame of the run, holds included
        tl.eventCallback("onUpdate", () => renders.forEach((f) => f()));

        // Totals, then Limit, then sign-off
        tl.set(cursor, { visibility: "hidden" }, lastLock);
        totals.forEach((el) => count(el, lastLock));
        const limitAt = lastLock + COUNT_DUR + LIMIT_GAP;
        const signoffAt = limitAt + SIGNOFF_GAP;
        tl.set(limit, { opacity: 1 }, limitAt)
          .set(result, { opacity: 1 }, signoffAt)
          .to(tick, { scaleX: 1, duration: TICK_DUR, ease: "none" }, signoffAt);

        // Before the first frame: dots and leaders at zero
        renders.forEach((f) => f());
        return tl;
      };

      // Leave the static markup exactly as React rendered it
      const clear = () => {
        for (const p of ["--band", "--band-edge", "--band-fill"]) table.style.removeProperty(p);
        gsap.set(rows.flatMap((r) => [r.dot, r.leader]), { clearProps: "visibility,transform,transformOrigin" });
        gsap.set([...vals, limit, result], { clearProps: "opacity" });
        gsap.set(tick, { clearProps: "transform,transformOrigin" });
        gsap.set(cursor, { clearProps: "visibility,height,transform" });
        rolls.forEach((el) => (el.textContent = ""));
      };

      // A fresh /#calibration load, or a jump on its way from another page: the before
      // state from the first frame (the pre-paint marker held it until now), confirmed
      // or undone at the load-time decision
      let early = claimPrerun(table);
      if (early) arm();
      const failsafe = early
        ? setTimeout(() => {
            if (!early) return;
            early = false;
            clear(); // the decision never came: never leave the record blank
          }, PRERUN_TIMEOUT_MS)
        : 0;

      let cancel: (() => void) | null = null;
      const run = contextSafe!(() => {
        const tl = buildRun();
        tl.eventCallback("onComplete", () => {
          clear();
          cancel = null;
        });
        cancel = driveTimeline(tl);
      });

      const io = observeChart(() => run()); // the table is the chart

      // Decide after load + a frame, so a restored scroll position is already applied:
      // only a table still ahead of the reader gets the before state (armAtLoad).
      let raf = 0;
      const decide = contextSafe!(() => {
        const wasEarly = early;
        early = false;
        clearTimeout(failsafe);
        try {
          const mode = reduced() ? null : armAtLoad(table);
          if (!mode) {
            if (wasEarly) clear(); // jumped, but already past it: finished
            return;
          }
          if (!wasEarly) arm();
          io.observe(table, mode === "jump");
        } catch (e) {
          clear();
          throw e;
        }
      });
      const afterLoad = () => (raf = requestAnimationFrame(() => (raf = requestAnimationFrame(decide))));
      if (document.readyState === "complete") afterLoad();
      else window.addEventListener("load", afterLoad, { once: true });

      return () => {
        window.removeEventListener("load", afterLoad);
        cancelAnimationFrame(raf);
        clearTimeout(failsafe);
        cancel?.();
        io.disconnect();
        // Unmounted mid-run (incl. StrictMode's dev double-mount): the context revert
        // clears the inline styles; the overlays are ours to empty
        rolls.forEach((el) => (el.textContent = ""));
      };
    },
    { scope: ref },
  );

  return <span ref={ref} className={styles.cursor} data-fp="cursor" aria-hidden />;
}
