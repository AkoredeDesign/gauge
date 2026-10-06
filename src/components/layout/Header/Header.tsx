"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import BagButton from "@/components/bag/BagButton";
import { setScrollLock } from "@/lib/scrollLock";
import { useBagDrawer } from "@/lib/store/useBagDrawer";
import "@/lib/jump"; // records /#section jumps on every page, before the home page loads
import { useFlip, useIndexMarker, useScribe } from "./headerMotion";
import styles from "./Header.module.css";

// `match`: the path prefix that makes the link current. Calibration and Service are
// sections of the home page, not pages, so they are never "current".
const NAV: { href: string; match?: string; label: string }[] = [
  { href: "/collection", match: "/collection", label: "Watches" },
  { href: "/#calibration", label: "Calibration" },
  { href: "/#service", label: "Service" },
];

const isCurrent = (pathname: string, match?: string) =>
  match && (pathname === match || pathname.startsWith(match + "/")) ? "page" : undefined;

/** Fixed site header. Bag opens the bag drawer (BagDrawer, mounted in the layout). */
export default function Header() {
  const [open, setOpen] = useState(false);
  // Every way out of the menu — Escape, a link, a tap outside, widening — goes through here
  const close = useCallback(() => setOpen(false), []);

  const pathname = usePathname();
  const headerRef = useRef<HTMLElement>(null);
  const menuRef = useRef<HTMLElement>(null);
  const flipRef = useRef<HTMLSpanElement>(null);
  useIndexMarker(headerRef, pathname);
  useScribe(menuRef, open);
  useFlip(flipRef, open);

  // The bag opens over the page; the phone menu shouldn't stay open under it
  useEffect(() => useBagDrawer.subscribe((s) => s.open && close()), [close]);

  // Escape closes the phone menu
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && close();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, close]);

  // The page behind the open menu stays put
  useEffect(() => {
    setScrollLock("menu", open);
    return () => setScrollLock("menu", false);
  }, [open]);

  // Widening past the phone breakpoint hides the menu (CSS), so close it too —
  // otherwise the lock would outlive a menu nobody can see
  useEffect(() => {
    if (!open) return;
    const desktop = window.matchMedia("(min-width: 861px)");
    const onChange = () => desktop.matches && close();
    onChange();
    desktop.addEventListener("change", onChange);
    return () => desktop.removeEventListener("change", onChange);
  }, [open, close]);

  return (
    <header ref={headerRef} className={styles.header} data-open={open || undefined}>
      <a href="#main" className={`mono ${styles.skip}`}>
        Skip to content
      </a>

      <div className={`container ${styles.bar}`} data-hm="bar">
        <Link href="/" className={styles.wordmark} aria-label="GAUGE — home" data-hm="zero">
          GAUGE
        </Link>

        <nav className={styles.nav} aria-label="Primary" data-track>
          <ul>
            {NAV.map((item) => (
              <li key={item.href}>
                <Link
                  href={item.href}
                  className={`mono ${styles.link}`}
                  aria-current={isCurrent(pathname, item.match)}
                  data-mark
                >
                  {item.label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>

        <div className={styles.utility} data-track>
          <BagButton className={`mono ${styles.link}`} countClassName={styles.count} data-mark />
          <button
            type="button"
            className={`mono ${styles.menuButton}`}
            aria-expanded={open}
            aria-controls="site-menu"
            onClick={() => setOpen((v) => !v)}
          >
            <span ref={flipRef} className={styles.flip}>
              {open ? "Close" : "Menu"}
            </span>
          </button>
        </div>
      </div>

      {/* Index marker (desktop): reads the current section off the bottom hairline.
          The scale is the graduations it shows while travelling. */}
      <span className={styles.scale} data-hm="scale" aria-hidden="true" />
      <span className={styles.marker} data-hm="marker" aria-hidden="true" />

      {/* Tap anywhere outside the panel to close. Sits under the bar and the panel,
          so the Close button and the menu links still get their own taps. Mouse/touch
          only — keyboard users have Escape and the Close button. */}
      {open && <div className={styles.backdrop} onClick={close} aria-hidden="true" />}

      {/* Phone menu: rows are scribed in on open (useScribe); closing is instant */}
      <nav ref={menuRef} id="site-menu" className={styles.menu} aria-label="Primary" hidden={!open}>
        <ul className="container">
          {NAV.map((item, i) => (
            <li key={item.href} data-scribe-row>
              <Link
                href={item.href}
                className={styles.menuLink}
                aria-current={isCurrent(pathname, item.match)}
                onClick={close}
              >
                <span className={`mono ${styles.index}`} data-scribe="num">
                  {String(i + 1).padStart(2, "0")}
                </span>
                <span data-scribe="label">{item.label}</span>
                <span className={styles.rule} data-scribe="rule" aria-hidden="true" />
              </Link>
            </li>
          ))}
        </ul>
      </nav>
    </header>
  );
}
