import Link from "next/link";
import BagButton from "@/components/bag/BagButton";
import BackToTop from "./BackToTop";
import styles from "./Footer.module.css";

// Only routes the site will have: /collection, product pages and the home
// page sections that stand in for Calibration and Service pages.
const COLUMNS: { title: string; links: { href: string; label: string }[] }[] = [
  {
    title: "Watches",
    links: [
      { href: "/product/gauge-01", label: "GAUGE-01 Field" },
      { href: "/product/gauge-02", label: "GAUGE-02 Depth" },
      { href: "/product/gauge-03", label: "GAUGE-03 Bench" },
      { href: "/collection", label: "All watches" },
    ],
  },
  {
    title: "Owners",
    links: [
      { href: "/#calibration", label: "How we calibrate" },
      { href: "/#service", label: "Service & warranty" },
      { href: "/#service", label: "Book a service" },
      { href: "#bag", label: "Bag" }, // opens the bag drawer, not a page
    ],
  },
];

/** Site footer: the dark band again, closing every page. Concept project. */
export default function Footer() {
  return (
    <footer className={styles.footer} data-theme="dark">
      {/* Machinist rule along the top edge: bookends the hero's bottom rule */}
      <div className={styles.ruler} aria-hidden />

      <div className={`container ${styles.top}`}>
        <div className={styles.brand}>
          <Link href="/" className={styles.wordmark} aria-label="GAUGE — home">
            GAUGE
          </Link>
          <p className={styles.line}>
            Mechanical watches made the way a machine shop makes gauges. Regulated to ±2
            seconds a day, and checked for life.
          </p>
        </div>

        <nav className={styles.columns} aria-label="Footer">
          {COLUMNS.map((col) => (
            <div key={col.title} className={styles.column}>
              <h2 className={`mono ${styles.title}`}>{col.title}</h2>
              <ul>
                {col.links.map((l) => (
                  <li key={l.label}>
                    {l.href === "#bag" ? (
                      <BagButton className={styles.link} />
                    ) : (
                      <Link href={l.href} className={styles.link}>
                        {l.label}
                      </Link>
                    )}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </nav>
      </div>

      <div className="container">
        <p className={styles.disclosure}>
          <span className={`mono ${styles.tag}`}>Concept project</span>
          GAUGE is not a real company. The watches, records and prices on this site are made
          up, and nothing is for sale.
        </p>

        {/* Legal row, ruled like a drawing's title block */}
        <div className={`mono ${styles.legal}`}>
          <span>© 2026 GAUGE</span>
          <span className={styles.rev}>Sheet 01/01 · Rev. 2026-10</span>
          <BackToTop className={styles.toTop}>
            Back to top <span aria-hidden>↑</span>
          </BackToTop>
        </div>
      </div>
    </footer>
  );
}
