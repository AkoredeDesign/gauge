import Link from "next/link";
import Shot from "@/components/ui/Shot/Shot";
import { compareTable, formatPrice, specStrip, TOLERANCE, WATCHES } from "@/lib/watches";
import styles from "./Collection.module.css";

const pad = (n: number) => String(n).padStart(2, "0");
const WORDS = ["no", "one", "two", "three", "four", "five"];
const cap = (s: string) => s[0].toUpperCase() + s.slice(1);
const calibres =new Set(WATCHES.map((w) => w.movement.calibre)).size;

/**
 * /collection: the register. One full-width row per reference, then every key
 * figure in one table. Static; variants and Add to bag live on the product page.
 */
export default function Collection() {
  const groups = compareTable(WATCHES);

  return (
    <div className={styles.page}>
      <header className={`container ${styles.head}`}>
        <div className={styles.heading}>
          <p className={`mono ${styles.eyebrow}`}>
            <span>Watches</span>
            <span className={styles.rule} aria-hidden />
            <span>Register, {pad(WATCHES.length)} entries</span>
          </p>
          <h1 className={styles.title}>
            Every reference
            <br />
            we make.
          </h1>
        </div>

        <div className={styles.intro}>
          <p>
            {cap(WORDS[WATCHES.length])} references on {WORDS[calibres]} calibres, each regulated in five
            positions to {TOLERANCE} before it ships. The full figures are compared at the foot of the
            page.
          </p>
          <a href="#compare" className={`mono ${styles.jump}`}>
            Compare specifications <span aria-hidden>↓</span>
          </a>
        </div>
      </header>

      <ol className={`container ${styles.register}`} aria-label="The register">
        {WATCHES.map((w, i) => (
          <li key={w.slug} className={styles.entry}>
            <p className={`mono ${styles.index}`} aria-hidden>
              <span className={styles.indexNum}>{pad(i + 1)}</span>/{pad(WATCHES.length)}
            </p>

            <Shot
              slot={w.card.code}
              sizes="(max-width: 860px) calc(100vw - 2rem), (max-width: 1440px) 40vw, 560px"
              className={styles.image}
            />

            <div className={styles.body}>
              <div className={styles.text}>
                <h2 className={styles.name}>
                  <span className={styles.ref}>{w.ref}</span> {w.name}
                </h2>
                <p className={styles.blurb}>{w.line}</p>
              </div>

              <dl className={styles.specs}>
                {specStrip(w).map((s) => (
                  <div key={s.key} className={styles.spec}>
                    <dt className="mono">{s.key}</dt>
                    <dd>
                      <span className={styles.value}>
                        {s.value}
                        {s.signoff && <span className={styles.tick} aria-hidden />}
                      </span>
                    </dd>
                  </div>
                ))}
              </dl>

              <div className={styles.foot}>
                <p className={styles.price}>
                  <span className={`mono ${styles.from}`}>From</span> {formatPrice(w.price)}
                </p>
                <Link href={`/product/${w.slug}`} className={`mono ${styles.view}`}>
                  View {w.ref} <span className={styles.arrow} aria-hidden>→</span>
                </Link>
              </div>
            </div>
          </li>
        ))}
      </ol>

      <section id="compare" className={`container ${styles.compare}`} aria-labelledby="compare-title">
        <p className={`mono ${styles.eyebrow}`}>
          <span>Comparison</span>
          <span className={styles.rule} aria-hidden />
          <span>{pad(WATCHES.length)} references</span>
        </p>
        <h2 id="compare-title" className={styles.compareTitle}>
          Side by side, line by line.
        </h2>
        {/* Phones only: said before the table, where the cut-off column is */}
        <p className={`mono ${styles.hint}`} aria-hidden>
          Swipe the table for all {WATCHES.length} <span>→</span>
        </p>

        {/* Focusable so the keyboard can scroll it when it overflows on phones */}
        <div className={styles.scroller} role="region" aria-labelledby="compare-caption" tabIndex={0}>
          <table className={styles.table}>
            <caption id="compare-caption" className={styles.caption}>
              <span className={styles.captionText}>
              {WATCHES.map((w) => `${w.ref} ${w.name}`).join(", ")} compared: case, movement, dial,
              options, rate and price. One column per reference.
              </span>
            </caption>
            <thead>
              <tr>
                <td className={styles.corner} />
                {WATCHES.map((w) => (
                  <th key={w.slug} scope="col" className={styles.colHead}>
                    <Link href={`/product/${w.slug}`} className={styles.colLink}>
                      <span className={`mono ${styles.colRef}`}>{w.ref}</span>
                      <span>{w.name}</span>
                    </Link>
                  </th>
                ))}
              </tr>
            </thead>
            {groups.map((g) => (
              <tbody key={g.title}>
                <tr className={styles.groupRow}>
                  <th scope="rowgroup" colSpan={WATCHES.length + 1} className="mono">
                    <span className={styles.groupLabel}>{g.title}</span>
                  </th>
                </tr>
                {g.rows.map((r) => (
                  <tr key={r.key}>
                    <th scope="row" className={`mono ${styles.rowHead}`}>
                      {r.key}
                    </th>
                    {r.values.map((v, i) => (
                      <td key={WATCHES[i].slug}>
                        <span className={styles.value}>
                          {v}
                          {r.signoff && <span className={styles.tick} aria-hidden />}
                        </span>
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            ))}
          </table>
        </div>
      </section>
    </div>
  );
}
