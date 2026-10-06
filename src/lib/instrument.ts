import type gsap from "gsap";
import { onJump, peekJump, takeJump } from "./jump";

/*
 * Shared pieces of the instrument motion language (Zero-set and the scroll-started runs).
 */

/** "X 000.00" — the sign takes the space slot so the width never changes */
export function formatReadout(axis: string, v: number) {
  const r = Math.round(v * 100) / 100;
  const sign = r < 0 ? "−" : " ";
  return `${axis}${sign}${Math.abs(r).toFixed(2).padStart(6, "0")}`;
}

/** Same string with every digit randomised — one frame of a rolling value */
export function scramble(value: string) {
  return value.replace(/\d/g, () => String(Math.floor(Math.random() * 10)));
}

/** CSS px → mm (CSS defines 96px = 1in = 25.4mm) */
export const pxToMm = (px: number) => (px * 25.4) / 96;

// Frame pacing for driveTimeline
const SMOOTH_FRAME_MS = 34; // a frame at least ~30fps counts as smooth
const SMOOTH_FRAMES = 3; // consecutive smooth frames before starting
const MAX_WAIT_MS = 1500; // start anyway after this; the step cap still prevents skipping
const MAX_STEP_MS = 34; // most timeline time one painted frame may advance

/**
 * Plays a paused timeline from the frame loop instead of GSAP's wall-clock
 * ticker: waits until frames are flowing, then advances at most one capped step
 * per painted frame. A main-thread stall slows the sequence; it can never skip
 * it (on GSAP's ticker Zero-set finished during the hydration stall, unseen).
 * Short holds are timed from the first frame they are painted on, so they are
 * always seen for their full length. Returns a cancel function.
 */
export function driveTimeline(tl: gsap.core.Timeline) {
  let raf = 0;
  let last = 0;
  let smooth = 0;
  let running = false;
  const armedAt = performance.now();
  const frame = (now: number) => {
    const dt = last ? now - last : Infinity;
    last = now;
    if (running) {
      tl.totalTime(tl.totalTime() + Math.min(dt, MAX_STEP_MS) / 1000, false);
    } else {
      smooth = dt < SMOOTH_FRAME_MS ? smooth + 1 : 0;
      running = smooth >= SMOOTH_FRAMES || now - armedAt > MAX_WAIT_MS;
    }
    if (tl.progress() < 1) raf = requestAnimationFrame(frame);
  };
  raf = requestAnimationFrame(frame);
  return () => cancelAnimationFrame(raf);
}

// Trigger for scroll-started runs (Inspection pass, Five-position run, Drift and reset)
const TALL_VISIBLE = 0.6; // share of a chart that must show when it can't fit below the header

const headerHeight = () => Math.ceil(document.querySelector("header")?.getBoundingClientRect().height ?? 0);
const sectionOf = (chart: Element) => chart.closest("section[id]")?.id ?? null;

/**
 * Watches charts and calls `onEnter` once per chart when it is fully in view below
 * the fixed header, or, if the chart is taller than that space (short viewports),
 * when about 60% of it shows. The strip under the header counts as out of view, so
 * a chart parked there never starts unseen.
 *
 * A chart whose section was jumped to (header, footer or hash link, or arriving on
 * /#section; see jump.ts) starts sooner:
 *   desktop  as soon as any of it shows below the header, or comes within JUMP_FOLD
 *            of the bottom edge
 *   phone    on landing, if about 60% of it is on screen below the header (the
 *            tall-chart fallback). If less shows, the jump doesn't arm it: it waits
 *            for the ordinary rule above, like any chart still ahead of the reader.
 *
 * Each chart is unobserved once it fires; the caller observes charts and
 * disconnects on unmount.
 */
const JUMP_FOLD = 40; // desktop: px below the fold that still counts as in view after a jump
const PHONE = "(max-width: 860px)"; // = the single-column breakpoint (globals.css, section modules)
const LANDED_FRAMES = 8; // frames without scroll movement that count as landed
const LANDING_MAX_MS = 2000; // decide anyway after this

const isPhone = () => matchMedia(PHONE).matches;

/** Share of the chart on screen below the header (0–1) */
function visibleShare(chart: Element) {
  const r = chart.getBoundingClientRect();
  const shown = Math.min(r.bottom, window.innerHeight) - Math.max(r.top, headerHeight());
  return r.height > 0 ? Math.max(0, shown) / r.height : 0;
}
const mostlyShown = (chart: Element) => visibleShare(chart) >= TALL_VISIBLE - 0.01;

/** Calls `fn` once the page has stopped scrolling (a jump has landed). Returns a cancel. */
function afterLanding(fn: () => void) {
  let raf = 0;
  let lastY = NaN;
  let still = 0;
  const start = performance.now();
  const frame = (now: number) => {
    still = window.scrollY === lastY ? still + 1 : 0;
    lastY = window.scrollY;
    if (still >= LANDED_FRAMES || now - start > LANDING_MAX_MS) fn();
    else raf = requestAnimationFrame(frame);
  };
  raf = requestAnimationFrame(frame);
  return () => cancelAnimationFrame(raf);
}

export function observeChart(onEnter: (chart: Element) => void) {
  const headerH = headerHeight();
  const fire = (chart: Element) => {
    unobserve(chart);
    onEnter(chart);
  };

  // Ordinary scrolling: the whole chart (or ~60% of a tall one) below the header
  const scrollIO = new IntersectionObserver(
    (entries) => {
      const space = window.innerHeight - headerH;
      for (const e of entries) {
        if (!e.isIntersecting) continue;
        const h = e.boundingClientRect.height;
        const need = h <= space ? h : h * TALL_VISIBLE;
        if (e.intersectionRect.height >= need - 1) fire(e.target);
      }
    },
    { rootMargin: `-${headerH}px 0px 0px 0px`, threshold: Array.from({ length: 21 }, (_, i) => i / 20) },
  );
  // After a jump: any of the chart, with the view extended past the fold
  const jumpIO = new IntersectionObserver(
    (entries) => entries.forEach((e) => e.isIntersecting && fire(e.target)),
    { rootMargin: `-${headerH}px 0px ${JUMP_FOLD}px 0px`, threshold: 0 },
  );

  const watching = new Set<Element>();
  const observe = (chart: Element, jump = false) => {
    watching.add(chart);
    (jump ? jumpIO : scrollIO).observe(chart);
  };
  const unobserve = (chart: Element) => {
    watching.delete(chart);
    scrollIO.unobserve(chart);
    jumpIO.unobserve(chart);
  };

  // A jump while the page is open: a chart still waiting moves to the jump rule
  // (a new observation reports its current state, in case it already shows).
  // Phone: it sits out the flight, then on landing starts if ~60% of it shows, or
  // goes back to the ordinary rule.
  const landings = new Set<() => void>();
  const offJump = onJump((id) => {
    for (const chart of watching) {
      if (sectionOf(chart) !== id) continue;
      scrollIO.unobserve(chart);
      jumpIO.unobserve(chart);
      if (!isPhone()) {
        jumpIO.observe(chart);
        continue;
      }
      const cancel = afterLanding(() => {
        landings.delete(cancel);
        if (!watching.has(chart)) return;
        if (mostlyShown(chart)) fire(chart);
        else scrollIO.observe(chart);
      });
      landings.add(cancel);
    }
  });

  return {
    observe,
    unobserve,
    disconnect() {
      offJump();
      landings.forEach((cancel) => cancel());
      landings.clear();
      scrollIO.disconnect();
      jumpIO.disconnect();
      watching.clear();
    },
  };
}

/**
 * On mount: should this chart be in its "before" state from the first frame? True when
 * the pre-paint script marked its section (a fresh /#id load; see prerunScript.ts) or a
 * jump to it is on its way from another page (client navigation). Claims the marker;
 * the caller applies the before state inline in the same frame, then confirms or
 * undoes it at the load-time decision (armAtLoad).
 */
export function claimPrerun(chart: Element) {
  const id = sectionOf(chart);
  const root = document.documentElement;
  const marked = !!id && root.dataset.prerun === id;
  if (marked) delete root.dataset.prerun;
  if (!id || matchMedia("(prefers-reduced-motion: reduce)").matches) return false;
  return marked || peekJump(id);
}

/**
 * The load-time decision for a scroll-started run, made after load + a frame so a
 * restored scroll position (or a hash landing) is already applied:
 *   "jump"   the section was jumped to and its chart isn't above the view: arm, and
 *            start as soon as any of the chart shows (desktop), or right away on a
 *            phone, where it is only returned once ~60% of the chart is on screen
 *   "scroll" the chart is still ahead (below the fold, or a phone jump that landed
 *            with less than ~60% showing): arm, and start on the full-chart rule
 *   null     the reader is already at or past it (incl. a reload while scrolled
 *            past): render finished
 */
export function armAtLoad(chart: Element): "jump" | "scroll" | null {
  const r = chart.getBoundingClientRect();
  const id = sectionOf(chart);
  if (id && takeJump(id)) {
    if (r.bottom <= headerHeight()) return null;
    if (!isPhone()) return "jump";
    return mostlyShown(chart) ? "jump" : "scroll";
  }
  return r.top >= window.innerHeight ? "scroll" : null;
}
