"use client";

import { useEffect, useRef, useState } from "react";
import styles from "./Service.module.css";

/** "Book a service". Honest-fake, like the newsletter card: nothing is booked. */
export default function BookService() {
  const [asked, setAsked] = useState(false);
  const noteRef = useRef<HTMLParagraphElement>(null);

  // The note replaces the button in place, so focus would otherwise fall back to the
  // page. Moving it onto the note keeps the reader's place, and focusing it reads it
  // out (no live region as well, or it is announced twice).
  useEffect(() => {
    if (asked) noteRef.current?.focus();
  }, [asked]);

  return asked ? (
    <p ref={noteRef} className={`mono ${styles.confirm}`} tabIndex={-1}>
      Concept project — no booking taken.
    </p>
  ) : (
    <button type="button" className={styles.cta} onClick={() => setAsked(true)}>
      Book a service
    </button>
  );
}
