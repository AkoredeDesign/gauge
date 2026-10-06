import type { Metadata } from "next";
import Collection from "@/components/collection/Collection";
import { formatPrice, TOLERANCE, WATCHES } from "@/lib/watches";

const names = WATCHES.map((w) => w.name);
const from = formatPrice(Math.min(...WATCHES.map((w) => w.price)));

export const metadata: Metadata = {
  title: `Watches: ${names.join(", ")} — GAUGE`,
  description: `${WATCHES.map((w) => `${w.ref} ${w.name}`).join(", ")}, from ${from}. Case, calibre and water resistance compared line by line; every one regulated to ${TOLERANCE}. A concept project.`,
};

export default function CollectionPage() {
  return (
    <main id="main">
      <Collection />
    </main>
  );
}
