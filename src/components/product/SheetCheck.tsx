"use client";

import { useRef, type ReactNode } from "react";
import gsap from "gsap";
import { useGSAP } from "@gsap/react";
import { armAtLoad, driveTimeline, observeChart } from "@/lib/instrument";
import { formatCount, type Count } from "@/lib/watches";

gsap.registerPlugin(useGSAP);

/*
 * "Sheet check" (approved 2026-10-05). A checker's line works down the spec sheet
 * row by row. A measured figure is read: it counts up from zero to its value while
 * the line holds on it. A stated figure (material, crystal, crown…) is passed: the
 * line holds a short beat and moves on, and the text never changes. The run closes
 * on the Rate sign-off tick, as every run on the site does. Same rules as the home
 * runs: linear, stepped or damped; never a fade or slide. Hooks are data-sc
 * attributes in Product.tsx.
 *
 *   0.00  a 2px ink line clamps onto the title rule of each column's first group
 *         (2px overshoot, settles)
 *   0.15  the lines step down in parallel, one hard step per row:
 *           measured row  the value counts from zero in 6 even steps over 0.36s
 *                         (= the Five-position run), lands, holds one step
 *           Rate          the sign-off tick draws left to right (0.2s)
 *           stated row    a 0.18s pass; nothing changes
 *         between groups in a column the line steps onto the next group's title rule
 *   end   each line waits on its column's bottom rule for the slowest column, then
 *         all step off on one frame (~2.97s for GAUGE-01, the longest column is Case)
 *
 * Desktop: the whole sheet is one chart (observeChart: fully in view below the
 * header, about 60% of it if it can't fit), with one line per visual column. Phone:
 * the groups stack, so each group is its own chart and runs its own line.
 *
 * The before state is applied only to a chart still below the fold once the page
 * has loaded (armAtLoad, after any scroll restoration); otherwise it renders
 * finished. Reduced motion: never armed — final state only. Once per page view; the
 * product page is keyed on its slug, so another product is a new view.
 *
 * Measured text is hidden with opacity set in one step (never tweened), not
 * visibility, so the sheet keeps its final values in the accessibility tree
 * throughout; the counting digits are an aria-hidden overlay on the dd. Stated
 * rows (incl. everything the model switcher changes) are never touched, so React
 * updates them at any point of the run.
 */

const PHONE = "(max-width: 860px)"; // = the single-column breakpoint in Product.module.css
const reduced = () => matchMedia("(prefers-reduced-motion: reduce)").matches;

const CLAMP = 0.15;
const OVERSHOOT = 2; // px below the title rule before settling (= header index marker)
const COUNT_STEPS = 6; // = Five-position run: whole display units, at most 6 even steps…
const COUNT_DUR = 0.36; // …over 0.36s, so each value holds 60ms
const LAND = 0.06; // the landed value holds one more step with the line still on it
const PASS = 0.18; // a stated row: the line holds, nothing changes
const TICK_DUR = 0.2;
const RUN_PROPS = "visibility,opacity,transform,transformOrigin"; // never "all"

/** n even steps that land exactly at the end (GSAP's steps(n) lands early) */
const stepped = (n: number) => (p: number) => (p >= 1 ? 1 : Math.floor(p * n) / n);

type Row = { row: HTMLElement; value: HTMLElement; roll: HTMLElement | null; tick: HTMLElement | null; count: Count | null };
type Group = { group: HTMLElement; title: HTMLElement; line: HTMLElement; rows: Row[] };

export default function SheetCheck({ className, children }: { className: string; children: ReactNode }) {
  const ref = useRef<HTMLDivElement>(null);

  useGSAP(
    (_, contextSafe) => {
      const sheet = ref.current!;
      const q = (root: ParentNode, s: string) => Array.from(root.querySelectorAll<HTMLElement>(s));
      const one = (root: ParentNode, s: string) => root.querySelector<HTMLElement>(s);

      const groups: Group[] = q(sheet, '[data-sc="group"]').map((group) => ({
        group,
        title: one(group, '[data-sc="title"]')!,
        line: one(group, '[data-sc="line"]')!,
        rows: q(group, '[data-sc="row"]').map((row) => {
          const value = one(row, '[data-sc="value"]')!;
          return {
            row,
            value,
            roll: one(row, '[data-sc="roll"]'),
            tick: one(row, '[data-sc="tick"]'),
            count: value.dataset.count ? (JSON.parse(value.dataset.count) as Count) : null,
          };
        }),
      }));
      const counted = (gs: Group[]) => gs.flatMap((g) => g.rows.filter((r) => r.count));
      const ticks = (gs: Group[]) => gs.flatMap((g) => g.rows.flatMap((r) => (r.tick ? [r.tick] : [])));

      // ---- Before state: measured rows read zero, the tick is undrawn --------
      const arm = (gs: Group[]) => {
        for (const r of counted(gs)) {
          gsap.set(r.value, { opacity: 0 });
          r.roll!.textContent = formatCount(r.count!, 0);
        }
        const t = ticks(gs);
        if (t.length) gsap.set(t, { scaleX: 0, transformOrigin: "0 50%" });
      };

      // Leave the static markup exactly as React rendered it
      const clear = (gs: Group[]) => {
        const touched = [...gs.map((g) => g.line), ...counted(gs).map((r) => r.value), ...ticks(gs)];
        if (touched.length) gsap.set(touched, { clearProps: RUN_PROPS });
        counted(gs).forEach((r) => (r.roll!.textContent = ""));
      };

      // ---- The run: one line per column of groups ------------------------------
      const buildRun = (columns: Group[][]) => {
        const tl = gsap.timeline({ paused: true });

        /** Count a value up from zero from `at`; the real text takes over on the last step */
        const count = ({ value, roll, count: c }: Row, at: number) => {
          const scale = 10 ** c!.decimals;
          const units = Math.round(c!.n * scale);
          const r = { t: 0 };
          let shown = -1; // redraw only when the stepped value changes
          tl.to(
            r,
            {
              t: 1,
              duration: COUNT_DUR,
              ease: stepped(Math.max(1, Math.min(COUNT_STEPS, units))),
              onUpdate: () => {
                if (r.t === shown) return;
                shown = r.t;
                const landed = r.t >= 1;
                roll!.textContent = landed ? "" : formatCount(c!, Math.round(units * r.t) / scale);
                value.style.opacity = landed ? "" : "0";
              },
            },
            at,
          );
        };

        let end = 0;
        for (const column of columns) {
          let t = 0;
          column.forEach((g, gi) => {
            const top = g.group.getBoundingClientRect().top;
            const y = (el: HTMLElement) => el.getBoundingClientRect().bottom - top; // its bottom rule
            if (gi === 0) {
              tl.set(g.line, { visibility: "visible", y: y(g.title) + OVERSHOOT }, 0).to(
                g.line,
                { y: y(g.title), duration: CLAMP, ease: "power2.inOut" },
                0,
              );
              t = CLAMP;
            } else {
              // From the group above's bottom rule onto this group's title rule, in one step
              tl.set(column[gi - 1].line, { visibility: "hidden" }, t).set(g.line, { visibility: "visible", y: y(g.title) }, t);
              t += PASS;
            }
            for (const r of g.rows) {
              tl.set(g.line, { y: y(r.row) }, t);
              if (r.count) {
                count(r, t);
                t += COUNT_DUR + LAND;
              } else if (r.tick) {
                tl.to(r.tick, { scaleX: 1, duration: TICK_DUR, ease: "none" }, t);
                t += TICK_DUR + LAND;
              } else {
                t += PASS;
              }
            }
          });
          end = Math.max(end, t);
        }
        // Every line steps off on the same frame
        tl.set(
          columns.map((col) => col[col.length - 1].line),
          { visibility: "hidden" },
          end,
        );
        return tl;
      };

      /** Visual columns, left to right, each top to bottom (desktop: 3 at 1440, 2 at ≤1100) */
      const columnsOf = (gs: Group[]) => {
        const cols = new Map<number, Group[]>();
        for (const g of gs) {
          const x = Math.round(g.group.getBoundingClientRect().left);
          cols.set(x, [...(cols.get(x) ?? []), g]);
        }
        return [...cols.entries()]
          .sort((a, b) => a[0] - b[0])
          .map(([, col]) => col.sort((a, b) => a.group.getBoundingClientRect().top - b.group.getBoundingClientRect().top));
      };

      const armed = new Set<Group>();
      const running = new Set<() => void>();
      const run = contextSafe!((gs: Group[]) => {
        gs.forEach((g) => armed.delete(g));
        const tl = buildRun(columnsOf(gs));
        // A width change mid-run would leave the measured line positions stale: finish
        const width = innerWidth;
        const onResize = () => innerWidth !== width && stop();
        const stop = () => {
          cancel();
          tl.kill();
          done();
        };
        const done = () => {
          removeEventListener("resize", onResize);
          running.delete(stop);
          clear(gs);
        };
        tl.eventCallback("onComplete", done);
        addEventListener("resize", onResize);
        const cancel = driveTimeline(tl);
        running.add(stop);
      });

      // Desktop: the sheet is the chart, one run for every group. Phone: each group.
      const io = observeChart((chart) => run(chart === sheet ? groups : groups.filter((g) => g.group === chart)));

      // Crossing the phone breakpoint while waiting changes what the charts are: finish
      const mq = matchMedia(PHONE);
      const onLayout = contextSafe!(() => {
        io.disconnect();
        clear([...armed]);
        armed.clear();
      });

      // Decide after load + a frame, so a restored scroll position is already applied:
      // only charts still below the fold get the before state (armAtLoad).
      let raf = 0;
      const decide = contextSafe!(() => {
        if (reduced()) return;
        const charts = mq.matches ? groups.map((g) => ({ chart: g.group, gs: [g] })) : [{ chart: sheet, gs: groups }];
        for (const { chart, gs } of charts) {
          if (armAtLoad(chart) !== "scroll") continue; // no section id: never a jump
          arm(gs);
          gs.forEach((g) => armed.add(g));
          io.observe(chart);
        }
        if (armed.size) mq.addEventListener("change", onLayout, { once: true });
      });
      const afterLoad = () => (raf = requestAnimationFrame(() => (raf = requestAnimationFrame(decide))));
      if (document.readyState === "complete") afterLoad();
      else addEventListener("load", afterLoad, { once: true });

      return () => {
        removeEventListener("load", afterLoad);
        mq.removeEventListener("change", onLayout);
        cancelAnimationFrame(raf);
        running.forEach((stop) => stop());
        io.disconnect();
        // Unmounted mid-run (incl. StrictMode's dev double-mount): the context revert
        // clears the inline styles; the overlays are ours to empty
        groups.forEach((g) => g.rows.forEach((r) => r.roll && (r.roll.textContent = "")));
      };
    },
    { scope: ref },
  );

  return (
    <div ref={ref} className={className}>
      {children}
    </div>
  );
}
