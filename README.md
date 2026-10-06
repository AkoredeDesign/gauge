# GAUGE

A concept e-commerce site for a fictional precision-instrument watch brand, inspired by the machinist and calibration world. Built as a portfolio project.

Live site: https://gauge-self.vercel.app

## What this is

A small storefront where the watches are presented like shop-floor instruments: spec sheets, tolerance charts and service records instead of lifestyle copy. GAUGE is not a real company. The watches, prices and calibration records are made up. The bag drawer works, but checkout is intentionally disabled, and no data is collected. The newsletter form confirms on screen and sends nothing.

## What's in it

- Home page with a calibration chart that animates through a five-position run
- A service-record chart showing drift and reset between services
- Product pages with variant switching (dial or strap) and an animated spec-sheet check
- A collection page with a comparison table across the range
- A persistent bag drawer (survives reloads)
- Reduced-motion support: animations are skipped when the OS asks for less motion
- An image pipeline that outputs AVIF and WebP at three sizes, shown in fixed-ratio frames so nothing shifts as images load

## Stack

- Next.js 16 (App Router) with React 19 and TypeScript
- GSAP with `@gsap/react` for animation
- Zustand (with its `persist` middleware) for the bag
- CSS Modules and CSS custom properties for styling
- `next/font` with Space Grotesk and JetBrains Mono
- sharp for the image script (installed as a dependency of Next.js)
- ESLint with `eslint-config-next`

## Run it locally

```bash
npm install
npm run dev
```

Then open http://localhost:3000.

`npm run images` regenerates the web images in `public/images/` from the originals in `gauge-images/`. The originals are not committed, so this only works if you have them. Outputs that are newer than their source are skipped.

## Images

The product photography was generated with AI image tools for this concept and does not depict real products.

## Author

Waliyullahi Akorede, Ecom Elevate (ecomelevate.pro)
