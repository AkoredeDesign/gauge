/*
 * Builds the site's photography from gauge-images/final (kept out of public/):
 * WebP + AVIF at three widths per source, capped at the source width, into
 * public/images/, plus public/og.jpg. Run with `npm run images`.
 *
 * An output that already exists and is newer than its source is skipped, so a
 * rerun only encodes what changed. Prints each source's real size;
 * src/data/images.ts must carry the same figures.
 */
import { mkdir, readdir, stat } from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";

const SRC = "gauge-images/final";
const OUT = "public/images";
const WIDTHS = [640, 1024, 1600];
const OG = { from: "g01-bench.png", to: "public/og.jpg", width: 1200, height: 630 };

/** True when `out` exists and was written after `src` last changed */
const fresh = async (out, src) => {
  try {
    return (await stat(out)).mtimeMs > (await stat(src)).mtimeMs;
  } catch {
    return false;
  }
};

let written = 0;
let skipped = 0;
/** Encodes to `out` unless it is already fresh */
const build = async (out, src, encode) => {
  if (await fresh(out, src)) return skipped++;
  await encode().toFile(out);
  written++;
};

await mkdir(OUT, { recursive: true });

const files = (await readdir(SRC)).filter((f) => /\.(png|jpe?g)$/i.test(f)).sort();
for (const file of files) {
  const src = path.join(SRC, file);
  const { width, height } = await sharp(src).metadata();
  const name = path.parse(file).name;
  const widths = [...new Set(WIDTHS.map((w) => Math.min(w, width)))];
  for (const w of widths) {
    const resized = () => sharp(src).resize({ width: w });
    await build(path.join(OUT, `${name}-${w}.webp`), src, () => resized().webp({ quality: 78, effort: 6 }));
    // Effort 3: ~3 s per full-size image (effort 6 took ~21 min for the set)
    await build(path.join(OUT, `${name}-${w}.avif`), src, () => resized().avif({ quality: 52, effort: 3 }));
  }
  console.log(`${name}: ${width}x${height} -> ${widths.join(", ")}`);
}

// Open Graph card: centre crop of the bench shot, JPEG for size (~140 KB)
const ogSrc = path.join(SRC, OG.from);
await build(OG.to, ogSrc, () =>
  sharp(ogSrc).resize(OG.width, OG.height, { fit: "cover", position: "centre" }).jpeg({ quality: 90, mozjpeg: true }),
);
console.log(`${OG.to}: ${OG.width}x${OG.height} from ${OG.from}`);
console.log(`${written} written, ${skipped} up to date`);
