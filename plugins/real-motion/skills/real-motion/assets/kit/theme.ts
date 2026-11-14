// Real Motion: brand tokens and the house ease. Change the tokens to the product's brand; keep EASE.
import { Easing } from "remotion";

/**
 * The house ease: slow off the mark, very fast through the middle, a long soft landing.
 * Every move in a Real Motion film uses it (through kf() in motion.tsx). It is what makes the
 * motion feel deliberate and expensive rather than floaty. Don't mix in springs or linear moves.
 */
export const EASE = Easing.bezier(0.86, 0, 0.07, 1);

/** Gentler ease for camera moves that run under other motion (walkthroughs, slow pans). */
export const EASE_SOFT = Easing.bezier(0.45, 0, 0.2, 1);

export const FPS = 30;

/** Colours. Light, product-film look by default: near-white page, near-black ink, one accent. */
export const C = {
  page: "#F5F5F7", // scene background
  white: "#FFFFFF", // cards, device screens
  ink: "#1D1D1F", // headlines
  muted: "#6E6E73", // body copy
  accent: "#0A66FF", // the brand colour, as text-safe on white
  accentBright: "#3D8BFF", // the brand colour for fills, rings, progress
  dark: "#0B0B0F", // dark scenes
};

/**
 * Fonts. Load the brand's fonts once (e.g. with @remotion/fonts' loadFont and files in public/fonts)
 * and put their family names here. The fallbacks keep renders working before that's done.
 */
export const F = {
  display: "Inter, 'SF Pro Display', 'Helvetica Neue', Arial, sans-serif",
  body: "Inter, 'SF Pro Text', 'Helvetica Neue', Arial, sans-serif",
  label: "Inter, 'SF Pro Text', 'Helvetica Neue', Arial, sans-serif",
};
