// The extra typefaces a links page theme can pick (see FONT_OPTIONS in
// lib/linkPages/theme.ts). Loaded here rather than in app/layout.tsx so only
// routes that render a links page — /links and the editor's live preview —
// carry the @font-face rules. Browsers only download a face when something
// on the page actually uses it, so an unused option costs nothing.

import { Caveat, DM_Serif_Display, Inter, Space_Grotesk } from "next/font/google";

const inter = Inter({
  variable: "--font-lp-inter",
  display: "swap",
  subsets: ["latin"],
  weight: ["400", "500", "700", "800"],
});

const spaceGrotesk = Space_Grotesk({
  variable: "--font-lp-space-grotesk",
  display: "swap",
  subsets: ["latin"],
  weight: ["400", "500", "700"],
});

const dmSerif = DM_Serif_Display({
  variable: "--font-lp-dm-serif",
  display: "swap",
  subsets: ["latin"],
  weight: "400",
});

const caveat = Caveat({
  variable: "--font-lp-caveat",
  display: "swap",
  subsets: ["latin"],
  weight: ["500", "700"],
});

/** Class names that define the --font-lp-* variables; put on the page wrapper. */
export const LINK_PAGE_FONT_VARS = [inter, spaceGrotesk, dmSerif, caveat]
  .map((f) => f.variable)
  .join(" ");
