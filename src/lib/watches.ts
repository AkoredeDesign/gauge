/*
 * The three references: the one source for names, specs, prices and blurbs.
 * Read by the hero spec strip, the Range sheets and /product/[slug]. Values are
 * stored once, as numbers or plain words; each view formats what it shows from
 * them (spec* helpers below), so a figure can't drift between pages.
 *
 * Concept project: none of these watches exist and nothing is for sale.
 */

/** The acceptance limit every reference is regulated to (the site's whole argument) */
export const TOLERANCE = "±2 s/day";

type Movement = {
  calibre: string;
  winding: "Automatic" | "Hand-wound";
  vph: number;
  jewels: number;
  reserveH: number;
  functions: string;
};

const MOVEMENTS = {
  "G-21": {
    calibre: "G-21",
    winding: "Automatic",
    vph: 28800,
    jewels: 25,
    reserveH: 42,
    functions: "Hours, minutes, central seconds; hacking",
  },
  "G-12": {
    calibre: "G-12",
    winding: "Hand-wound",
    vph: 21600,
    jewels: 17,
    reserveH: 56,
    functions: "Hours, minutes, small seconds at 6",
  },
} satisfies Record<string, Movement>;

export type Shot = { code: string; label: string };

/** One option in the product page's model switcher (a dial or a strap) */
export type Variant = {
  id: string; // = CartItem.variantId
  label: string;
  /** The front-on shot shows the selected variant */
  shot: Shot;
  /** A bracelet brings its own clasp */
  buckle?: string;
};

export type Watch = {
  slug: string;
  ref: string;
  name: string;
  /** One line, for the Range sheet */
  line: string;
  /** The product page's lede */
  description: string;
  price: number; // whole USD, display-only
  /** Range sheet image */
  card: Shot;
  /** Product gallery after the variant's front-on shot */
  gallery: Shot[];
  /** What the model switcher changes */
  variantKind: "Dial" | "Strap";
  variants: Variant[];
  case: {
    diameterMm: number;
    heightMm: number;
    lugToLugMm: number;
    lugWidthMm: number;
    material: string;
    bezel?: string;
    crystal: string;
    caseBack: string;
    crown: string;
    waterM: number;
  };
  movement: Movement;
  dial: { dial: string; hands: string; lume: string };
  /**
   * `strap` only when the switcher changes the dial; otherwise the variant is the strap.
   * `bracelet`: the band is a bracelet, so the sheet reads Bracelet and Clasp.
   */
  strap: { strap?: string; buckle: string; bracelet?: boolean };
};

export const WATCHES: Watch[] = [
  {
    slug: "gauge-01",
    ref: "GAUGE-01",
    name: "Field",
    line: "The everyday instrument. Matte black dial, faceted lume-filled hands, bead-blasted steel.",
    description:
      "The everyday instrument. A 40 mm bead-blasted case with brushed bevels, a dial printed like a panel gauge, faceted lume-filled hands and a flat-link steel bracelet, on an automatic calibre regulated to the same limit as everything we make.",
    price: 1450,
    card: { code: "IMG-R01", label: "GAUGE-01 Field, front-on, black dial, on a warm-grey ground steel plate" },
    gallery: [
      { code: "IMG-P01-B", label: "GAUGE-01 three-quarter view, crown side, raking light across the bead-blasted flanks and brushed bevels" },
      { code: "IMG-P01-C", label: "GAUGE-01 case profile beside a steel rule, showing the 11.2 mm height" },
      { code: "IMG-P01-D", label: "GAUGE-01 on the wrist at a workbench, sleeve rolled" },
    ],
    variantKind: "Dial",
    variants: [
      {
        id: "black",
        label: "Matte black",
        shot: { code: "IMG-P01-A1", label: "GAUGE-01 front-on, matte black dial, on a warm-grey ground steel plate" },
      },
      {
        id: "concrete",
        label: "Concrete grey",
        shot: { code: "IMG-P01-A2", label: "GAUGE-01 front-on, concrete grey dial, on a warm-grey ground steel plate" },
      },
    ],
    case: {
      diameterMm: 40,
      heightMm: 11.2,
      lugToLugMm: 47,
      lugWidthMm: 20,
      material: "316L steel, bead-blasted flanks, brushed bevels",
      crystal: "Sapphire, flat, AR inside",
      caseBack: "Steel, screw-down, serial engraved",
      crown: "Push-pull, signed",
      waterM: 100,
    },
    movement: MOVEMENTS["G-21"],
    dial: { dial: "Printed scale, applied indices", hands: "Faceted, lume-filled", lume: "Super-LumiNova BGW9" },
    strap: { strap: "Brushed stainless steel, flat-link, 20 mm", buckle: "Folding clasp", bracelet: true },
  },
  {
    slug: "gauge-02",
    ref: "GAUGE-02",
    name: "Depth",
    line: "A diver built like a depth gauge. 120-click bezel, screw-down crown, signal-orange hand.",
    description:
      "A diver built like a depth gauge. The 120-click bezel is graduated like a dial indicator, the crown screws down, and the seconds hand is the one orange thing on it.",
    price: 1690,
    card: { code: "IMG-R02", label: "GAUGE-02 Depth, three-quarter view, bezel graduations in raking light" },
    gallery: [
      { code: "IMG-P02-B", label: "GAUGE-02 bezel graduations in raking light, macro" },
      { code: "IMG-P02-C", label: "GAUGE-02 case profile, screw-down crown and guards" },
      { code: "IMG-P02-D", label: "GAUGE-02 wet, on a steel dive cylinder, overcast light" },
    ],
    variantKind: "Strap",
    variants: [
      {
        id: "rubber",
        label: "Black rubber",
        shot: { code: "IMG-P02-A1", label: "GAUGE-02 front-on, black rubber strap, on a warm-grey ground steel plate" },
      },
      {
        id: "bracelet",
        label: "Steel bracelet",
        shot: { code: "IMG-P02-A2", label: "GAUGE-02 front-on, steel bracelet, on a warm-grey ground steel plate" },
        buckle: "Steel fold-over clasp",
      },
    ],
    case: {
      diameterMm: 42,
      heightMm: 13.4,
      lugToLugMm: 49.5,
      lugWidthMm: 22,
      material: "316L steel, brushed with polished bevels",
      bezel: "Unidirectional, 120 clicks, steel insert",
      crystal: "Sapphire, domed, AR inside",
      caseBack: "Steel, screw-down, serial engraved",
      crown: "Screw-down, guarded",
      waterM: 300,
    },
    movement: MOVEMENTS["G-21"],
    dial: { dial: "Matte black, depth-scale chapter ring", hands: "Faceted sword, lume-filled, signal-orange seconds", lume: "Super-LumiNova BGW9" },
    strap: { buckle: "Steel pin buckle" },
  },
  {
    slug: "gauge-03",
    ref: "GAUGE-03",
    name: "Bench",
    line: "Hand-wound and thin. A dial printed like a vernier scale, for the wrist that works close.",
    description:
      "Hand-wound and thin. A 36 mm case under 9 mm tall, and a dial printed like a vernier scale, for the wrist that works close to the bench.",
    price: 1250,
    card: { code: "IMG-R03", label: "GAUGE-03 Bench, case profile beside a steel feeler gauge set" },
    gallery: [
      { code: "IMG-P03-B", label: "GAUGE-03 dial macro, vernier minute track" },
      { code: "IMG-P03-C", label: "GAUGE-03 case back, G-12 bridges through sapphire" },
      { code: "IMG-P03-D", label: "GAUGE-03 case profile beside a steel feeler gauge set" },
    ],
    variantKind: "Strap",
    variants: [
      {
        id: "tan",
        label: "Tan leather",
        shot: { code: "IMG-P03-A1", label: "GAUGE-03 front-on, tan leather strap, on a warm-grey ground steel plate" },
      },
      {
        id: "grey",
        label: "Grey suede",
        shot: { code: "IMG-P03-A2", label: "GAUGE-03 front-on, grey suede strap, on a warm-grey ground steel plate" },
      },
    ],
    case: {
      diameterMm: 36,
      heightMm: 8.6,
      lugToLugMm: 43,
      lugWidthMm: 18,
      material: "316L steel, brushed",
      crystal: "Sapphire, flat, AR inside",
      caseBack: "Sapphire display, screw-down",
      crown: "Push-pull, signed",
      waterM: 50,
    },
    movement: MOVEMENTS["G-12"],
    dial: { dial: "Silver, printed vernier minute track", hands: "Faceted, polished steel", lume: "None" },
    strap: { buckle: "Steel pin buckle" },
  },
];

export const getWatch = (slug: string) => WATCHES.find((w) => w.slug === slug);

// ---- Formatting: one place for every figure's display form -------------------

export const formatPrice = (usd: number) => `$${usd.toLocaleString("en-US")}`;
const mm = (n: number) => `${n.toFixed(1)} mm`;
const short = (m: Movement) => `${m.calibre} ${m.winding === "Automatic" ? "auto" : "manual"}`;
const frequency = (m: Movement) => `${m.vph.toLocaleString("en-US")} vph (${m.vph / 7200} Hz)`;

/**
 * A measured figure on the product spec sheet, as the Sheet check run counts it:
 * the number, how it's printed, and any text that lands only with the final value
 * (so the counting text is never wider than the figure it lands on).
 */
export type Count = { n: number; decimals: 0 | 1; grouped?: boolean; prefix?: string; suffix?: string; tail?: string };

/** One reading of a count: `n` is the value shown (default: the final one), without the tail */
export function formatCount(c: Count, n = c.n) {
  const num = c.grouped ? n.toLocaleString("en-US") : n.toFixed(c.decimals);
  return `${c.prefix ?? ""}${num}${c.suffix ?? ""}`;
}

export type SpecRow = { key: string; value: string; signoff?: boolean; count?: Count };

/** A spec row whose figure is measured; its printed value comes from the count itself */
const measured = (key: string, count: Count): SpecRow => ({ key, value: formatCount(count) + (count.tail ?? ""), count });

/** The hero's spec strip (GAUGE-01) and each /collection register row */
export const specStrip = (w: Watch): SpecRow[] => [
  { key: "Case", value: `Ø ${mm(w.case.diameterMm)}` },
  { key: "Height", value: mm(w.case.heightMm) },
  { key: "Water res.", value: `${w.case.waterM} m` },
  { key: "Movement", value: `Cal. ${short(w.movement)}` },
  { key: "Rate", value: TOLERANCE, signoff: true },
];

/** The Range sheet's 2 × 2 title block */
export const titleBlock = (w: Watch): SpecRow[] => [
  { key: "Case", value: `Ø ${mm(w.case.diameterMm)}` },
  { key: "Movement", value: short(w.movement) },
  { key: "Water res.", value: `${w.case.waterM} m` },
  { key: "Rate", value: TOLERANCE, signoff: true },
];

export type SpecGroup = { title: string; rows: SpecRow[] };

/**
 * The product page's full spec sheet; the switcher's variant fills its own row.
 * Measured rows carry their count (Sheet check); stated rows are descriptions.
 */
export function specSheet(w: Watch, variant: Variant): SpecGroup[] {
  const m = w.movement;
  const c = w.case;
  return [
    {
      title: "Case",
      rows: [
        measured("Diameter", { n: c.diameterMm, decimals: 1, prefix: "Ø ", suffix: " mm" }),
        measured("Height", { n: c.heightMm, decimals: 1, suffix: " mm" }),
        measured("Lug to lug", { n: c.lugToLugMm, decimals: 1, suffix: " mm" }),
        measured("Lug width", { n: c.lugWidthMm, decimals: 0, suffix: " mm" }),
        { key: "Material", value: c.material },
        ...(c.bezel ? [{ key: "Bezel", value: c.bezel }] : []),
        { key: "Crystal", value: c.crystal },
        { key: "Case back", value: c.caseBack },
        { key: "Crown", value: c.crown },
        measured("Water res.", { n: c.waterM, decimals: 0, suffix: " m" }),
      ],
    },
    {
      title: "Movement",
      rows: [
        { key: "Calibre", value: `GAUGE ${m.calibre}` },
        { key: "Winding", value: m.winding },
        measured("Frequency", { n: m.vph, decimals: 0, grouped: true, suffix: " vph", tail: ` (${m.vph / 7200} Hz)` }),
        measured("Jewels", { n: m.jewels, decimals: 0 }),
        measured("Power reserve", { n: m.reserveH, decimals: 0, suffix: " h" }),
        { key: "Functions", value: m.functions },
      ],
    },
    {
      title: "Dial and hands",
      rows: [
        { key: "Dial", value: w.variantKind === "Dial" ? `${variant.label}, ${w.dial.dial.toLowerCase()}` : w.dial.dial },
        { key: "Hands", value: w.dial.hands },
        { key: "Lume", value: w.dial.lume },
      ],
    },
    {
      title: w.strap.bracelet ? "Bracelet" : "Strap",
      rows: [
        { key: w.strap.bracelet ? "Bracelet" : "Strap", value: w.strap.strap ?? `${variant.label}, ${c.lugWidthMm} mm` },
        { key: w.strap.bracelet ? "Clasp" : "Buckle", value: variant.buckle ?? w.strap.buckle },
      ],
    },
    {
      // Same terms as the Service section on the home page
      title: "Regulation",
      rows: [
        { key: "Rate", value: TOLERANCE, signoff: true },
        { key: "Positions", value: "5 × 24 h" },
        { key: "Record", value: "Signed, in the box" },
        { key: "Rate check", value: "Every year, free" },
        { key: "Full service", value: "Every 5 years" },
        { key: "Warranty", value: "5 years" },
      ],
    },
  ];
}

export type CompareRow = { key: string; values: string[]; signoff?: boolean };
export type CompareGroup = { title: string; rows: CompareRow[] };

/** /collection's comparison table: one row per spec, one value per reference */
export function compareTable(ws: Watch[]): CompareGroup[] {
  const row = (key: string, value: (w: Watch) => string, signoff?: boolean): CompareRow => ({
    key,
    values: ws.map(value),
    signoff,
  });
  return [
    {
      title: "Case",
      rows: [
        row("Diameter", (w) => `Ø ${mm(w.case.diameterMm)}`),
        row("Height", (w) => mm(w.case.heightMm)),
        row("Lug to lug", (w) => mm(w.case.lugToLugMm)),
        row("Lug width", (w) => `${w.case.lugWidthMm} mm`),
        row("Material", (w) => w.case.material),
        row("Crystal", (w) => w.case.crystal),
        row("Case back", (w) => w.case.caseBack),
        row("Crown", (w) => w.case.crown),
        row("Water res.", (w) => `${w.case.waterM} m`),
      ],
    },
    {
      title: "Movement",
      rows: [
        row("Calibre", (w) => `GAUGE ${w.movement.calibre}`),
        row("Winding", (w) => w.movement.winding),
        row("Frequency", (w) => frequency(w.movement)),
        row("Power reserve", (w) => `${w.movement.reserveH} h`),
        row("Functions", (w) => w.movement.functions),
      ],
    },
    {
      title: "Dial and strap",
      rows: [
        row("Dial", (w) => w.dial.dial),
        row("Lume", (w) => w.dial.lume),
        row("Options", (w) => `${w.variantKind}: ${w.variants.map((v) => v.label).join(" or ")}`),
      ],
    },
    {
      title: "Regulation and price",
      rows: [row("Rate", () => TOLERANCE, true), row("Price", (w) => formatPrice(w.price))],
    },
  ];
}
