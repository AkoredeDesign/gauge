/*
 * Every photograph on the site, keyed by slot (the shot codes in watches.ts).
 * Files are built by scripts/build-images.mjs (`npm run images`) from
 * gauge-images/final into public/images/<file>-<width>.{avif,webp}; width and
 * height are the source's real size, which sets each frame's aspect ratio.
 */

export type Tone = "light" | "dark";

export type Image = {
  /** Source file name without extension */
  file: string;
  width: number;
  height: number;
  alt: string;
  /** "light": warm-grey plate shots; "dark": graphite scene shots (corner marks go light) */
  tone: Tone;
  /** Where the watch sits, as object-position percentages, for frames that crop */
  focus: [x: number, y: number];
};

/** The widths the build writes, before capping at the source width */
const WIDTHS = [640, 1024, 1600];

const PORTRAIT = { width: 1122, height: 1402 };
const LANDSCAPE = { width: 1536, height: 1024 };

const FILES = {
  "c01-movement": { ...LANDSCAPE, tone: "dark", focus: [40, 55] },
  "g01-bench": { ...PORTRAIT, tone: "dark", focus: [46, 47] },
  "g01-case": { ...PORTRAIT, tone: "dark", focus: [60, 55] },
  "g01-concrete": { ...PORTRAIT, tone: "light", focus: [50, 47] },
  "g01-hero": { ...PORTRAIT, tone: "dark", focus: [67, 43] },
  "g01-master": { ...PORTRAIT, tone: "light", focus: [50, 47] },
  "g01-three-quarter": { ...PORTRAIT, tone: "dark", focus: [45, 45] },
  "g01-wrist": { ...PORTRAIT, tone: "dark", focus: [50, 44] },
  "g02-bezel": { ...LANDSCAPE, tone: "dark", focus: [50, 50] },
  "g02-bracelet": { ...PORTRAIT, tone: "light", focus: [50, 47] },
  "g02-profile": { ...LANDSCAPE, tone: "dark", focus: [50, 50] },
  "g02-range": { ...PORTRAIT, tone: "dark", focus: [52, 45] },
  "g02-rubber": { ...PORTRAIT, tone: "light", focus: [50, 47] },
  "g02-wet": { ...PORTRAIT, tone: "dark", focus: [49, 45] },
  "g03-caseback": { ...PORTRAIT, tone: "dark", focus: [50, 45] },
  "g03-dial": { ...LANDSCAPE, tone: "light", focus: [50, 50] },
  "g03-profile": { ...PORTRAIT, tone: "dark", focus: [37, 43] },
  "g03-suede": { ...PORTRAIT, tone: "light", focus: [50, 47] },
  "g03-tan": { ...PORTRAIT, tone: "light", focus: [50, 47] },
} satisfies Record<string, Omit<Image, "file" | "alt">>;

type File = keyof typeof FILES;

/** `focus` overrides the file's own, for a slot whose frames crop differently */
const shot = (file: File, alt: string, focus?: Image["focus"]): Image => ({
  file,
  alt,
  ...(FILES[file] as Omit<Image, "file" | "alt">),
  ...(focus && { focus }),
});

export const IMAGES = {
  // Home
  "IMG-H01": shot(
    "g01-hero",
    "GAUGE-01 Field, black dial, steel bracelet, on a dark steel bench under a calibration grid beside a digital caliper reading zero.",
  ),
  "IMG-R01": shot("g01-master", "GAUGE-01 Field, black dial, steel bracelet, front-on on a warm-grey ground steel plate."),
  "IMG-R02": shot(
    "g02-range",
    "GAUGE-02 Depth, black dial and bezel with an orange seconds hand, on a black rubber strap at three-quarter angle on a dark grid mat.",
  ),
  // Range (5:4 on phones) and Collection (4:3, 5:4) crop top and bottom: centred on the case, lug to lug
  "IMG-R03": shot(
    "g03-profile",
    "GAUGE-03 Bench in profile on a grey suede strap, beside a fanned set of steel feeler gauges.",
    [37, 35],
  ),
  "IMG-C01": shot(
    "c01-movement",
    "A GAUGE movement clamped in a steel holder on a dark bench, with the timegrapher screen, a caliper and a screwdriver around it.",
  ),

  // GAUGE-01 Field
  "IMG-P01-A1": shot("g01-master", "GAUGE-01 Field, black dial, steel bracelet, front-on on a warm-grey ground steel plate."),
  "IMG-P01-A2": shot("g01-concrete", "GAUGE-01 Field, concrete grey dial, steel bracelet, front-on on a warm-grey ground steel plate."),
  "IMG-P01-B": shot(
    "g01-three-quarter",
    "GAUGE-01 Field at three-quarter angle from the crown side, raking light along the bead-blasted flank and brushed bevel.",
  ),
  "IMG-P01-C": shot("g01-case", "GAUGE-01 Field case in profile beside an upright steel rule marked in millimetres."),
  "IMG-P01-D": shot("g01-wrist", "GAUGE-01 Field on a wrist with a dark cuff, resting on a workbench beside a caliper."),

  // GAUGE-02 Depth
  "IMG-P02-A1": shot("g02-rubber", "GAUGE-02 Depth, black dial and bezel, black rubber strap, front-on on a warm-grey ground steel plate."),
  "IMG-P02-A2": shot("g02-bracelet", "GAUGE-02 Depth, black dial and bezel, steel bracelet, front-on on a warm-grey ground steel plate."),
  "IMG-P02-B": shot(
    "g02-bezel",
    "Close-up of the GAUGE-02 bezel graduations and lume pip in raking light, the orange seconds hand at the centre.",
  ),
  "IMG-P02-C": shot("g02-profile", "GAUGE-02 Depth in profile on dark steel, the screw-down crown set between its guards."),
  "IMG-P02-D": shot("g02-wet", "GAUGE-02 Depth on its rubber strap, beaded with water, lying on the shoulder of a steel dive cylinder."),

  // GAUGE-03 Bench
  "IMG-P03-A1": shot("g03-tan", "GAUGE-03 Bench, silver dial, tan leather strap, front-on on a warm-grey ground steel plate."),
  "IMG-P03-A2": shot("g03-suede", "GAUGE-03 Bench, silver dial, grey suede strap, front-on on a warm-grey ground steel plate."),
  "IMG-P03-B": shot("g03-dial", "Close-up of the GAUGE-03 silver dial, its printed minute track, applied indices and a faceted hand."),
  "IMG-P03-C": shot("g03-caseback", "GAUGE-03 Bench case back, the hand-wound G-12 movement seen through sapphire, on a tan leather strap."),
  "IMG-P03-D": shot("g03-profile", "GAUGE-03 Bench in profile on a grey suede strap, beside a fanned set of steel feeler gauges."),
} satisfies Record<string, Image>;

export type Slot = keyof typeof IMAGES;

export const getImage = (slot: string): Image | undefined => IMAGES[slot as Slot];

/** The widths built for an image (capped at its source width) */
export const widthsOf = (img: Image) => [...new Set(WIDTHS.map((w) => Math.min(w, img.width)))];

export const srcOf = (img: Image, width: number, format: "avif" | "webp") => `/images/${img.file}-${width}.${format}`;

export const srcSetOf = (img: Image, format: "avif" | "webp") =>
  widthsOf(img)
    .map((w) => `${srcOf(img, w, format)} ${w}w`)
    .join(", ");

/** Social card, built from the bench shot (public/og.jpg) */
export const OG_IMAGE = {
  url: "/og.jpg",
  width: 1200,
  height: 630,
  alt: "GAUGE-01 Field, black dial, steel bracelet, on a dark steel bench beside a caliper and a spring-bar tool.",
};
