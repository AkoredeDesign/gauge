"use client";

import { useEffect, useRef, useState, type KeyboardEvent, type MouseEvent, type SyntheticEvent } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import Shot from "@/components/ui/Shot/Shot";
import { setScrollLock } from "@/lib/scrollLock";
import { takeOpener, useBagDrawer } from "@/lib/store/useBagDrawer";
import { MAX_QTY, selectItemCount, selectSubtotal, useCartStore, type CartItem } from "@/lib/store/useCartStore";
import { formatPrice, getWatch, WATCHES } from "@/lib/watches";
import styles from "./BagDrawer.module.css";

/** "GAUGE-01 Field, Matte black" — the line as it is read out and labelled */
const describe = (item: CartItem) => {
  const w = getWatch(item.slug);
  return `${w ? `${w.ref} ${w.name}` : item.name}, ${item.variantLabel}`;
};
const shotOf = (item: CartItem) => getWatch(item.slug)?.variants.find((v) => v.id === item.variantId)?.shot;

// Slide: transform only, through the Web Animations API, so it runs on the
// compositor and keeps moving while the main thread is busy (Add to bag re-renders
// the lines just as the drawer opens). A damped stop, no overshoot: an overshoot
// would open a gap at the screen's right edge.
const OPEN_MS = 260;
const CLOSE_MS = 180;
const EASE = "cubic-bezier(0.16, 1, 0.3, 1)"; // = --ease-out
// Backdrop: half on the first frame, full at ~83ms. Stepped, never a fade
const WASH_MS = 166;
const reduced = () => matchMedia("(prefers-reduced-motion: reduce)").matches;
/** The dialog's current horizontal offset, mid-slide or at rest */
const offsetOf = (el: HTMLElement) => new DOMMatrixReadOnly(getComputedStyle(el).transform).m41;

/**
 * The bag: a modal drawer from the right, over every page (mounted once, in the
 * root layout). A native <dialog> opened with showModal(), so the page behind is
 * inert and Escape closes it; Tab wraps at the edges, so focus never leaves it.
 * Also closes on a tap outside the panel, the Close button, or a route change.
 * Holds the shared scroll lock while open and hands focus back to the control
 * that opened it. Slides in and out (none under reduced motion); every state
 * change happens at once, and the slide-out is an inert ghost over a live page.
 *
 * This is the one place the cart store is rehydrated from sessionStorage.
 * Concept project: checkout is disabled.
 */
export default function BagDrawer() {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);
  const listRef = useRef<HTMLUListElement>(null);

  const open = useBagDrawer((s) => s.open);
  const added = useBagDrawer((s) => s.added);
  const closeBag = useBagDrawer((s) => s.closeBag);

  const items = useCartStore((s) => s.items);
  const count = useCartStore(selectItemCount);
  const subtotal = useCartStore(selectSubtotal);
  const updateQuantity = useCartStore((s) => s.updateQuantity);
  const removeItem = useCartStore((s) => s.removeItem);

  // What the status region reads out after a change inside the drawer
  const [status, setStatus] = useState("");

  // The cart store skips hydration so server and first client render agree (empty);
  // the stored bag is read in once, here, after hydration
  useEffect(() => {
    useCartStore.persist.rehydrate();
  }, []);

  const slideRef = useRef<Animation | null>(null);
  // Bumped by every open and close, so a slide-out that finishes after a reopen
  // can't hide the drawer
  const genRef = useRef(0);
  // Set when a route change closes the bag: that close is instant
  const instantRef = useRef(false);

  /** Stops any slide in flight and returns where the panel was (px from rest) */
  const stopSlide = (dialog: HTMLDialogElement) => {
    const x = slideRef.current ? offsetOf(dialog) : null;
    slideRef.current?.cancel();
    slideRef.current = null;
    return x;
  };

  // Open state → the dialog, the scroll lock, focus and the slide. Nothing here
  // waits on an animation: every state change lands in this task.
  useEffect(() => {
    const dialog = dialogRef.current!;
    const gen = ++genRef.current;

    if (open && !dialog.open) {
      instantRef.current = false;
      // A reopen during the slide-out picks the panel up where it is
      const from = stopSlide(dialog);
      // Un-inert before showModal, or focusing Close would fail silently
      dialog.removeAttribute("data-leaving");
      dialog.inert = false;
      dialog.showModal();
      setScrollLock("bag", true);
      // Focus enters at Close (before the first frame paints): the one control
      // that is there full or empty
      closeRef.current?.focus({ preventScroll: true });

      if (!reduced()) {
        const w = dialog.offsetWidth;
        const x = from ?? w;
        if (x > 0) {
          slideRef.current = dialog.animate(
            [{ transform: `translateX(${x}px)` }, { transform: "none" }],
            { duration: OPEN_MS * Math.min(1, x / w), easing: EASE },
          );
        }
        dialog.animate([{ opacity: 0 }, { opacity: 1 }], {
          duration: WASH_MS,
          easing: "steps(2, jump-start)",
          pseudoElement: "::backdrop",
        });
      }
    } else if (!open && dialog.open) {
      const w = dialog.offsetWidth;
      const from = stopSlide(dialog) ?? 0;
      const instant = instantRef.current || reduced();
      instantRef.current = false;
      setStatus("");
      // Close first: a modal dialog makes the rest of the page inert, so the opener
      // can't take focus (and the page can't be used) until it's closed. The
      // backdrop goes with it: the page is live from this frame.
      const back = takeOpener();
      dialog.close();
      setScrollLock("bag", false);

      if (!instant && from < w) {
        // The panel stays painted as an inert ghost while it slides out (CSS keeps
        // [data-leaving] displayed above the header, with no pointer events)
        dialog.setAttribute("data-leaving", "");
        dialog.inert = true;
        const slide = dialog.animate(
          [{ transform: `translateX(${from}px)` }, { transform: `translateX(${w}px)` }],
          { duration: CLOSE_MS * (1 - from / w), easing: EASE },
        );
        slideRef.current = slide;
        slide.onfinish = () => {
          if (genRef.current !== gen) return;
          slideRef.current = null;
          dialog.removeAttribute("data-leaving");
          dialog.inert = false;
        };
      }
      if (back?.isConnected) back.focus({ preventScroll: true });
    }
  }, [open]);

  useEffect(
    () => () => {
      slideRef.current?.cancel();
      setScrollLock("bag", false);
    },
    [],
  );

  // Leaving the page closes the bag (a product link in the empty state), at once:
  // a slide-out over a page that's being replaced would read as stale
  const pathname = usePathname();
  useEffect(() => {
    if (useBagDrawer.getState().open) instantRef.current = true;
    closeBag();
  }, [pathname, closeBag]);

  // Escape: keep the store in step instead of letting the browser close it alone
  const onCancel = (e: SyntheticEvent) => {
    e.preventDefault();
    closeBag();
  };
  // Tab wraps at the edges: a modal dialog alone would let focus out to the browser
  // chrome between the last control and the first. Read per keypress, since lines
  // (and their buttons) come and go while it's open.
  const onKeyDown = (e: KeyboardEvent<HTMLDialogElement>) => {
    if (e.key !== "Tab") return;
    const items = Array.from(
      e.currentTarget.querySelectorAll<HTMLElement>("a[href], button:not([disabled]), input, [tabindex]:not([tabindex='-1'])"),
    );
    if (!items.length) return;
    const [first, last] = [items[0], items[items.length - 1]];
    const at = document.activeElement;
    if (e.shiftKey ? at === first || !items.includes(at as HTMLElement) : at === last) {
      e.preventDefault();
      (e.shiftKey ? last : first).focus();
    }
  };

  // A click on the dialog itself is a click on the backdrop: the panel fills it.
  // It only counts when the press started on the backdrop too: a drag out of the
  // panel isn't a tap outside. Nor is the second press of a double-click that
  // opened the bag (Add to bag), which lands on the backdrop it just put there.
  const pressedOutside = useRef(false);
  const onMouseDown = (e: MouseEvent<HTMLDialogElement>) => {
    pressedOutside.current = e.target === e.currentTarget && e.detail < 2;
  };
  const onClick = (e: MouseEvent<HTMLDialogElement>) => {
    if (e.target === e.currentTarget && pressedOutside.current) closeBag();
    pressedOutside.current = false;
  };

  const step = (item: CartItem, by: number) => {
    const q = item.quantity + by;
    if (q < 1 || q > MAX_QTY) return;
    updateQuantity(item.id, q);
    setStatus(`${describe(item)}: quantity ${q}.`);
  };

  // The removed line's Remove button goes with it; focus moves to the next line's,
  // or the previous one's, or Close when the bag is now empty
  const remove = (item: CartItem, index: number) => {
    removeItem(item.id);
    setStatus(`Removed ${describe(item)}.`);
    requestAnimationFrame(() => {
      const buttons = listRef.current?.querySelectorAll<HTMLButtonElement>("[data-remove]") ?? [];
      const next = buttons[Math.min(index, buttons.length - 1)];
      (next ?? closeRef.current)?.focus({ preventScroll: true });
    });
  };

  return (
    <dialog
      ref={dialogRef}
      id="bag"
      className={styles.dialog}
      aria-labelledby="bag-title"
      aria-describedby={added ? "bag-added" : undefined}
      onCancel={onCancel}
      onClose={() => open && closeBag()}
      onMouseDown={onMouseDown}
      onClick={onClick}
      onKeyDown={onKeyDown}
    >
      <div className={styles.panel}>
        <header className={styles.head}>
          <h2 id="bag-title" className={styles.title}>
            Bag <span className={`mono ${styles.count}`}>[{count}]</span>
          </h2>
          <button ref={closeRef} type="button" className={`mono ${styles.close}`} onClick={closeBag}>
            Close
          </button>
        </header>

        {added && (
          <p id="bag-added" className={`mono ${styles.added}`}>
            <span className={styles.addedKey}>Added</span> {added}
          </p>
        )}

        <div className={styles.body}>
          {items.length ? (
            <ul ref={listRef} className={styles.lines}>
              {items.map((item, i) => {
                const shot = shotOf(item);
                const label = describe(item);
                return (
                  <li key={item.id} className={styles.line}>
                    {shot && <Shot slot={shot.code} sizes="64px" compact className={styles.thumb} />}
                    <div className={styles.info}>
                      <p className={styles.name}>
                        {getWatch(item.slug)?.ref ?? item.name}{" "}
                        <span className={styles.model}>{getWatch(item.slug)?.name}</span>
                      </p>
                      <p className={styles.variant}>{item.variantLabel}</p>
                      <p className={`mono ${styles.each}`}>{formatPrice(item.price)} each</p>
                    </div>
                    <p className={styles.total}>{formatPrice(item.price * item.quantity)}</p>

                    <div className={styles.controls}>
                      {/* aria-disabled, not disabled: a disabled button drops focus to the page */}
                      <div className={styles.stepper} role="group" aria-label={`Quantity, ${label}`}>
                        <button
                          type="button"
                          className={styles.step}
                          aria-label="Decrease quantity"
                          aria-disabled={item.quantity <= 1}
                          onClick={() => step(item, -1)}
                        >
                          −
                        </button>
                        <span className={`mono ${styles.qty}`}>{item.quantity}</span>
                        <button
                          type="button"
                          className={styles.step}
                          aria-label="Increase quantity"
                          aria-disabled={item.quantity >= MAX_QTY}
                          onClick={() => step(item, 1)}
                        >
                          +
                        </button>
                      </div>
                      <button
                        type="button"
                        className={`mono ${styles.remove}`}
                        aria-label={`Remove ${label}`}
                        data-remove
                        onClick={() => remove(item, i)}
                      >
                        Remove
                      </button>
                    </div>
                  </li>
                );
              })}
            </ul>
          ) : (
            <div className={styles.empty}>
              <p className={`mono ${styles.emptyCode}`}>00 items</p>
              <p className={styles.emptyTitle}>Your bag is empty.</p>
              <p className={styles.emptyBody}>Nothing on the bench yet. GAUGE makes three references:</p>
              <ul className={styles.refs}>
                {WATCHES.map((w) => (
                  <li key={w.slug}>
                    <Link href={`/product/${w.slug}`} className={styles.ref}>
                      <span className="mono">{w.ref}</span>
                      <span>{w.name}</span>
                      <span className={`mono ${styles.refPrice}`}>{formatPrice(w.price)}</span>
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>

        {items.length > 0 && (
          <footer className={styles.foot}>
            <div className={styles.subtotal}>
              <span className="mono">Subtotal</span>
              <span className={styles.subtotalValue}>{formatPrice(subtotal)}</span>
            </div>
            <button type="button" className={styles.checkout} disabled aria-describedby="bag-note">
              Checkout
            </button>
            <p id="bag-note" className={`mono ${styles.note}`}>
              Concept project, no real checkout.
            </p>
          </footer>
        )}

        <p className="visually-hidden" role="status">
          {status}
        </p>
      </div>
    </dialog>
  );
}
