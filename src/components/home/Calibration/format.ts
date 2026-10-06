// Number formats shared by the record (server) and the Five-position run (client),
// so a counting value always reads exactly like the value it lands on

export type ReadingKind = "rate" | "fixed" | "int";

/** The smallest step each format shows — a counter steps in whole units of it */
export const UNIT: Record<ReadingKind, number> = { rate: 0.1, fixed: 0.1, int: 1 };

/** Signed, one decimal, true minus sign: +1.2 / −0.9 / 0.0 */
export const signed = (n: number) => (n > 0 ? "+" : n < 0 ? "−" : "") + Math.abs(n).toFixed(1);

export function formatReading(n: number, kind: ReadingKind) {
  if (kind === "rate") return signed(n);
  if (kind === "fixed") return n.toFixed(1);
  return String(Math.round(n));
}
