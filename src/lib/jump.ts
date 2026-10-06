/*
 * Jumps to a home section (/#calibration, /#service) from the header, the footer or
 * any other link, or by arriving on the page with the hash. A section that was
 * jumped to starts its run as soon as any of its chart shows (see observeChart);
 * ordinary scrolling keeps the full-chart rule.
 *
 * Imported by the Header so the listener is in place on every page: a jump from
 * /product/… is recorded before the home page has loaded.
 */

const EVENT = "gauge:jump";

/** The section a jump is heading for, until the home page takes it */
let pending: string | null = null;

/** The home-page section id a link points at, or null */
function targetOf(a: HTMLAnchorElement) {
  const url = new URL(a.href, location.href);
  return url.origin === location.origin && url.pathname === "/" && url.hash.length > 1 ? url.hash.slice(1) : null;
}

if (typeof window !== "undefined") {
  // A fresh visit that lands on /#service is a jump; a reload or back/forward is not
  // (the browser restores the scroll position, and the usual rules apply)
  const nav = performance.getEntriesByType("navigation")[0] as PerformanceNavigationTiming | undefined;
  if (nav?.type === "navigate" && location.hash.length > 1) pending = location.hash.slice(1);

  // Capture phase: recorded before Next's Link handler navigates or scrolls
  document.addEventListener(
    "click",
    (e) => {
      const a = (e.target as Element | null)?.closest?.("a[href]") as HTMLAnchorElement | null;
      if (!a || e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
      pending = targetOf(a); // any other link clears a jump nobody took
      if (pending) window.dispatchEvent(new CustomEvent<string>(EVENT, { detail: pending }));
    },
    true,
  );
}

/**
 * On the home page's load-time decision: was this section jumped to? Only while the
 * URL still carries its hash, so a stale jump can't be taken by a later visit.
 */
export function takeJump(id: string) {
  if (pending !== id || location.hash !== `#${id}`) return false;
  pending = null;
  return true;
}

/** Is a jump heading for this section? Doesn't take it (armAtLoad does, after load) */
export function peekJump(id: string) {
  return pending === id;
}

/** Jumps made while the home page is already open. Returns an unsubscribe. */
export function onJump(fn: (id: string) => void) {
  const handler = (e: Event) => fn((e as CustomEvent<string>).detail);
  window.addEventListener(EVENT, handler);
  return () => window.removeEventListener(EVENT, handler);
}
