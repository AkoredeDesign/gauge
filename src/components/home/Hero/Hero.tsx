import Link from "next/link";
import Shot from "@/components/ui/Shot/Shot";
import { getWatch, specStrip } from "@/lib/watches";
import NewsletterCard from "./NewsletterCard";
import ZeroSet from "./ZeroSet";
import styles from "./Hero.module.css";

// GAUGE-01's figures, from the shared data; the Rate row gets Zero-set's sign-off tick
const SPECS = specStrip(getWatch("gauge-01")!);

export default function Hero() {
  return (
    <ZeroSet className={styles.hero} aria-labelledby="hero-title">
      <div className={`container ${styles.inner}`}>
        <div className={styles.content}>
          <p className={`mono ${styles.eyebrow}`}>
            <span>REF. GAUGE-01</span>
            <span className={styles.rule} data-zs="rule" aria-hidden />
            <span>Field Instrument / Series 1</span>
          </p>

          <h1 id="hero-title" className={styles.title}>
            Built to
            <br />
            tolerance.
          </h1>

          <p className={styles.lede}>
            Mechanical watches made the way a machine shop makes gauges. Every GAUGE is
            regulated to ±2 seconds a day and checked against a calibration standard
            before it leaves the bench.
          </p>

          <div className={styles.actions}>
            <Link href="/product/gauge-01" className={styles.ctaPrimary}>
              Shop GAUGE-01
            </Link>
            <Link href="/collection" className={styles.ctaSecondary}>
              Explore the range
            </Link>
          </div>
        </div>

        <div className={styles.media}>
          <div className={styles.readout} aria-hidden>
            <span className="mono" data-zs-axis="x">X 000.00</span>
            <span className="mono" data-zs-axis="y">Y 000.00</span>
          </div>
          <div className={styles.frame}>
            <Shot
              slot="IMG-H01"
              sizes="(max-width: 860px) calc(100vw - 2rem), (max-width: 1440px) 40vw, 560px"
              eager
              className={styles.image}
            />
            {/* Jig registration marks, just outside the photograph */}
            {["tl", "tr", "bl", "br"].map((pos) => (
              <span key={pos} className={styles.reg} data-pos={pos} data-zs-reg={pos} aria-hidden />
            ))}
          </div>
          <NewsletterCard className={styles.newsletter} />
        </div>
      </div>

      <div className="container">
        <dl className={styles.specs}>
          {SPECS.map((s) => (
            <div key={s.key} className={styles.spec}>
              <dt className="mono">{s.key}</dt>
              <dd>
                <span className={styles.value}>
                  <span data-zs="roll">{s.value}</span>
                  {s.signoff && <span className={styles.tick} data-zs="tick" aria-hidden />}
                </span>
              </dd>
            </div>
          ))}
        </dl>
      </div>

      <div className={styles.ruler} aria-hidden />
    </ZeroSet>
  );
}
