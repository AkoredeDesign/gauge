import type { Metadata } from "next";
import Link from "next/link";
import { WATCHES } from "@/lib/watches";
import styles from "./not-found.module.css";

export const metadata: Metadata = { title: "Not found — GAUGE" };

/** 404 for unknown URLs and unknown /product/[slug]s. Rendered inside the root layout. */
export default function NotFound() {
  return (
    <main id="main" className={styles.page}>
      <div className="container">
        <p className={`mono ${styles.eyebrow}`}>
          <span>Error 404</span>
          <span className={styles.rule} aria-hidden />
          <span>Reading out of range</span>
        </p>
        <h1 className={styles.title}>Nothing at this address.</h1>
        <p className={styles.body}>GAUGE makes three references. The page you asked for isn&rsquo;t one of them.</p>

        <ul className={styles.links}>
          {WATCHES.map((w) => (
            <li key={w.slug}>
              <Link href={`/product/${w.slug}`} className={styles.link}>
                <span className="mono">{w.ref}</span>
                <span>{w.name}</span>
                <span aria-hidden>→</span>
              </Link>
            </li>
          ))}
          <li>
            <Link href="/" className={styles.link}>
              <span className="mono">Home</span>
              <span>Back to the start</span>
              <span aria-hidden>→</span>
            </Link>
          </li>
        </ul>
      </div>
    </main>
  );
}
