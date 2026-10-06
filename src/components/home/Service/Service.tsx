import { formatReading, signed, type ReadingKind } from "@/components/home/Calibration/format";
import BookService from "./BookService";
import DriftAndReset from "./DriftAndReset";
import { monthLabel } from "./months";
import styles from "./Service.module.css";

// Concept data: one made-up watch's yearly rate checks since delivery (mean of
// five positions, s/day). Year 5 is measured twice: before and after the full service.
const LIMIT = 2; // s/day, either side of zero
const SCALE = 3; // plot runs −3 … +3 s/day
const YEARS = 10; // x axis: Y0 … Y10
const TODAY = 5.6; // Oct 2026, from a March 2021 delivery
const FULL_SERVICE = [5, 10];
const TODAY_MONTH = "2026-10";
const NEXT_CHECK = "2027-03"; // yearly, on the delivery month

const CHECKS: { year: number; rate: number; note?: string }[] = [
  { year: 0, rate: 0.6, note: "Delivery record" },
  { year: 1, rate: 0.8 },
  { year: 2, rate: 1.1 },
  { year: 3, rate: 1.3 },
  { year: 4, rate: 1.6 },
  { year: 5, rate: 1.9, note: "Before full service" },
  { year: 5, rate: 0.3, note: "After full service" },
];
const LABELLED = [0, 5, 6]; // CHECKS indexes that carry a direct label

const SCHEDULED = [6, 7, 8, 9, 10];

// Plot positions, 0–100%
const x = (year: number) => (year / YEARS) * 100;
const y = (rate: number) => ((SCALE - rate) / (SCALE * 2)) * 100; // from the top

const PEAK = Math.max(...CHECKS.map((c) => c.rate));
const LATEST = CHECKS[CHECKS.length - 1].rate;

const PROCEDURES = [
  {
    name: "Rate check",
    interval: "Every year",
    price: "Free",
    line: "Five positions, 24 h each, on the bench that signed it off. The result goes on its record.",
  },
  {
    name: "Full service",
    interval: "Every 5 years",
    price: "$390",
    line: "Stripped, cleaned, oiled and regulated back to ±2 s/day. New gaskets, pressure tested.",
  },
  {
    name: "Warranty",
    interval: "5 years",
    price: "Included",
    line: "Parts and labour, counted from the date on the delivery record.",
  },
  {
    name: "Turnaround",
    interval: "21 days",
    price: "Insured",
    line: "Shipped both ways at our cost. The updated record comes back with it.",
  },
];

/* A value that counts in Drift and reset: the real text, plus an empty
   aria-hidden overlay the counting digits are drawn in (= Calibration) */
function Reading({ value, kind, suffix = "" }: { value: number; kind: ReadingKind; suffix?: string }) {
  return (
    <span className={styles.reading} data-dr="reading" data-value={value} data-kind={kind} data-suffix={suffix}>
      <span data-dr="val">{formatReading(value, kind) + suffix}</span>
      <span className={styles.roll} data-dr="roll" aria-hidden />
    </span>
  );
}

export default function Service() {
  return (
    <section id="service" className={styles.service} aria-labelledby="service-title">
      <div className={`container ${styles.head}`}>
        <div className={styles.heading}>
          <p className={`mono ${styles.eyebrow}`}>
            <span>04</span>
            <span className={styles.rule} aria-hidden />
            <span>Service</span>
          </p>
          <h2 id="service-title" className={styles.title}>
            Calibrated once.
            <br />
            Checked for life.
          </h2>
        </div>

        <div className={styles.intro}>
          <p>
            A calibration only holds until something changes it. Send your GAUGE back once a
            year and we run the five positions again, free, against the same limit. Every
            fifth year it gets a full service.
          </p>
        </div>
      </div>

      <div className={`container ${styles.body}`}>
        {/* Service record: one watch's drift, year by year */}
        <article className={styles.record} aria-labelledby="history-title">
          <header className={styles.recordHead}>
            <div className={`mono ${styles.recordMeta}`}>
              <span>Service record S-01-0107</span>
              <span>Delivered 03/2021</span>
            </div>
            <div className={styles.recordTitleRow}>
              <h3 id="history-title" className={styles.recordTitle}>
                GAUGE-01 Field <span className={styles.serial}>No. 0107</span>
              </h3>
              {/* Legend: one series, so it names the marks rather than colours */}
              <ul className={`mono ${styles.legend}`} aria-hidden>
                <li>
                  <span className={styles.keyDot} /> Mean rate
                </li>
                <li>
                  <span className={styles.keyRing} /> Scheduled
                </li>
                <li>
                  <span className={styles.keyService} /> Full service
                </li>
              </ul>
            </div>
          </header>

          <div className={styles.chart} data-dr="chart">
            {/* Data for assistive tech; the plot itself is aria-hidden. Wrapped: a table
                ignores the utility's 1px width and would widen the page on phones */}
            <div className="visually-hidden">
              <table>
                <caption>
                  Mean rate at each yearly check, seconds a day, against a limit of ±{LIMIT} seconds
                  a day
                </caption>
                <thead>
                  <tr>
                    <th scope="col">Year</th>
                    <th scope="col">Mean rate</th>
                    <th scope="col">Note</th>
                  </tr>
                </thead>
                <tbody>
                  {CHECKS.map((c, i) => (
                    <tr key={i}>
                      <th scope="row">Year {c.year}</th>
                      <td>{signed(c.rate)} s/day</td>
                      <td>{c.note ?? ""}</td>
                    </tr>
                  ))}
                  {SCHEDULED.map((yr) => (
                    <tr key={`s${yr}`}>
                      <th scope="row">Year {yr}</th>
                      <td>Scheduled</td>
                      <td>{FULL_SERVICE.includes(yr) ? "Full service" : ""}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className={styles.plot} aria-hidden>
              {/* Rate axis */}
              <div className={`mono ${styles.yAxis}`}>
                {[LIMIT, 0, -LIMIT].map((t) => (
                  <span key={t} style={{ top: `${y(t)}%` }}>
                    {t === 0 ? "0" : signed(t).replace(".0", "")}
                  </span>
                ))}
              </div>

              <div className={styles.area}>
                {/* Tolerance band ±2 with dashed limits, and zero */}
                <span
                  className={styles.band}
                  data-dr="band"
                  style={{ top: `${y(LIMIT)}%`, bottom: `${100 - y(-LIMIT)}%` }}
                />
                <span className={styles.zero} style={{ top: `${y(0)}%` }} />

                {/* Year grid */}
                {Array.from({ length: YEARS + 1 }, (_, yr) => (
                  <span key={yr} className={styles.yearLine} style={{ left: `${x(yr)}%` }} />
                ))}

                {/* Full-service lines */}
                {FULL_SERVICE.map((yr) => (
                  <span key={yr} className={styles.serviceLine} data-dr="service" style={{ left: `${x(yr)}%` }} />
                ))}

                {/* Today: everything right of it is scheduled */}
                <span className={styles.future} data-dr="future" style={{ left: `${x(TODAY)}%` }} />
                <span className={styles.today} data-dr="today" style={{ left: `${x(TODAY)}%` }}>
                  <span className={`mono ${styles.todayLabel}`}>Today</span>
                </span>

                {/* Drift line, then the drop at the service: one segment into each
                    reading, so Drift and reset can draw each behind its dot */}
                <svg className={styles.line} viewBox="0 0 100 100" preserveAspectRatio="none">
                  {CHECKS.slice(1).map((c, i) => (
                    <line
                      key={i}
                      data-dr="seg"
                      x1={x(CHECKS[i].year)}
                      y1={y(CHECKS[i].rate)}
                      x2={x(c.year)}
                      y2={y(c.rate)}
                      vectorEffect="non-scaling-stroke"
                    />
                  ))}
                </svg>

                {CHECKS.map((c, i) => (
                  <span
                    key={i}
                    className={styles.dot}
                    data-dr="dot"
                    data-rate={c.rate}
                    style={{ left: `${x(c.year)}%`, top: `${y(c.rate)}%` }}
                  >
                    {LABELLED.includes(i) && (
                      <span className={`mono ${styles.dotLabel}`} data-dr="label" data-side={i === 6 ? "right" : "above"}>
                        {signed(c.rate)}
                      </span>
                    )}
                  </span>
                ))}

                {/* Drift and reset: hooks are data-dr attributes in this record */}
                <DriftAndReset scale={SCALE} years={YEARS} today={TODAY} />
              </div>

              {/* Year axis, with scheduled checks as rings on the rule */}
              <div className={`mono ${styles.xAxis}`}>
                <span className={styles.axisRule} data-dr="axis" />
                {Array.from({ length: YEARS + 1 }, (_, yr) => (
                  <span key={yr} className={styles.year} data-dr="year" style={{ left: `${x(yr)}%` }}>
                    Y{yr}
                  </span>
                ))}
                {SCHEDULED.map((yr) => (
                  <span key={`s${yr}`} className={styles.ring} data-dr="ring" style={{ left: `${x(yr)}%` }} />
                ))}
              </div>
            </div>
          </div>

          <dl className={styles.summary}>
            <div className={styles.cell}>
              <dt className="mono">On record</dt>
              <dd>
                <Reading value={CHECKS.length} kind="int" suffix=" readings" />
              </dd>
            </div>
            <div className={styles.cell}>
              <dt className="mono">Peak drift</dt>
              <dd>
                <Reading value={PEAK} kind="rate" suffix=" s/day" />
              </dd>
            </div>
            <div className={styles.cell}>
              <dt className="mono">After service</dt>
              <dd>
                <Reading value={LATEST} kind="rate" suffix=" s/day" />
              </dd>
            </div>
            <div className={styles.cell}>
              <dt className="mono">Next check</dt>
              <dd>
                <span className={styles.value}>
                  {/* Steps month by month from today's month in the run */}
                  <span className={styles.reading} data-dr="next" data-from={TODAY_MONTH} data-to={NEXT_CHECK}>
                    <span data-dr="val">{monthLabel(NEXT_CHECK)}</span>
                    <span className={styles.roll} data-dr="roll" aria-hidden />
                  </span>
                  <span className={styles.tick} data-dr="tick" aria-hidden />
                </span>
              </dd>
            </div>
          </dl>
        </article>

        {/* Work order: what the service covers */}
        <div className={styles.order}>
          <p className={`mono ${styles.orderHead}`}>
            <span>Work order</span>
            <span>All references</span>
          </p>
          <ol className={styles.procedures}>
            {PROCEDURES.map((p, i) => (
              <li key={p.name} className={styles.procedure}>
                <span className={`mono ${styles.index}`}>{String(i + 1).padStart(2, "0")}</span>
                <div className={styles.procBody}>
                  <div className={styles.procTop}>
                    <h3 className={styles.procName}>{p.name}</h3>
                    <span className={styles.price}>{p.price}</span>
                  </div>
                  <p className={`mono ${styles.interval}`}>{p.interval}</p>
                  <p className={styles.procLine}>{p.line}</p>
                </div>
              </li>
            ))}
          </ol>
          <BookService />
        </div>
      </div>
    </section>
  );
}
