"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";
import styles from "./NewsletterCard.module.css";

/** Newsletter capture overlaid on the hero image. Honest-fake: nothing is sent. */
export default function NewsletterCard({ className }: { className?: string }) {
  const [submitted, setSubmitted] = useState(false);
  const noteRef = useRef<HTMLParagraphElement>(null);

  // The note replaces the form, so focus would otherwise fall back to the page.
  // Moving it onto the note keeps the reader's place and reads it out.
  useEffect(() => {
    if (submitted) noteRef.current?.focus();
  }, [submitted]);

  function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSubmitted(true);
  }

  return (
    <aside className={[styles.card, className].filter(Boolean).join(" ")} aria-labelledby="bulletin-title">
      <div className={styles.head}>
        <span className="mono">Bulletin</span>
        <span className="mono">No. 001</span>
      </div>

      <h2 id="bulletin-title" className={styles.title}>
        Calibration notes
      </h2>
      <p className={styles.body}>New references, bench notes and limited runs. Monthly, no noise.</p>

      {submitted ? (
        <p ref={noteRef} className={`mono ${styles.confirm}`} tabIndex={-1}>
          Logged. Concept project — no email was sent or stored.
        </p>
      ) : (
        <form className={styles.form} onSubmit={handleSubmit}>
          <label htmlFor="hero-email" className="visually-hidden">
            Email address
          </label>
          <input
            id="hero-email"
            type="email"
            required
            placeholder="you@workshop.com"
            autoComplete="email"
            className={styles.input}
          />
          <button type="submit" className={styles.submit}>
            Subscribe
          </button>
        </form>
      )}

      <p className={`mono ${styles.fine}`}>Concept project — emails are not collected.</p>
    </aside>
  );
}
