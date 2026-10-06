"use client";

import { useState } from "react";
import Link from "next/link";
import Shot from "@/components/ui/Shot/Shot";
import { getImage } from "@/data/images";
import { useBagDrawer } from "@/lib/store/useBagDrawer";
import { useCartStore } from "@/lib/store/useCartStore";
import { formatPrice, specSheet, TOLERANCE, type Shot as ShotData, type Watch } from "@/lib/watches";
import SheetCheck from "./SheetCheck";
import styles from "./Product.module.css";

type Props = { watch: Watch; sheet: number; sheets: number };

const pad = (n: number) => String(n).padStart(2, "0");

const landscape = (s: ShotData) => {
  const img = getImage(s.code);
  return !!img && img.width > img.height;
};

/**
 * Desktop gallery spans: the front-on shot runs full width; after it, two shots
 * of the same orientation pair up and an odd one out runs full width.
 */
function spans(gallery: ShotData[]) {
  const out: ("full" | "half")[] = [];
  for (let i = 0; i < gallery.length; i++) {
    if (i + 1 < gallery.length && landscape(gallery[i]) === landscape(gallery[i + 1])) {
      out.push("half", "half");
      i++;
    } else out.push("full");
  }
  return out;
}

/** Rendered width per breakpoint. Phones: a 4:5 strip frame, so a landscape shot is cropped from one ~1.6× wider */
const sizesFor = (s: ShotData, span: "full" | "half") =>
  [
    `(max-width: 860px) ${landscape(s) ? "162vw" : "86vw"}`,
    span === "full" ? "(max-width: 1440px) 55vw, 780px" : "(max-width: 1440px) 27vw, 390px",
  ].join(", ");

/**
 * Product page for one reference: gallery, buy panel with the model switcher, and
 * the full spec sheet. Client-side only for the switcher, which changes the
 * front-on shot, the spec sheet's dial or strap row, and what Add to bag adds.
 */
export default function Product({ watch: w, sheet, sheets }: Props) {
  const [variantId, setVariantId] = useState(w.variants[0].id);
  const variant = w.variants.find((v) => v.id === variantId)!;
  const gallerySpans = spans(w.gallery);
  const groups = specSheet(w, variant);
  const code = w.variantKind === "Dial" ? "D" : "S"; // option codes, as on a parts list
  const addItem = useCartStore((s) => s.addItem);
  const openBag = useBagDrawer((s) => s.openBag);

  return (
    <article className={styles.product} aria-labelledby="product-title">
      <div className={`container ${styles.top}`}>
        <nav className={`mono ${styles.crumbs}`} aria-label="Breadcrumb">
          <ol>
            <li>
              <Link href="/collection">Watches</Link>
            </li>
            <li aria-current="page">
              {w.ref} {w.name}
            </li>
          </ol>
        </nav>

        {/* Gallery: stacked on desktop, a swipe strip on phones */}
        <ul className={styles.gallery} aria-label={`${w.ref} images`}>
          {/* Every variant's front-on shot, stacked and pre-sized alike: switching only changes which shows */}
          <li className={styles.shot} data-shot={0} data-span="full">
            <div className={styles.stack}>
              {w.variants.map((v, i) => (
                <Shot
                  key={v.id}
                  slot={v.shot.code}
                  sizes={sizesFor(v.shot, "full")}
                  eager={i === 0}
                  hiddenShot={v.id !== variantId}
                  className={styles.image}
                />
              ))}
            </div>
          </li>
          {w.gallery.map((s, i) => (
            <li key={s.code} className={styles.shot} data-shot={i + 1} data-span={gallerySpans[i]}>
              <Shot
                slot={s.code}
                sizes={sizesFor(s, gallerySpans[i])}
                narrowCrop={s.code.endsWith("-D")}
                className={styles.image}
              />
            </li>
          ))}
        </ul>

        <div className={styles.panel}>
          <div className={styles.buy}>
            {/* Drawing-sheet strip, as on the Range sheets */}
            <div className={`mono ${styles.sheetHead}`}>
              <span>Ref. {w.ref}</span>
              <span>
                Sheet {pad(sheet)}/{pad(sheets)}
              </span>
            </div>

            <div className={styles.buyBody}>
              <h1 id="product-title" className={styles.title}>
                {w.ref} <span className={styles.name}>{w.name}</span>
              </h1>
              <p className={styles.price}>{formatPrice(w.price)}</p>
              <p className={styles.description}>{w.description}</p>

              <fieldset className={styles.switcher}>
                <legend className="mono">
                  {w.variantKind} <span className={styles.legendValue}>— {variant.label}</span>
                </legend>
                <div className={styles.options}>
                  {w.variants.map((v, i) => (
                    <label key={v.id} className={styles.option}>
                      <input
                        type="radio"
                        name="variant"
                        value={v.id}
                        checked={v.id === variantId}
                        onChange={() => setVariantId(v.id)}
                        className={styles.radio}
                      />
                      <span className={`mono ${styles.optionCode}`} aria-hidden>
                        {code}
                        {i + 1}
                      </span>
                      <span className={styles.optionLabel}>{v.label}</span>
                    </label>
                  ))}
                </div>
              </fieldset>

              <button
                type="button"
                className={styles.add}
                aria-haspopup="dialog"
                aria-controls="bag"
                onClick={(e) => {
                  addItem({ slug: w.slug, variantId: variant.id, name: w.ref, variantLabel: variant.label, price: w.price });
                  openBag(e.currentTarget, `${w.ref} ${w.name}, ${variant.label}`);
                }}
              >
                <span>Add to bag</span>
                <span aria-hidden>{formatPrice(w.price)}</span>
              </button>
              <p className={`mono ${styles.fine}`}>Concept project — nothing is for sale.</p>
            </div>

            {/* What comes with it: the Calibration and Service sections' promises */}
            <ul className={styles.assurances}>
              <li>
                <span className="mono">Rate</span>
                <span>
                  Regulated to {TOLERANCE} in five positions
                </span>
              </li>
              <li>
                <span className="mono">Record</span>
                <span>Signed calibration record in the box</span>
              </li>
              <li>
                <span className="mono">Service</span>
                <Link href="/#service" className={styles.inline}>
                  Checked every year, free <span aria-hidden>→</span>
                </Link>
              </li>
            </ul>
          </div>
        </div>
      </div>

      {/* Full specification, drawn as an engineering sheet */}
      <section className={`container ${styles.specs}`} aria-labelledby="spec-title">
        <div className={styles.specHead}>
          <p className={`mono ${styles.eyebrow}`}>
            <span>Specification</span>
            <span className={styles.rule} aria-hidden />
            <span>{w.ref}</span>
          </p>
          <h2 id="spec-title" className={styles.specTitle}>
            Every figure, to the tenth.
          </h2>
        </div>

        <div className={styles.drawing}>
          {/* Sheet check: measured rows are read, stated rows are passed; hooks are data-sc */}
          <SheetCheck className={styles.groups}>
            {groups.map((g, gi) => (
              <section key={g.title} className={styles.group} aria-labelledby={`spec-${gi}`} data-sc="group">
                <h3 id={`spec-${gi}`} className={`mono ${styles.groupTitle}`} data-sc="title">
                  <span className={styles.groupIndex}>{pad(gi + 1)}</span>
                  {g.title}
                </h3>
                <dl className={styles.rows}>
                  {g.rows.map((r) => (
                    <div key={r.key} className={styles.row} data-sc="row">
                      <dt className="mono">{r.key}</dt>
                      <dd>
                        <span
                          className={styles.value}
                          data-sc="value"
                          data-count={r.count ? JSON.stringify(r.count) : undefined}
                        >
                          {r.value}
                          {r.signoff && <span className={styles.tick} data-sc="tick" aria-hidden />}
                        </span>
                        {r.count && <span className={styles.roll} data-sc="roll" aria-hidden />}
                      </dd>
                    </div>
                  ))}
                </dl>
                <span className={styles.check} data-sc="line" aria-hidden />
              </section>
            ))}
          </SheetCheck>

          {/* Title block, bottom edge of the drawing */}
          <dl className={`mono ${styles.titleBlock}`}>
            <div className={styles.tbMark}>
              <dt className="visually-hidden">Maker</dt>
              <dd>GAUGE</dd>
            </div>
            <div>
              <dt>Title</dt>
              <dd>
                {w.ref} {w.name}
              </dd>
            </div>
            <div>
              <dt>{w.variantKind}</dt>
              <dd>{variant.label}</dd>
            </div>
            <div>
              <dt>Tolerance</dt>
              <dd>{TOLERANCE}</dd>
            </div>
            <div>
              <dt>Sheet</dt>
              <dd>
                {pad(sheet)}/{pad(sheets)}
              </dd>
            </div>
            <div>
              <dt>Rev.</dt>
              <dd>2026-10</dd>
            </div>
          </dl>
        </div>
      </section>
    </article>
  );
}
