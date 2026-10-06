"use client";

import { useRef, type ComponentPropsWithoutRef } from "react";
import gsap from "gsap";
import { useGSAP } from "@gsap/react";
import { driveTimeline, formatReadout, scramble } from "@/lib/instrument";
import { ZERO_SET_KEY, ZERO_SET_SIGNOFF } from "./zeroSetScript";

gsap.registerPlugin(useGSAP);

/*
 * "Zero-set" — the hero calibrates itself once per session (~1.5s).
 * Only instrument details move; headline, copy and CTAs are static from frame one.
 * Motion is linear, stepped or damped — never a fade or slide.
 *
 *   0.00  scribe line draws across the eyebrow (linear, hard stop)
 *   0.20  X/Y readout counts down, overshoots past zero, settles at 000.00
 *   0.70  registration marks appear off-position, 0.85 clamp in (one step)
 *   0.90  spec values roll and lock left to right; ±2 s/day signs off with a tick
 *         (fires ZERO_SET_SIGNOFF: the header's index marker clamps in with it)
 *
 * Hooks are data-zs attributes in Hero.tsx; pre-paint state is in Hero.module.css.
 */

// Readout start / overshoot values, per axis
const READOUT = {
  x: { from: 12.47, overshoot: -0.06 },
  y: { from: -3.81, overshoot: 0.04 },
};

const REG_OFFSET = 8; // px each mark starts outside its corner
const ROLL_STEPS = 3; // digit changes before a spec value locks
const ROLL_DUR = 0.11;
const ROLL_STAGGER = 0.11; // = ROLL_DUR: each cell locks before the next starts

export default function ZeroSet({ children, ...props }: ComponentPropsWithoutRef<"section">) {
  const ref = useRef<HTMLElement>(null);

  useGSAP(
    () => {
      const root = document.documentElement;
      // Set before paint only when this should play (see zeroSetScript)
      if (root.dataset.zeroset !== "pending") return;

      const q = gsap.utils.selector(ref);
      const rule = q('[data-zs="rule"]');
      const readouts = q("[data-zs-axis]");
      const marks = q("[data-zs-reg]");
      const rolls = q('[data-zs="roll"]');
      const tick = q('[data-zs="tick"]');
      const finals = rolls.map((el) => el.textContent ?? "");

      // Mirror the CSS pending state inline, then take over from it
      gsap.set(rule, { scaleX: 0, transformOrigin: "0 50%" });
      gsap.set(marks, {
        visibility: "hidden",
        x: (_, el: HTMLElement) => (el.dataset.zsReg!.includes("l") ? -REG_OFFSET : REG_OFFSET),
        y: (_, el: HTMLElement) => (el.dataset.zsReg!.includes("t") ? -REG_OFFSET : REG_OFFSET),
      });
      gsap.set(rolls, { visibility: "hidden" });
      gsap.set(tick, { scaleX: 0, transformOrigin: "0 50%" });

      const readoutState = readouts.map((el) => {
        const axis = el.dataset.zsAxis as "x" | "y";
        const label = axis.toUpperCase();
        const s = { v: READOUT[axis].from };
        const render = () => (el.textContent = formatReadout(label, s.v));
        render();
        return { s, render, overshoot: READOUT[axis].overshoot };
      });

      root.dataset.zeroset = "running";
      try {
        sessionStorage.setItem(ZERO_SET_KEY, "1");
      } catch {}

      // Paused: driven by the frame loop below, not GSAP's wall-clock ticker
      const tl = gsap.timeline({
        paused: true,
        onComplete: () => {
          gsap.set([rule, marks, rolls, tick], { clearProps: "all" });
          delete root.dataset.zeroset;
        },
      });

      // 1 — Scribe line: constant speed, hard stop
      tl.to(rule, { scaleX: 1, duration: 0.3, ease: "none" }, 0);

      // 2 — Readout zeroes: run past zero, then settle back onto it
      readoutState.forEach(({ s, render, overshoot }) => {
        tl.to(s, { v: overshoot, duration: 0.55, ease: "power3.out", onUpdate: render }, 0.2)
          .to(s, { v: 0, duration: 0.15, ease: "power2.inOut", onUpdate: render }, 0.75);
      });

      // 3 — Registration marks: present off-position, then clamp in one step
      tl.set(marks, { visibility: "visible" }, 0.7).set(marks, { x: 0, y: 0 }, 0.85);

      // 4 — Specs read left to right; each value rolls then locks
      rolls.forEach((el, i) => {
        const final = finals[i];
        const p = { t: 0 };
        let shown = 0; // re-scramble only when the stepped value changes, not every frame
        tl.call(() => void (el.textContent = scramble(final)), undefined, 0.9 + i * ROLL_STAGGER)
          .set(el, { visibility: "visible" }, "<")
          .to(
            p,
            {
              t: 1,
              duration: ROLL_DUR,
              ease: `steps(${ROLL_STEPS})`,
              onUpdate: () => {
                if (p.t === shown) return;
                shown = p.t;
                el.textContent = p.t < 1 ? scramble(final) : final;
              },
            },
            ">",
          );
      });

      // Sign-off tick under the tolerance value, drawn like the scribe line.
      // The header's index marker clamps in on the same tick.
      tl.call(() => void window.dispatchEvent(new Event(ZERO_SET_SIGNOFF)), undefined, ">")
        .to(tick, { scaleX: 1, duration: 0.1, ease: "none" }, "<");

      // Hydration stalls the main thread right as this mounts, so the timeline
      // is played from the frame loop (driveTimeline), never GSAP's ticker.
      const debug = process.env.NODE_ENV === "development" && location.search.includes("zeroset=debug");
      if (process.env.NODE_ENV === "development") Object.assign(window, { __zeroSet: tl });

      // Dev only: /?zeroset=debug holds at 0; scrub via window.__zeroSet.seek(t, false)
      const cancel = debug ? () => {} : driveTimeline(tl);

      return () => {
        cancel();
        // Unmounted mid-run (incl. StrictMode's dev double-mount): re-arm so the
        // next mount plays from the start instead of leaving elements hidden
        if (tl.progress() < 1) {
          rolls.forEach((el, i) => (el.textContent = finals[i]));
          readoutState.forEach(({ s, render }) => ((s.v = 0), render()));
          root.dataset.zeroset = "pending";
        }
      };
    },
    { scope: ref },
  );

  return (
    <section ref={ref} {...props}>
      {children}
    </section>
  );
}
