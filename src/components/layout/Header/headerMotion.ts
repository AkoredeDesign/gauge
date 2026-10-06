"use client";

import { useEffect, useRef, type RefObject } from "react";
import gsap from "gsap";
import { useGSAP } from "@gsap/react";
import { ZERO_SET_SIGNOFF } from "@/components/home/Hero/zeroSetScript";

gsap.registerPlugin(useGSAP);

/*
 * Header motion — "Index" (approved 2026-10-04). Same rules as Zero-set:
 * linear, stepped or damped; never a fade or slide. Hooks are data-hm attributes.
 *
 *   Marker  one ink bar on the bottom hairline reads the current section. On hover
 *           or focus it travels to the link, overshoots by OVERSHOOT px and settles;
 *           graduations show on the hairline under its travel, gone once it locks.
 *   Scribe  phone menu rows: each divider draws left to right, its number counts
 *           up from 00, the label snaps in as the line arrives. Closing is instant.
 *   Flip    the Menu ↔ Close label swaps in one hard step.
 *   Tie-in  on a home load that runs Zero-set, the marker appears off-zero on the
 *           sign-off tick and clamps in when the tick lands.
 */

const reduced = () => matchMedia("(prefers-reduced-motion: reduce)").matches;

// Marker
const BASE_W = 100; // .marker's CSS width; scaleX maps it onto a label's width
const ZERO_W = 16; // rest mark at the scale's zero, used where no link is current (home)
const OVERSHOOT = 2; // px past the target before settling
const TRAVEL = 0.19;
const SETTLE = 0.06;
const CLAMP_OFFSET = 8; // = Zero-set's REG_OFFSET: the marker clamps in like the registration marks
const CLAMP_DELAY = 0.1; // = Zero-set's sign-off tick, so the clamp lands as the tick finishes

// Scribe
const ROW_STAGGER = 0.05;
const ROW_DRAW = 0.12; // 3 rows: last line lands at 0.22s

// Flip
const FLIP_SCALE = 0.35; // the one in-between position, like a split-flap card mid-turn
const FLIP_DUR = 0.07;

const pad = (n: number) => String(n).padStart(2, "0");

/** Index marker. Re-reads the current section whenever `pathname` changes. */
export function useIndexMarker(header: RefObject<HTMLElement | null>, pathname: string) {
  const rest = useRef<(animate: boolean) => void>(null);

  useGSAP(
    () => {
      const root = header.current!;
      const q = gsap.utils.selector(root);
      const [marker] = q('[data-hm="marker"]') as HTMLElement[];
      const [scale] = q('[data-hm="scale"]') as HTMLElement[];
      const [bar] = q('[data-hm="bar"]') as HTMLElement[];
      const [zero] = q('[data-hm="zero"]') as HTMLElement[];

      const current = () => root.querySelector<HTMLElement>('[data-mark][aria-current="page"]');
      let target = current();
      let tl: gsap.core.Timeline | null = null;

      /** Marker geometry for `el` in header coordinates; null = zero */
      const measure = (el: HTMLElement | null) => {
        const h = root.getBoundingClientRect();
        if (!el) return { x: zero.getBoundingClientRect().left - h.left, w: ZERO_W, hw: h.width };
        const r = el.getBoundingClientRect();
        return { x: r.left - h.left, w: r.width, hw: h.width };
      };

      const moveTo = (el: HTMLElement | null, animate: boolean) => {
        target = el;
        const { x, w, hw } = measure(el);
        tl?.kill();
        if (!animate || reduced()) {
          gsap.set(marker, { x, scaleX: w / BASE_W });
          gsap.set(scale, { visibility: "hidden" });
          return;
        }
        const cx = gsap.getProperty(marker, "x") as number;
        const cw = (gsap.getProperty(marker, "scaleX") as number) * BASE_W;
        if (Math.abs(cx - x) < 0.5 && Math.abs(cw - w) < 0.5) return;

        const over = Math.abs(x - cx) > OVERSHOOT * 2 ? Math.sign(x - cx) * OVERSHOOT : 0;
        const left = Math.min(cx, x);
        const right = Math.max(cx + cw, x + w);
        tl = gsap
          .timeline()
          // Graduations under the stretch being measured, only while it moves
          .set(scale, { visibility: "visible", clipPath: `inset(0 ${hw - right}px 0 ${left}px)` })
          .to(marker, { x: x + over, scaleX: w / BASE_W, duration: TRAVEL, ease: "power3.out" })
          .to(marker, { x, duration: SETTLE, ease: "power2.inOut" })
          .set(scale, { visibility: "hidden" });
      };

      rest.current = (animate) => moveTo(current(), animate);
      const goRest = () => current() !== target && moveTo(current(), true);

      // Hover and keyboard focus both read a link; leaving the nav returns to the current section
      const onOver = (e: Event) => {
        const t = e.target as HTMLElement;
        const mark = t.closest<HTMLElement>("[data-mark]");
        if (mark) return void (mark !== target && moveTo(mark, true));
        if (!t.closest("[data-track]")) goRest(); // gaps between links keep the reading
      };
      const onFocusOut = (e: FocusEvent) => {
        if (!(e.relatedTarget as HTMLElement | null)?.closest?.("[data-mark]")) goRest();
      };
      bar.addEventListener("pointerover", onOver);
      bar.addEventListener("focusin", onOver);
      bar.addEventListener("pointerleave", goRest);
      bar.addEventListener("focusout", onFocusOut);

      // Layout or font changes move the labels: follow without animating
      const ro = new ResizeObserver(() => moveTo(target, false));
      ro.observe(bar);
      document.fonts?.ready.then(() => moveTo(target, false));

      moveTo(target, false);

      // Zero-set tie-in. Hidden (CSS) while the hero calibrates; appears off-zero on
      // the sign-off tick, clamps in as it lands. If Zero-set never claims its flag,
      // the flag is dropped and the marker simply appears.
      const html = document.documentElement;
      let revealed = false;
      const reveal = (clamp: boolean) => {
        if (revealed) return;
        revealed = true;
        if (!clamp || reduced()) return void gsap.set(marker, { visibility: "visible" });
        const { x } = measure(target);
        gsap.set(marker, { visibility: "visible", x: x - CLAMP_OFFSET });
        gsap.delayedCall(CLAMP_DELAY, () => moveTo(target, false));
      };
      const onSignoff = () => reveal(true);
      const mo = new MutationObserver(() => html.dataset.zeroset === undefined && reveal(false));
      if (html.dataset.zeroset !== undefined) {
        window.addEventListener(ZERO_SET_SIGNOFF, onSignoff);
        mo.observe(html, { attributes: true, attributeFilter: ["data-zeroset"] });
      } else {
        reveal(false);
      }

      return () => {
        bar.removeEventListener("pointerover", onOver);
        bar.removeEventListener("focusin", onOver);
        bar.removeEventListener("pointerleave", goRest);
        bar.removeEventListener("focusout", onFocusOut);
        window.removeEventListener(ZERO_SET_SIGNOFF, onSignoff);
        ro.disconnect();
        mo.disconnect();
        rest.current = null;
      };
    },
    { scope: header },
  );

  // A route change moves the reading to the new section
  useEffect(() => rest.current?.(true), [pathname]);
}

/** Scribe sequence for the phone menu; runs each time it opens. */
export function useScribe(menu: RefObject<HTMLElement | null>, open: boolean) {
  useGSAP(
    () => {
      if (!open || reduced()) return;
      const rows = gsap.utils.toArray<HTMLElement>("[data-scribe-row]", menu.current);
      const nums: HTMLElement[] = [];
      const tl = gsap.timeline();

      rows.forEach((row, i) => {
        const [rule, num, label] = ["rule", "num", "label"].map(
          (k) => row.querySelector<HTMLElement>(`[data-scribe="${k}"]`)!,
        );
        nums.push(num);
        const final = i + 1;
        const at = i * ROW_STAGGER;
        const p = { n: 0 };

        // Runs in a layout effect, so this pre-state lands before the menu's first paint
        gsap.set(rule, { scaleX: 0, transformOrigin: "0 50%" });
        gsap.set([num, label], { visibility: "hidden" });
        num.textContent = pad(0);

        tl.set(num, { visibility: "visible" }, at)
          .to(rule, { scaleX: 1, duration: ROW_DRAW, ease: "none" }, at)
          .to(p, { n: final, duration: ROW_DRAW, ease: `steps(${final})`, onUpdate: () => void (num.textContent = pad(Math.round(p.n))) }, at)
          .set(label, { visibility: "visible" }, at + ROW_DRAW);
      });

      // Closed mid-sequence: revert (below) clears the styles; put the numbers back
      return () => nums.forEach((n, i) => (n.textContent = pad(i + 1)));
    },
    { scope: menu, dependencies: [open], revertOnUpdate: true },
  );
}

/**
 * One-step flip of the Menu ↔ Close label, only when it actually changes.
 * Too short for a tween: GSAP starts it from its last tick, which ate a third of
 * the hold. Instead the mid-turn state is held for FLIP_DUR from its first
 * painted frame, so it is always seen for the full step.
 */
export function useFlip(label: RefObject<HTMLElement | null>, open: boolean) {
  const prev = useRef(open); // not a first-render flag: StrictMode re-runs mount effects
  useGSAP(
    () => {
      if (prev.current === open) return;
      prev.current = open;
      const el = label.current;
      if (!el || reduced()) return;

      gsap.set(el, { scaleY: FLIP_SCALE }); // layout effect: lands with the new label's first paint
      let raf = 0;
      let shownAt = 0;
      const frame = (now: number) => {
        shownAt ||= now;
        if (now - shownAt >= FLIP_DUR * 1000) return void gsap.set(el, { scaleY: 1 });
        raf = requestAnimationFrame(frame);
      };
      raf = requestAnimationFrame(frame);
      return () => {
        cancelAnimationFrame(raf);
        gsap.set(el, { scaleY: 1 });
      };
    },
    // Re-toggled mid-flip: end the old hold before the new one starts
    { dependencies: [open], revertOnUpdate: true },
  );
}
