// Month formats shared by the record (server) and Drift and reset (client)

/** "2027-03" → "03/2027" */
export const monthLabel = (ym: string) => {
  const [y, m] = ym.split("-");
  return `${m}/${y}`;
};

/** Every month from `from` to `to`, inclusive, as "MM/YYYY" */
export function monthsBetween(from: string, to: string) {
  const [fy, fm] = from.split("-").map(Number);
  const [ty, tm] = to.split("-").map(Number);
  const out: string[] = [];
  for (let i = fy * 12 + fm - 1; i <= ty * 12 + tm - 1; i++) {
    out.push(`${String((i % 12) + 1).padStart(2, "0")}/${Math.floor(i / 12)}`);
  }
  return out;
}
