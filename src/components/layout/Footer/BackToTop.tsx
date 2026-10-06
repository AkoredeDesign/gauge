"use client";

import type { KeyboardEvent, MouseEvent, ReactNode } from "react";

// Native smooth scroll takes up to ~1.4s on the home page at phone width, so the
// glide is driven here at a fixed length, whatever the distance
const DURATION = 700;
const easeOut = (t: number) => 1 - (1 - t) ** 3;

// Any of these from the reader hands the scroll back to them
const INTERRUPTS = ["wheel", "touchstart", "pointerdown", "keydown"] as const;

/** Lands keyboard users at the top of the page, not back at the footer */
function focusMain() {
  const main = document.getElementById("main");
  if (!main) return;
  if (!main.hasAttribute("tabindex")) main.setAttribute("tabindex", "-1");
  main.focus({ preventScroll: true });
}

function toTop() {
  const from = window.scrollY;
  const reduced = matchMedia("(prefers-reduced-motion: reduce)").matches;
  if (reduced || from <= 0) {
    window.scrollTo(0, 0);
    focusMain();
    return;
  }

  let raf = 0;
  let listening = false;
  const stop = () => {
    cancelAnimationFrame(raf);
    INTERRUPTS.forEach((type) => window.removeEventListener(type, stop));
  };
  let start = 0;
  const frame = (now: number) => {
    // Starts the clock and listens from the first frame, so the key press that
    // started the glide doesn't stop it
    if (!listening) {
      listening = true;
      start = now;
      INTERRUPTS.forEach((type) => window.addEventListener(type, stop, { passive: true }));
    }
    // An overlay took the scroll lock mid-glide: leave the page where it is
    if (document.documentElement.classList.contains("scroll-locked")) return stop();
    const t = Math.min(1, (now - start) / DURATION);
    window.scrollTo(0, Math.round(from * (1 - easeOut(t))));
    if (t < 1) {
      raf = requestAnimationFrame(frame);
    } else {
      stop();
      focusMain();
    }
  };
  raf = requestAnimationFrame(frame);
}

/**
 * The footer's "Back to top": a smooth glide for this one control only. A global
 * scroll-behavior would also smooth the /#calibration and /#service jumps and
 * scroll restoration. Still a real link to #main without JS.
 */
export default function BackToTop({ className, children }: { className?: string; children: ReactNode }) {
  function onClick(e: MouseEvent<HTMLAnchorElement>) {
    if (e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
    e.preventDefault();
    toTop();
  }

  // Links answer Enter natively (as a click); Space is added so it acts as a button too
  function onKeyDown(e: KeyboardEvent<HTMLAnchorElement>) {
    if (e.key !== " ") return;
    e.preventDefault(); // or the page pages down
    toTop();
  }

  return (
    <a href="#main" className={className} onClick={onClick} onKeyDown={onKeyDown}>
      {children}
    </a>
  );
}
