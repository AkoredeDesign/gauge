import { getImageProps, type ImageLoader } from "next/image";
import type { CSSProperties } from "react";
import { getImage, srcOf, srcSetOf, widthsOf, type Image } from "@/data/images";
import styles from "./Shot.module.css";

type ShotProps = {
  /** Slot key in src/data/images.ts, e.g. "IMG-H01" */
  slot: string;
  /** Rendered width per breakpoint, for srcset selection */
  sizes: string;
  className?: string;
  /** Above the fold and the likely LCP: load at once, at high priority */
  eager?: boolean;
  /** Thumbnail: no registration marks */
  compact?: boolean;
  /** Phones: a tighter crop centred on the watch (see NARROW_ZOOM) */
  narrowCrop?: boolean;
  /** Stacked with other shots in one frame and not the one showing */
  hiddenShot?: boolean;
};

/**
 * Narrow-crop zoom. On phones the <picture> picks a source sized to 125vw, so the
 * image's natural width is 125vw against a frame of about 79vw (86% of the swipe
 * strip): rendered with object-fit: none it is ~1.58 times the frame, and
 * object-position chooses the part that shows.
 */
const NARROW = "(max-width: 860px)";
const NARROW_SIZES = "125vw";
const NARROW_ZOOM = 1.58;

/** object-position (%) that puts the focus point at the frame's centre under the zoom */
const centreOn = (focus: number) => {
  const p = ((focus / 100) * NARROW_ZOOM - 0.5) / (NARROW_ZOOM - 1);
  return `${Math.round(Math.min(1, Math.max(0, p)) * 100)}%`;
};

/** Built files only: the nearest width at or above the request, else the largest */
const loaderFor =
  (img: Image): ImageLoader =>
  ({ width }) => {
    const widths = widthsOf(img);
    return srcOf(img, widths.find((w) => w >= width) ?? widths[widths.length - 1], "webp");
  };

/**
 * A photograph in a pre-sized frame: AVIF with a WebP fallback, built ahead by
 * scripts/build-images.mjs. The frame takes its aspect ratio from the source's
 * real size (a caller's class can set a deliberate crop instead), so nothing
 * moves when the image arrives.
 */
export default function Shot({ slot, sizes, className, eager, compact, narrowCrop, hiddenShot }: ShotProps) {
  const img = getImage(slot);
  if (!img) throw new Error(`No image for slot ${slot}`);

  const { props } = getImageProps({
    src: `/images/${img.file}`,
    loader: loaderFor(img),
    width: img.width,
    height: img.height,
    alt: hiddenShot ? "" : img.alt,
    sizes,
    loading: eager ? "eager" : "lazy",
    fetchPriority: eager ? "high" : undefined,
  });

  const style = {
    "--ratio": `${img.width} / ${img.height}`,
    "--focus": `${img.focus[0]}% ${img.focus[1]}%`,
    "--narrow-focus": narrowCrop ? `${centreOn(img.focus[0])} ${centreOn(img.focus[1])}` : undefined,
  } as CSSProperties;

  return (
    <div
      className={[styles.frame, narrowCrop && styles.narrowCrop, className].filter(Boolean).join(" ")}
      data-tone={img.tone}
      data-shown={hiddenShot ? "false" : undefined}
      aria-hidden={hiddenShot || undefined}
      style={style}
    >
      <picture>
        {narrowCrop && (
          <>
            <source media={NARROW} type="image/avif" srcSet={srcSetOf(img, "avif")} sizes={NARROW_SIZES} />
            <source media={NARROW} type="image/webp" srcSet={srcSetOf(img, "webp")} sizes={NARROW_SIZES} />
          </>
        )}
        <source type="image/avif" srcSet={srcSetOf(img, "avif")} sizes={sizes} />
        {/* next/image's props on a plain <img>, so <picture> can offer AVIF first */}
        <img {...props} alt={props.alt} srcSet={srcSetOf(img, "webp")} className={styles.img} />
      </picture>

      {!compact &&
        ["tl", "tr", "bl", "br"].map((pos) => (
          // data-corner: hook for motion that clamps the marks in (e.g. Inspection pass)
          <span key={pos} className={styles.corner} data-pos={pos} data-corner aria-hidden />
        ))}
    </div>
  );
}
