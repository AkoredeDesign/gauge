import styles from "./Placeholder.module.css";

type PlaceholderProps = {
  /** What the final (AI-generated) image should show */
  label: string;
  /** Short shot code, e.g. "IMG-H01" */
  code?: string;
  /** CSS aspect-ratio, e.g. "4 / 5". `null` leaves sizing to the caller's CSS. */
  ratio?: string | null;
  className?: string;
  /** Thumbnail: the code only (the label stays as the accessible name) */
  compact?: boolean;
};

/** Labelled stand-in for photography until imagery is generated. */
export default function Placeholder({ label, code, ratio = "4 / 5", className, compact }: PlaceholderProps) {
  if (compact) {
    return (
      <div
        className={[styles.placeholder, styles.compact, className].filter(Boolean).join(" ")}
        style={ratio ? { aspectRatio: ratio } : undefined}
        role="img"
        aria-label={`Image placeholder: ${label}`}
      >
        {code && <span className={`mono ${styles.code}`}>{code}</span>}
      </div>
    );
  }

  return (
    <div
      className={[styles.placeholder, className].filter(Boolean).join(" ")}
      style={ratio ? { aspectRatio: ratio } : undefined}
      role="img"
      aria-label={`Image placeholder: ${label}`}
    >
      {/* data-corner: hook for motion that clamps the marks in (e.g. Inspection pass) */}
      <span className={styles.corner} data-pos="tl" data-corner aria-hidden />
      <span className={styles.corner} data-pos="tr" data-corner aria-hidden />
      <span className={styles.corner} data-pos="bl" data-corner aria-hidden />
      <span className={styles.corner} data-pos="br" data-corner aria-hidden />
      <span className={styles.crosshair} aria-hidden />

      <div className={styles.meta}>
        {code && <span className={`mono ${styles.code}`}>{code}</span>}
        <span className={`mono ${styles.label}`}>{label}</span>
      </div>
    </div>
  );
}
