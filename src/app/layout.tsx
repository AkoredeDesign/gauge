import type { Metadata } from "next";
import { Space_Grotesk, JetBrains_Mono } from "next/font/google";
import Header from "@/components/layout/Header/Header";
import Footer from "@/components/layout/Footer/Footer";
import BagDrawer from "@/components/bag/BagDrawer";
import { zeroSetScript } from "@/components/home/Hero/zeroSetScript";
import { prerunScript } from "@/lib/prerunScript";
import { OG_IMAGE } from "@/data/images";
import "./globals.css";

const spaceGrotesk = Space_Grotesk({
  variable: "--font-space-grotesk",
  subsets: ["latin"],
  weight: ["400", "500", "700"],
});

const jetbrainsMono = JetBrains_Mono({
  variable: "--font-jetbrains-mono",
  subsets: ["latin"],
  weight: ["400", "500"],
  // A monospace fallback with the same 0.6em advance, not the generated Arial one
  // (~25% wider on letter-spaced caps): mono labels keep their line breaks when the
  // face swaps in late, e.g. the hero eyebrow at 390px.
  adjustFontFallback: false,
  fallback: ["Courier New", "monospace"],
});

const TITLE = "GAUGE — Precision Instruments";
const DESCRIPTION =
  "GAUGE builds mechanical watches like shop-floor instruments. A concept project — no real checkout.";
const OG = [{ url: OG_IMAGE.url, width: OG_IMAGE.width, height: OG_IMAGE.height, alt: OG_IMAGE.alt }];

export const metadata: Metadata = {
  // Absolute og:image URLs. Set NEXT_PUBLIC_SITE_URL to the deployed origin.
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000"),
  title: TITLE,
  description: DESCRIPTION,
  openGraph: { type: "website", siteName: "GAUGE", title: TITLE, description: DESCRIPTION, images: OG },
  twitter: { card: "summary_large_image", title: TITLE, description: DESCRIPTION, images: OG },
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    // data-zeroset and data-prerun are set by the pre-paint scripts below, before React hydrates
    <html lang="en" className={`${spaceGrotesk.variable} ${jetbrainsMono.variable}`} suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: zeroSetScript }} />
        <script dangerouslySetInnerHTML={{ __html: prerunScript }} />
      </head>
      <body>
        <Header />
        {children}
        <Footer />
        <BagDrawer />
      </body>
    </html>
  );
}
