import Shot from "@/components/ui/Shot/Shot";
import FivePositionRun from "./FivePositionRun";
import { formatReading, signed, type ReadingKind } from "./format";
import styles from "./Calibration.module.css";

// Concept data: one made-up watch's five-position test, 24 h per position
const LIMIT = 2; // s/day, either side of zero
const SCALE = 4; // plot runs −4 … +4 s/day

const POSITIONS: { name: string; rate: number; amplitude: number }[] = [
  { name: "Dial up", rate: 1.2, amplitude: 298 },
  { name: "Dial down", rate: 0.6, amplitude: 294 },
  { name: "Crown down", rate: 1.6, amplitude: 271 },
  { name: "Crown left", rate: -0.9, amplitude: 268 },
  { name: "Crown up", rate: -0.4, amplitude: 274 },
];

const rates = POSITIONS.map((p) => p.rate);
const MEAN = rates.reduce((a, b) => a + b, 0) / rates.length;
const SPREAD = Math.max(...rates) - Math.min(...rates);

// Position on the plot, 0–100% (−SCALE … +SCALE)
const pct = (n: number) => ((n + SCALE) / (SCALE * 2)) * 100;

const TICKS = [-4, -2, 0, 2, 4];

/* A value that counts in the Five-position run: the real text, plus an empty
   aria-hidden overlay the counting digits are drawn in */
function Reading({ value, kind, suffix = "" }: { value: number; kind: ReadingKind; suffix?: string }) {
  return (
    <span className={styles.reading} data-fp="reading" data-value={value} data-kind={kind} data-suffix={suffix}>
      <span data-fp="val">{formatReading(value, kind) + suffix}</span>
      <span className={styles.roll} data-fp="roll" aria-hidden />
    </span>
  );
}

export default function Calibration() {
  return (
    <section id="calibration" className={styles.calibration} data-theme="dark" aria-labelledby="calibration-title">
      <div className={`container ${styles.head}`}>
        <div className={styles.heading}>
          <p className={`mono ${styles.eyebrow}`}>
            <span>03</span>
            <span className={styles.rule} aria-hidden />
            <span>Calibration</span>
          </p>
          <h2 id="calibration-title" className={styles.title}>
            Five positions.
            <br />
            One record.
          </h2>
        </div>

        <div className={styles.intro}>
          <p>
            A watch keeps different time depending on how it lies. Each GAUGE spends a day
            in each of five positions on the timegrapher, and every rate has to land inside
            the band. The record goes in the box.
          </p>
        </div>
      </div>

      <div className={`container ${styles.body}`}>
        <Shot slot="IMG-C01" sizes="(max-width: 860px) calc(100vw - 2rem), 60vw" className={styles.image} />

        <article className={styles.record} aria-labelledby="record-title">
          {/* Five-position run: hooks are data-fp attributes below */}
          <FivePositionRun />
          {/* Certificate header */}
          <header className={styles.recordHead}>
            <div className={`mono ${styles.recordMeta}`}>
              <span>Record C-01-0412</span>
              <span>Bench 2 · 23 °C</span>
            </div>
            <h3 id="record-title" className={styles.recordTitle}>
              GAUGE-01 Field <span className={styles.serial}>No. 0412</span>
            </h3>
          </header>

          <table className={styles.table} data-fp="table">
            <caption className="visually-hidden">
              Rate (seconds a day) and amplitude (degrees) in five positions, against a limit
              of ±{LIMIT} seconds a day
            </caption>
            <thead>
              <tr className="mono">
                <th scope="col" className={styles.pos}>Position</th>
                <th scope="col" className={styles.num}>
                  Rate <span className={styles.unit}>s/d</span>
                </th>
                <th scope="col" className={styles.plotHead} aria-hidden>
                  {/* Scale ticks for the plot column */}
                  <span className={styles.track}>
                    {TICKS.map((t) => (
                      <span key={t} className={styles.tickLabel} style={{ left: `${pct(t)}%` }}>
                        {t === 0 ? "0" : signed(t).replace(".0", "")}
                      </span>
                    ))}
                  </span>
                </th>
                <th scope="col" className={styles.num}>
                  Amp. <span className={styles.unit}>°</span>
                </th>
              </tr>
            </thead>
            <tbody>
              {POSITIONS.map((p) => (
                <tr key={p.name} data-fp="row">
                  <th scope="row" className="mono">{p.name}</th>
                  <td className={styles.num}>
                    <Reading value={p.rate} kind="rate" />
                  </td>
                  <td className={styles.plot} aria-hidden>
                    <span className={styles.track}>
                      {/* Leader from zero to the reading, then the reading */}
                      <span
                        className={styles.leader}
                        data-fp="leader"
                        style={{
                          left: `${pct(Math.min(0, p.rate))}%`,
                          width: `${(Math.abs(p.rate) / (SCALE * 2)) * 100}%`,
                        }}
                      />
                      <span className={styles.dot} data-fp="dot" style={{ left: `${pct(p.rate)}%` }} />
                    </span>
                  </td>
                  <td className={styles.num}>
                    <Reading value={p.amplitude} kind="int" />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {/* Summary: same title-block cells as the Range sheets */}
          <dl className={styles.summary}>
            <div className={styles.cell} data-fp="total">
              <dt className="mono">Mean rate</dt>
              <dd>
                <Reading value={MEAN} kind="rate" suffix=" s/day" />
              </dd>
            </div>
            <div className={styles.cell} data-fp="total">
              <dt className="mono">Spread</dt>
              <dd>
                <Reading value={SPREAD} kind="fixed" suffix=" s" />
              </dd>
            </div>
            <div className={styles.cell}>
              <dt className="mono">Limit</dt>
              <dd data-fp="limit">±{LIMIT.toFixed(1)} s/day</dd>
            </div>
            <div className={styles.cell}>
              <dt className="mono">Result</dt>
              <dd>
                <span className={styles.value} data-fp="result">
                  Within limit
                  <span className={styles.tick} data-fp="tick" aria-hidden />
                </span>
              </dd>
            </div>
          </dl>
        </article>
      </div>
    </section>
  );
}
