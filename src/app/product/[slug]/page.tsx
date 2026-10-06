import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Product from "@/components/product/Product";
import { getWatch, WATCHES } from "@/lib/watches";

// The three references are built ahead; any other slug is a 404
export const dynamicParams = false;

export function generateStaticParams() {
  return WATCHES.map((w) => ({ slug: w.slug }));
}

export async function generateMetadata({ params }: PageProps<"/product/[slug]">): Promise<Metadata> {
  const watch = getWatch((await params).slug);
  if (!watch) return {};
  return { title: `${watch.ref} ${watch.name} — GAUGE`, description: watch.line };
}

export default async function ProductPage({ params }: PageProps<"/product/[slug]">) {
  const watch = getWatch((await params).slug);
  if (!watch) notFound();

  return (
    <main id="main">
      {/* Keyed on the slug: another product is a new view (state, Sheet check) */}
      <Product key={watch.slug} watch={watch} sheet={WATCHES.indexOf(watch) + 1} sheets={WATCHES.length} />
    </main>
  );
}
