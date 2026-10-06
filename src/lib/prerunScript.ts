/** Sections whose scroll-started run a fresh /#id load can land on */
export const PRERUN_SECTIONS = ["calibration", "service"] as const;

/** Failsafe: the marker is dropped after this if no run has claimed it */
export const PRERUN_TIMEOUT_MS = 5000;

/**
 * Runs in <head> before first paint. On a fresh load of /#calibration or /#service
 * (navigation type "navigate", not a reload or back/forward, and not reduced motion)
 * it marks <html data-prerun="<id>"> so CSS paints that section's chart in its
 * "before" state instead of flashing the finished values until the run arms after
 * load. Every other case keeps the server-rendered finished state.
 *
 * The run claims the marker on mount: it applies the same before state inline and
 * removes the attribute (claimPrerun in instrument.ts). If nothing claims it (no
 * hydration, an error), the timeout drops it so the chart never stays hidden.
 */
export const prerunScript = `try{var d=document.documentElement,h=location.hash.slice(1),n=performance.getEntriesByType("navigation")[0];if(location.pathname==="/"&&${JSON.stringify(PRERUN_SECTIONS)}.indexOf(h)>-1&&n&&n.type==="navigate"&&!matchMedia("(prefers-reduced-motion: reduce)").matches){d.dataset.prerun=h;setTimeout(function(){if(d.dataset.prerun===h)delete d.dataset.prerun},${PRERUN_TIMEOUT_MS})}}catch(e){}`;
