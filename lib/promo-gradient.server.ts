// Background gradients for the post promo cards.
//
// Each card sits on a gradient pulled from its own artwork, so the panel always
// harmonises with the image on it (see components/posts/PostRails.tsx). Cards
// with no artwork fall back to the Destiny orange gradient.
//
// The dominant colour is normalised through HSL rather than simply darkened:
// keeping the hue but pinning saturation and lightness means a near-black photo
// and a blown-out white one both produce a usable panel with legible white text.
import "server-only";
import { readFile } from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";

type Rgb = { r: number; g: number; b: number };

/** Destiny orange — the fallback when a card has no artwork to sample. */
const DESTINY_ORANGE: Rgb = { r: 245, g: 128, b: 33 };

// Lightness of the three gradient stops, top to bottom. Tuned against the
// Rocknations artwork: a mid-tone band at the top fading to near-black, which
// keeps white body text above 7:1 contrast for the whole card.
const STOPS: Array<[lightness: number, position: number]> = [
  [0.3, 0],
  [0.16, 52],
  [0.06, 100],
];

const SATURATION_RANGE = { min: 0.35, max: 0.75 };

/** Cache keyed by image URL. Artwork is immutable per URL, so this never staler. */
const cache = new Map<string, string>();

function rgbToHsl({ r, g, b }: Rgb): { h: number; s: number; l: number } {
  const rn = r / 255;
  const gn = g / 255;
  const bn = b / 255;
  const max = Math.max(rn, gn, bn);
  const min = Math.min(rn, gn, bn);
  const l = (max + min) / 2;
  const d = max - min;

  if (d === 0) return { h: 0, s: 0, l };

  const s = d / (1 - Math.abs(2 * l - 1));
  let h: number;
  if (max === rn) h = ((gn - bn) / d) % 6;
  else if (max === gn) h = (bn - rn) / d + 2;
  else h = (rn - gn) / d + 4;

  return { h: (h * 60 + 360) % 360, s, l };
}

/**
 * A three-stop vertical gradient in the hue of `rgb`. Saturation is clamped so
 * a greyscale image still reads as a deliberate colour rather than mud.
 */
function gradientFrom(rgb: Rgb): string {
  const { h, s } = rgbToHsl(rgb);
  const sat = Math.min(SATURATION_RANGE.max, Math.max(SATURATION_RANGE.min, s));
  const stops = STOPS.map(
    ([l, pos]) => `hsl(${h.toFixed(0)} ${(sat * 100).toFixed(0)}% ${(l * 100).toFixed(0)}%) ${pos}%`,
  );
  return `linear-gradient(180deg, ${stops.join(", ")})`;
}

/** The branded gradient used for cards with no artwork. */
export const DESTINY_GRADIENT = gradientFrom(DESTINY_ORANGE);

/** Read a local `/img/...` path out of `public/`, or fetch a remote URL. */
async function loadImage(src: string): Promise<Buffer> {
  if (src.startsWith("/")) {
    return readFile(path.join(process.cwd(), "public", src));
  }
  const res = await fetch(src, { next: { revalidate: 86400 } });
  if (!res.ok) throw new Error(`image fetch failed: ${res.status}`);
  return Buffer.from(await res.arrayBuffer());
}

/**
 * The gradient for a card's artwork. Falls back to the Destiny gradient when
 * `src` is missing or the image can't be read — a promo card must never fail
 * the page it sits on.
 */
export async function gradientForImage(src?: string): Promise<string> {
  if (!src) return DESTINY_GRADIENT;

  const cached = cache.get(src);
  if (cached) return cached;

  try {
    const { dominant } = await sharp(await loadImage(src)).stats();
    const gradient = gradientFrom(dominant);
    cache.set(src, gradient);
    return gradient;
  } catch {
    return DESTINY_GRADIENT;
  }
}
