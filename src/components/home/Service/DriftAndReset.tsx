"use client";

import { useRef } from "react";
import gsap from "gsap";
import { useGSAP } from "@gsap/react";
import { armAtLoad, claimPrerun, driveTimeline, observeChart } from "@/lib/instrument";
import { PRERUN_TIMEOUT_MS } from "@/lib/prerunScript";
import { formatReading, UNIT, type ReadingKind } from "@/components/home/Calibration/format";
import { monthsBetween } from "./months";
import styles from "./Service.module.css";

gsap.registerPlugin(useGSAP);

/*
 * "Drift and reset" (approved in words 2026-10-04). A chart recorder replays the
 * watch's service history: a pen steps through the years and plots each check,
 * the drift creeps toward the limit, and at Y5 the full service re-zeroes it.
 * Same language as Zero-set, the Inspection pass and the Five-position run:
 * linear, stepped or damped; never a fade or slide. Hooks are data-dr attributes
 * in Service.tsx.
 *
 *   0.00  the year rule scribes left to right; each Y label stamps on as it passes
 *   per year Y0–Y5, 0.38 apart:
 *         the pen steps onto the year line. The dot snaps on at zero and rises to
 *         the reading (damped, 2px overshoot, settles), the segment from the last
 *         dot drawn behind it; the pen's readout counts up from zero in even steps
 *         and lands as the dot settles. Labelled readings stamp on as they land.
 *   2.70  +1.9 lands near the limit: the upper limit line holds solid
 *   2.94  the Y5 full-service rule scribes top to bottom
 *   3.18  the reset: a dot drops from +1.9 to +0.3 (hard drop, small damped settle),
 *         drop line drawn with it, readout counts down; the limit goes back to dashed
 *   3.66  the pen steps to today and becomes the dashed Today line; the scheduled
 *         years hatch on; rings clamp onto the rule Y6 → Y10 (= hero registration
 *         marks); then the Y10 rule scribes. Summary values count from zero and land
 *   4.14  Next check steps month by month to 03/2027; its sign-off tick draws (4.64)
 *
 * Paced like the Five-position run (the user's call: read, not glanced at; counts
 * step about every 60ms). Built at the full approved length, not pre-tightened.
 *
 * Runs once per page view, when the chart is fully in view below the header
 * (observeChart: about 60% of it if it can't fit), or sooner after a jump to
 * /#service (see observeChart). The "before" state is applied only if the chart is
 * still ahead of the reader once the page has loaded (after any scroll
 * restoration); otherwise it renders finished. A fresh /#service load or an arrival
 * from another page shows it from the first frame (prerunScript.ts, claimPrerun),
 * so the finished chart never flashes first. Reduced motion:
 * never armed — final state only. No hover state.
 *
 * Summary values hide with opacity set in one step (never tweened) so the real
 * text stays in the accessibility tree; counting digits are an aria-hidden overlay.
 */

// Everything the run sets inline. Cleared by name, never "all": React owns
// left/top in the same style attributes.
const RUN_PROPS = "visibility,opacity,transform,transformOrigin,borderTopStyle";

const PHONE = "(max-width: 860px)"; // = the single-column breakpoint in Service.module.css
const reduced = () => matchMedia("(prefers-reduced-motion: reduce)").matches;

// Axis
const AXIS_DUR = 0.5;

// Years
const YEAR_STEP = 0.38;
const RISE = 0.2;
const RISE_EASE = "power2.out"; // = Inspection probe, Five-position dots
const SETTLE = 0.1;
const YEAR_COUNT = RISE + SETTLE; // the readout lands on the frame the dot settles
const YEAR_COUNT_STEPS = 5; // 60ms a step
const OVERSHOOT = { desktop: 2, phone: 1 }; // px past the reading before settling

// Limit + reset
const LIMIT_HOLD = 0.24;
const SCRIBE = 0.24; // full-service rules, top to bottom
const DROP = 0.24;
const DROP_EASE = "power2.in"; // a hard drop: gathers speed until it hits
const DROP_SETTLE = 0.12;
const DROP_COUNT_STEPS = 6; // 60ms a step over DROP + DROP_SETTLE
const RESET_HOLD = 0.12; // reset lands → the pen moves on

// Scheduled years
const RING_STEP = 0.06;
const RING_OFFSET = 6; // px above the rule before it clamps on

// Summary
const COUNT_STEPS = 6;
const COUNT_DUR = 0.36;
const NEXT_GAP = 0.12; // totals land → Next check starts stepping
const MONTH_STEP = 0.06;
const TICK_DUR = 0.2;

/** n even steps that land exactly at the end (GSAP's steps(n) lands at n/(n+1)) */
const stepped = (n: number) => (p: number) => (p >= 1 ? 1 : Math.floor(p * n) / n);

type Props = { scale: number; years: number; today: number };

export default function DriftAndReset({ scale, years, today }: Props) {
  const ref = useRef<HTMLSpanElement>(null);
  const readoutRef = useRef<HTMLSpanElement>(null);

  useGSAP(
    (_, contextSafe) => {
      const cursor = ref.current!;
      const readout = readoutRef.current!;
      const area = cursor.parentElement!;
      const record = cursor.closest("article")!;
      const q = <T extends Element = HTMLElement>(s: string) => Array.from(record.querySelectorAll<T>(s));
      const one = (root: ParentNode, s: string) => root.querySelector<HTMLElement>(s)!;

      const chart = one(record, '[data-dr="chart"]');

      const band = one(record, '[data-dr="band"]');
      const [service5, service10] = q('[data-dr="service"]');
      const future = one(record, '[data-dr="future"]');
      const todayLine = one(record, '[data-dr="today"]');
      const segs = q<SVGLineElement>('[data-dr="seg"]');
      const dots = q('[data-dr="dot"]');
      const labels = q('[data-dr="label"]');
      const axis = one(record, '[data-dr="axis"]');
      const yearLabels = q('[data-dr="year"]');
      const rings = q('[data-dr="ring"]');
      const totals = q('[data-dr="reading"]');
      const next = one(record, '[data-dr="next"]');
      const tick = one(record, '[data-dr="tick"]');

      const parts = (el: HTMLElement) => ({ val: one(el, '[data-dr="val"]'), roll: one(el, '[data-dr="roll"]') });
      const vals = [...totals, next].map((el) => parts(el).val);
      const rolls = [...totals, next].map((el) => parts(el).roll);

      // Static segment ends, to draw from and to restore
      const segEnd = segs.map((s) => ({ x2: s.getAttribute("x2")!, y2: Number(s.getAttribute("y2")) }));
      // What a run leaves behind that GSAP does not own: segment ends and visibility, overlays
      const restoreStatic = () => {
        segs.forEach((s, i) => {
          s.setAttribute("x2", segEnd[i].x2);
          s.setAttribute("y2", String(segEnd[i].y2));
          s.style.removeProperty("visibility");
        });
        rolls.forEach((el) => (el.textContent = ""));
        readout.textContent = "";
      };

      // ---- Before state ------------------------------------------------------
      const arm = () => {
        gsap.set(axis, { scaleX: 0, transformOrigin: "0 50%" });
        gsap.set([service5, service10], { scaleY: 0, transformOrigin: "50% 0" });
        gsap.set([...dots, ...rings, future, todayLine], { visibility: "hidden" });
        segs.forEach((s) => (s.style.visibility = "hidden"));
        gsap.set([...yearLabels, ...labels, ...vals], { opacity: 0 });
        gsap.set(tick, { scaleX: 0, transformOrigin: "0 50%" });
      };

      // ---- The run -----------------------------------------------------------
      const buildRun = () => {
        const overshoot = matchMedia(PHONE).matches ? OVERSHOOT.phone : OVERSHOOT.desktop;
        const { width: W, height: H } = area.getBoundingClientRect();
        const xPx = (year: number) => (year / years) * W;
        const yPct = (rate: number) => ((scale - rate) / (scale * 2)) * 100; // from the top
        const tl = gsap.timeline({ paused: true });

        /** Step `write` through n even steps from `at`; it gets 0…1, landing exactly on 1 */
        const steps = (n: number, at: number, dur: number, write: (p: number) => void) => {
          const r = { p: 0 };
          let shown = -1; // redraw only when the step changes, not every frame
          tl.to(
            r,
            {
              p: 1,
              duration: dur,
              ease: stepped(n),
              onUpdate: () => {
                if (r.p === shown) return;
                shown = r.p;
                write(r.p);
              },
            },
            at,
          );
        };

        /** Pen readout: count from one rate to another in whole 0.1 steps */
        const countReadout = (from: number, to: number, at: number, dur: number, maxSteps: number) => {
          const unit = UNIT.rate;
          const [uf, ut] = [Math.round(from / unit), Math.round(to / unit)];
          const n = Math.max(1, Math.min(maxSteps, Math.abs(ut - uf)));
          steps(n, at, dur, (p) => (readout.textContent = formatReading(Math.round(uf + (ut - uf) * p) * unit, "rate")));
        };

        /** Summary value: count up from zero; the real text takes over on the last step */
        const countValue = (el: HTMLElement, at: number) => {
          const { val, roll } = parts(el);
          const kind = el.dataset.kind as ReadingKind;
          const suffix = el.dataset.suffix ?? "";
          const unit = UNIT[kind];
          const units = Math.round(Number(el.dataset.value) / unit);
          const n = Math.max(1, Math.min(COUNT_STEPS, Math.abs(units)));
          steps(n, at, COUNT_DUR, (p) => {
            const landed = p >= 1;
            roll.textContent = landed ? "" : formatReading(Math.round(units * p) * unit, kind) + suffix;
            val.style.opacity = landed ? "" : "0";
          });
        };

        // 1 — Year rule scribes; each label stamps on as the rule reaches it
        tl.to(axis, { scaleX: 1, duration: AXIS_DUR, ease: "none" }, 0);
        yearLabels.forEach((el, yr) => tl.set(el, { opacity: 1 }, (yr / years) * AXIS_DUR));

        // Each dot is a distance off its reading (px), drawn every frame along with
        // the segment that ends at it
        const off = dots.map(() => ({ y: 0 }));
        const render = () => {
          dots.forEach((dot, i) => {
            gsap.set(dot, { y: off[i].y });
            if (i > 0) segs[i - 1].setAttribute("y2", String(segEnd[i - 1].y2 + (off[i].y / H) * 100));
          });
        };

        const rates = dots.map((d) => Number(d.dataset.rate));
        const showSeg = (seg: SVGLineElement, at: number) => tl.call(() => (seg.style.visibility = "visible"), [], at);
        const labelOf = (dot: HTMLElement) => dot.querySelector<HTMLElement>('[data-dr="label"]');

        // 2 — The pen steps through the years (the last dot is the reset)
        const YEAR_DOTS = dots.length - 1;
        let landed = 0;
        for (let i = 0; i < YEAR_DOTS; i++) {
          const start = AXIS_DUR + i * YEAR_STEP;
          const fromZero = ((yPct(0) - yPct(rates[i])) / 100) * H; // zero line → reading, px
          off[i].y = fromZero;
          const dir = -Math.sign(fromZero) || -1; // rising is up the screen

          tl.set(cursor, { visibility: "visible", x: xPx(i) }, start)
            .set(dots[i], { visibility: "visible" }, start)
            .to(off[i], { y: dir * overshoot, duration: RISE, ease: RISE_EASE }, start)
            .to(off[i], { y: 0, duration: SETTLE, ease: "power2.inOut" }, start + RISE);
          if (i > 0) showSeg(segs[i - 1], start);
          countReadout(0, rates[i], start, YEAR_COUNT, YEAR_COUNT_STEPS);

          landed = start + YEAR_COUNT;
          const label = labelOf(dots[i]);
          if (label) tl.set(label, { opacity: 1 }, landed);
        }

        // 3 — Near the limit: the upper limit line holds solid
        tl.set(band, { borderTopStyle: "solid" }, landed);

        // 4 — The reset: the service rule scribes, then the reading drops back
        const scribeAt = landed + LIMIT_HOLD;
        tl.to(service5, { scaleY: 1, duration: SCRIBE, ease: "none" }, scribeAt);

        const dropAt = scribeAt + SCRIBE;
        const r = YEAR_DOTS; // the after-service reading
        off[r].y = ((yPct(rates[r - 1]) - yPct(rates[r])) / 100) * H; // starts on the +1.9 dot
        showSeg(segs[r - 1], dropAt);
        tl.set(dots[r], { visibility: "visible" }, dropAt)
          .to(off[r], { y: overshoot, duration: DROP, ease: DROP_EASE }, dropAt)
          .to(off[r], { y: 0, duration: DROP_SETTLE, ease: "power2.out" }, dropAt + DROP);
        countReadout(rates[r - 1], rates[r], dropAt, DROP + DROP_SETTLE, DROP_COUNT_STEPS);
        const resetAt = dropAt + DROP + DROP_SETTLE;
        tl.set(band, { borderTopStyle: "dashed" }, resetAt);
        const resetLabel = labelOf(dots[r]);
        if (resetLabel) tl.set(resetLabel, { opacity: 1 }, resetAt);

        // 5 — To today: the pen becomes the Today line, the future is scheduled
        const todayAt = resetAt + RESET_HOLD;
        tl.set(cursor, { x: xPx(today) }, todayAt)
          .set(cursor, { visibility: "hidden" }, todayAt)
          .set([todayLine, future], { visibility: "visible" }, todayAt);
        rings.forEach((ring, j) => {
          const at = todayAt + j * RING_STEP;
          tl.set(ring, { visibility: "visible", y: -RING_OFFSET }, at).set(ring, { y: 0 }, at + RING_STEP);
        });
        const lastClamp = todayAt + rings.length * RING_STEP;
        tl.to(service10, { scaleY: 1, duration: SCRIBE, ease: "none" }, lastClamp);

        // 6 — Summary counts and lands; Next check steps the months; sign-off
        totals.forEach((el) => countValue(el, todayAt));
        const nextAt = todayAt + COUNT_DUR + NEXT_GAP;
        const months = monthsBetween(next.dataset.from!, next.dataset.to!);
        const { val: nextVal, roll: nextRoll } = parts(next);
        const monthSteps = months.length - 1;
        steps(monthSteps, nextAt, monthSteps * MONTH_STEP, (p) => {
          const done = p >= 1;
          nextRoll.textContent = done ? "" : months[Math.round(p * monthSteps)];
          nextVal.style.opacity = done ? "" : "0";
        });
        const signoffAt = nextAt + monthSteps * MONTH_STEP;
        tl.to(tick, { scaleX: 1, duration: TICK_DUR, ease: "none" }, signoffAt);

        // Every frame of the run, holds included
        tl.eventCallback("onUpdate", render);
        // Before the first frame: dots at zero, segments collapsed onto them
        render();
        return tl;
      };

      // Leave the static markup exactly as React rendered it
      const clear = () => {
        const touched = [axis, service5, service10, ...dots, ...rings, future, todayLine, band, cursor, tick, ...yearLabels, ...labels, ...vals];
        gsap.set(touched, { clearProps: RUN_PROPS });
        restoreStatic();
        // Drop the empty style attributes clearing leaves on elements React rendered without one
        [...touched, ...segs].forEach((el) => el.getAttribute("style") === "" && el.removeAttribute("style"));
      };

      // A fresh /#service load, or a jump on its way from another page: the before
      // state from the first frame (the pre-paint marker held it until now), confirmed
      // or undone at the load-time decision
      let early = claimPrerun(chart);
      if (early) arm();
      const failsafe = early
        ? setTimeout(() => {
            if (!early) return;
            early = false;
            clear(); // the decision never came: never leave the chart blank
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

      const io = observeChart(() => run());

      // Decide after load + a frame, so a restored scroll position is already applied:
      // only a chart still ahead of the reader gets the before state (armAtLoad).
      let raf = 0;
      const decide = contextSafe!(() => {
        const wasEarly = early;
        early = false;
        clearTimeout(failsafe);
        try {
          const mode = reduced() ? null : armAtLoad(chart);
          if (!mode) {
            if (wasEarly) clear(); // jumped, but already past it: finished
            return;
          }
          if (!wasEarly) arm();
          io.observe(chart, mode === "jump");
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
        // clears what GSAP set; the segments and overlays are ours to restore
        restoreStatic();
      };
    },
    { scope: ref },
  );

  return (
    <span ref={ref} className={styles.cursor} data-dr="cursor" aria-hidden>
      <span ref={readoutRef} className={`mono ${styles.readout}`} />
    </span>
  );
}
