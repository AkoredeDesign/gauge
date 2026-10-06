"use client";

import { useRef, type ReactNode } from "react";
import gsap from "gsap";
import { useGSAP } from "@gsap/react";
import { driveTimeline, formatReadout, observeChart, pxToMm, scramble } from "@/lib/instrument";
import styles from "./Range.module.css";

gsap.registerPlugin(useGSAP);

/*
 * "Inspection pass" (approved 2026-10-04). One probe measures the sheets; the
 * measured data reads off as it crosses, then every Rate value signs off on the
 * same frame — "One tolerance." Same rules as Zero-set: linear, stepped or
 * damped; never a fade or slide. Hooks are data-ip attributes in Range.tsx.
 *
 *   0.00  probe snaps on at the first sheet's left edge, readout at X 000.00
 *   0.08  probe travels to the last sheet's right edge (damped, 2px overshoot,
 *         settles); the readout counts the distance in real CSS millimetres
 *         As it crosses each sheet: the sheet strip stamps in, the corner marks
 *         appear off-position and clamp in at the sheet's centre, and each
 *         title-block value rolls and locks as the probe reaches its cell
 *   0.70  sign-off: a tick draws under every ±2 s/day at once; probe off
 *
 * Phone (one column): each sheet gets its own shorter pass as it comes into view.
 * Runs once per page view, when the title block is fully in view below the header
 * (observeChart: about 60% of it if it can't fit). The "before"
 * state is applied only to sheets still below the fold once the page has loaded
 * (after any scroll restoration); anything already seen renders finished.
 * Reduced motion: never armed — final state only.
 */

const PHONE = "(max-width: 860px)"; // = the single-column breakpoint in Range.module.css
const reduced = () => matchMedia("(prefers-reduced-motion: reduce)").matches;

// Pass
const PROBE_IN = 0.08; // probe holds at zero before it travels
const TRAVEL = { grid: 0.56, sheet: 0.3 };
const TRAVEL_EASE = "power2.out";
const SETTLE = 0.06;
const OVERSHOOT = 2; // px past the end before settling (= header marker)
const READ_AT = 8; // px past an element's left edge at which the probe reads it
const READOUT_GAP = 6; // px between the probe and its readout

// Read-off details — same values as Zero-set
const REG_OFFSET = 8;
const ROLL_STEPS = 3;
const ROLL_DUR = 0.11;
const TICK_DUR = 0.1;

// Hover marker — same values as the header's index marker
const BASE_W = 100;
const HOVER_TRAVEL = 0.19;
const HOVER_SETTLE = 0.06;

type Parts = {
  stamps: HTMLElement[];
  corners: HTMLElement[];
  rolls: HTMLElement[];
  ticks: HTMLElement[];
};

export default function Inspection({ children }: { children: ReactNode }) {
  const ref = useRef<HTMLDivElement>(null);

  useGSAP(
    (_, contextSafe) => {
      const wrap = ref.current!;
      const q = <T extends HTMLElement = HTMLElement>(root: ParentNode, s: string) =>
        Array.from(root.querySelectorAll<T>(s));
      const sheets = q(wrap, '[data-ip="sheet"]');
      const probe = wrap.querySelector<HTMLElement>('[data-ip="probe"]')!;
      const readout = wrap.querySelector<HTMLElement>('[data-ip="readout"]')!;

      const parts = new Map<HTMLElement, Parts>(
        sheets.map((s) => [
          s,
          {
            stamps: q(s, '[data-ip="stamp"]'),
            corners: q(s, "[data-corner]"),
            rolls: q(s, '[data-ip="roll"]'),
            ticks: q(s, '[data-ip="tick"]'),
          },
        ]),
      );
      const finals = new Map(sheets.flatMap((s) => parts.get(s)!.rolls.map((el) => [el, el.textContent ?? ""])));
      const all = (list: HTMLElement[], k: keyof Parts) => list.flatMap((s) => parts.get(s)![k]);

      // ---- Before state ------------------------------------------------------
      const armed = new Set<HTMLElement>();
      const arm = (sheet: HTMLElement) => {
        const p = parts.get(sheet)!;
        gsap.set([...p.stamps, ...p.rolls], { visibility: "hidden" });
        gsap.set(p.corners, {
          visibility: "hidden",
          x: (_, el: HTMLElement) => (el.dataset.pos!.includes("l") ? -REG_OFFSET : REG_OFFSET),
          y: (_, el: HTMLElement) => (el.dataset.pos!.includes("t") ? -REG_OFFSET : REG_OFFSET),
        });
        gsap.set(p.ticks, { scaleX: 0, transformOrigin: "0 50%" });
        armed.add(sheet);
      };

      // ---- The pass ----------------------------------------------------------
      const ease = gsap.parseEase(TRAVEL_EASE);

      const buildPass = (group: HTMLElement[], travel: number) => {
        const w = wrap.getBoundingClientRect();
        const first = group[0].getBoundingClientRect();
        const last = group[group.length - 1].getBoundingClientRect();
        const x0 = first.left - w.left;
        const x1 = last.right - w.left;
        const end = x1 + OVERSHOOT;
        const limit = document.documentElement.clientWidth - w.left; // readout must not leave the page
        const travelStart = PROBE_IN;
        const settleAt = travelStart + travel;
        const signoffAt = settleAt + SETTLE;

        /** When the probe's travel reaches x (inverts the ease) */
        const timeAt = (x: number) => {
          const y = gsap.utils.clamp(0, 1, (x - x0) / (end - x0));
          let lo = 0;
          let hi = 1;
          for (let i = 0; i < 24; i++) {
            const mid = (lo + hi) / 2;
            if (ease(mid) < y) lo = mid;
            else hi = mid;
          }
          return travelStart + hi * travel;
        };
        const rel = (el: HTMLElement) => {
          const r = el.getBoundingClientRect();
          return { left: r.left - w.left, center: r.left - w.left + r.width / 2 };
        };

        const tl = gsap.timeline({ paused: true });

        // Probe: full height of the sheets, readout riding on top
        const probeState = { x: x0 };
        gsap.set(readout, { y: 0 });
        const ro = readout.getBoundingClientRect();
        const rw = ro.width || 64;
        const lift = probe.getBoundingClientRect().top - ro.top; // readout sits this far above the probe's top
        const probeY = first.top - w.top;
        // A sheet can be taller than the view under the fixed header (1440×900): the
        // probe's top is then hidden, so the readout holds just below the header
        const headerBottom = document.querySelector("header")?.getBoundingClientRect().bottom ?? 0;
        const minReadoutTop = headerBottom + READOUT_GAP;
        const renderProbe = () => {
          const x = probeState.x;
          gsap.set(probe, { x });
          readout.textContent = formatReadout("X", pxToMm(x - x0));
          // Near the page edge the readout flips to the line's left side, in one step
          const right = x + READOUT_GAP + rw <= limit;
          const readoutTop = wrap.getBoundingClientRect().top + probeY - lift;
          const drop = gsap.utils.clamp(0, first.height - ro.height, minReadoutTop - readoutTop);
          gsap.set(readout, { x: right ? READOUT_GAP : -READOUT_GAP - rw, y: drop });
        };
        // Every frame of the pass, holds included: the page may be scrolling under it
        tl.eventCallback("onUpdate", renderProbe);
        tl.set(probe, { visibility: "visible", y: probeY, height: first.height }, 0)
          .to(probeState, { x: end, duration: travel, ease: TRAVEL_EASE }, travelStart)
          .to(probeState, { x: x1, duration: SETTLE, ease: "power2.inOut" }, settleAt);

        group.forEach((sheet) => {
          const p = parts.get(sheet)!;
          const s = rel(sheet);

          // Sheet strip stamps in as the probe enters the sheet
          tl.set(p.stamps, { visibility: "visible" }, timeAt(s.left + READ_AT));

          // Corner marks: present off-position on entry, clamp in one step at the centre
          tl.set(p.corners, { visibility: "visible" }, timeAt(s.left + READ_AT)).set(
            p.corners,
            { x: 0, y: 0 },
            timeAt(s.center),
          );

          // Each value rolls when the probe reaches its cell, then locks
          p.rolls.forEach((el) => {
            const final = finals.get(el)!;
            const at = timeAt(rel(el).left + READ_AT);
            const r = { t: 0 };
            let shown = 0; // re-scramble only when the stepped value changes, not every frame
            tl.call(() => void (el.textContent = scramble(final)), undefined, at)
              .set(el, { visibility: "visible" }, at)
              .to(
                r,
                {
                  t: 1,
                  duration: ROLL_DUR,
                  ease: `steps(${ROLL_STEPS})`,
                  onUpdate: () => {
                    if (r.t === shown) return;
                    shown = r.t;
                    el.textContent = r.t < 1 ? scramble(final) : final;
                  },
                },
                at,
              );
          });
        });

        // Sign-off: every tolerance value at once, then the probe goes in one step
        tl.to(all(group, "ticks"), { scaleX: 1, duration: TICK_DUR, ease: "none" }, signoffAt).set(
          probe,
          { visibility: "hidden" },
          signoffAt + TICK_DUR,
        );

        return tl;
      };

      // One pass at a time; a sheet that comes into view mid-pass waits its turn
      const queue: HTMLElement[][] = [];
      let cancel: (() => void) | null = null;
      const next = contextSafe!(() => {
        const group = queue.shift();
        if (!group) return void (cancel = null);
        const tl = buildPass(group, group.length > 1 ? TRAVEL.grid : TRAVEL.sheet);
        tl.eventCallback("onComplete", () => {
          gsap.set([...all(group, "stamps"), ...all(group, "corners"), ...all(group, "rolls"), ...all(group, "ticks")], {
            clearProps: "all",
          });
          next();
        });
        cancel = driveTimeline(tl);
      });

      // The title block, where the values read off, is the chart
      const io = observeChart((block) => {
        const sheet = block.closest<HTMLElement>('[data-ip="sheet"]')!;
        if (!armed.has(sheet)) return;
        // Desktop: one pass over every armed sheet. Phone: just this one.
        const group = matchMedia(PHONE).matches ? [sheet] : sheets.filter((s) => armed.has(s));
        group.forEach((s) => {
          armed.delete(s);
          io.unobserve(s.querySelector("dl")!);
        });
        queue.push(group);
        if (!cancel) next();
      });

      // Decide after load + a frame, so a restored scroll position is already applied:
      // only sheets still below the fold get the before state.
      let raf = 0;
      const decide = contextSafe!(() => {
        if (reduced()) return;
        for (const s of sheets) {
          if (s.getBoundingClientRect().top >= window.innerHeight) {
            arm(s);
            io.observe(s.querySelector("dl")!);
          }
        }
      });
      const afterLoad = () => (raf = requestAnimationFrame(() => (raf = requestAnimationFrame(decide))));
      if (document.readyState === "complete") afterLoad();
      else window.addEventListener("load", afterLoad, { once: true });

      // ---- Hover marker ------------------------------------------------------
      const hovers = sheets.map((sheet) => {
        const marker = sheet.querySelector<HTMLElement>('[data-ip="marker"]')!;
        const view = sheet.querySelector<HTMLElement>('[data-ip="view"]')!;
        const foot = marker.parentElement!;
        let tl: gsap.core.Timeline | null = null;

        const show = contextSafe!(() => {
          if (tl || marker.style.visibility === "visible") return;
          const f = foot.getBoundingClientRect();
          const v = view.getBoundingClientRect();
          const x = v.left - f.left;
          const scaleX = v.width / BASE_W;
          if (reduced()) return void gsap.set(marker, { visibility: "visible", x, scaleX });
          // Steps along the rule from the sheet's left edge to the label, overshoots, settles
          gsap.set(marker, { visibility: "visible", x: 0, scaleX });
          tl = gsap
            .timeline({ onComplete: () => void (tl = null) })
            .to(marker, { x: x + OVERSHOOT, duration: HOVER_TRAVEL, ease: "power3.out" })
            .to(marker, { x, duration: HOVER_SETTLE, ease: "power2.inOut" });
        });
        // Exits are instant
        const hide = contextSafe!(() => {
          if (sheet.querySelector(":focus-visible")) return;
          tl?.kill();
          tl = null;
          gsap.set(marker, { visibility: "hidden" });
        });
        const onEnter = (e: PointerEvent) => e.pointerType === "mouse" && show();
        const onFocusOut = (e: FocusEvent) => !sheet.contains(e.relatedTarget as Node) && requestAnimationFrame(hide);
        const onFocusIn = () => sheet.querySelector(":focus-visible") && show();

        sheet.addEventListener("pointerenter", onEnter);
        sheet.addEventListener("pointerleave", hide);
        sheet.addEventListener("focusin", onFocusIn);
        sheet.addEventListener("focusout", onFocusOut);
        return () => {
          sheet.removeEventListener("pointerenter", onEnter);
          sheet.removeEventListener("pointerleave", hide);
          sheet.removeEventListener("focusin", onFocusIn);
          sheet.removeEventListener("focusout", onFocusOut);
        };
      });

      return () => {
        window.removeEventListener("load", afterLoad);
        cancelAnimationFrame(raf);
        cancel?.();
        io.disconnect();
        hovers.forEach((off) => off());
        // Unmounted mid-pass (incl. StrictMode's dev double-mount): put the values back;
        // the context revert clears the inline styles, and the next mount decides afresh
        finals.forEach((v, el) => (el.textContent = v));
        readout.textContent = formatReadout("X", 0);
      };
    },
    { scope: ref },
  );

  return (
    <div ref={ref} className={styles.inspect}>
      {children}
      <div className={styles.probe} data-ip="probe" aria-hidden>
        <span className={`mono ${styles.readout}`} data-ip="readout">
          {formatReadout("X", 0)}
        </span>
      </div>
    </div>
  );
}
