import Link from "next/link";
import Shot from "@/components/ui/Shot/Shot";
import { formatPrice, titleBlock, WATCHES as RANGE } from "@/lib/watches";
import Inspection from "./Inspection";
import styles from "./Range.module.css";

export default function Range() {
  return (
    <section className={styles.range} aria-labelledby="range-title">
      <div className={`container ${styles.head}`}>
        <div className={styles.heading}>
          <p className={`mono ${styles.eyebrow}`}>
            <span>02</span>
            <span className={styles.rule} aria-hidden />
            <span>The range</span>
          </p>
          <h2 id="range-title" className={styles.title}>
            Three references.
            <br />
            One tolerance.
          </h2>
        </div>

        <div className={styles.intro}>
          <p>
            Different cases, same acceptance limit. Every reference is regulated in five
            positions and has to hold ±2 seconds a day before it ships.
          </p>
          <Link href="/collection" className={`mono ${styles.all}`}>
            All watches <span aria-hidden>→</span>
          </Link>
        </div>
      </div>

      {/* Inspection pass: hooks are data-ip attributes below */}
      <Inspection>
        <ol className={`container ${styles.grid}`}>
          {RANGE.map((r, i) => (
            <li key={r.slug} className={styles.sheet} data-ip="sheet">
              {/* Drawing-sheet header: sheet number + reference */}
              <div className={`mono ${styles.sheetHead}`} aria-hidden>
                <span data-ip="stamp">
                  Sheet {String(i + 1).padStart(2, "0")}/{String(RANGE.length).padStart(2, "0")}
                </span>
                <span data-ip="stamp">{r.ref}</span>
              </div>

              <Shot
                slot={r.card.code}
                sizes="(max-width: 860px) calc(100vw - 2rem), (max-width: 1440px) 31vw, 450px"
                className={styles.image}
              />

              <div className={styles.body}>
                <h3 className={styles.name}>
                  {/* Stretched link: the whole sheet is the target, the name is the label */}
                  <Link href={`/product/${r.slug}`} className={styles.link}>
                    {r.ref} <span className={styles.model}>{r.name}</span>
                  </Link>
                </h3>
                <p className={styles.line}>{r.line}</p>
              </div>

              {/* Title block, as on an engineering drawing */}
              <dl className={styles.block}>
                {titleBlock(r).map((s) => (
                  <div key={s.key} className={styles.cell}>
                    <dt className="mono">{s.key}</dt>
                    <dd>
                      <span className={styles.value}>
                        <span data-ip="roll">{s.value}</span>
                        {s.signoff && <span className={styles.tick} data-ip="tick" aria-hidden />}
                      </span>
                    </dd>
                  </div>
                ))}
              </dl>

              <div className={styles.foot}>
                <span className={styles.price}>{formatPrice(r.price)}</span>
                <span className={`mono ${styles.view}`} data-ip="view" aria-hidden>
                  View reference <span className={styles.arrow}>→</span>
                </span>
                {/* Hover marker on the sheet's bottom rule, like the header's index marker */}
                <span className={styles.marker} data-ip="marker" aria-hidden />
              </div>
            </li>
          ))}
        </ol>
      </Inspection>
    </section>
  );
}
