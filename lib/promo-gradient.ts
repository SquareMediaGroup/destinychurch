// Colour maths for the post promo card gradients. Pure — no Node APIs, no image
// decoding — so it can be shared by the server module (lib/promo-gradient.server.ts)
// and by scripts/precompute-course-gradients.ts.
//
// The dominant colour is normalised through HSL rather than simply darkened:
// keeping the hue but pinning saturation and lightness means a near-black photo
// and a blown-out white one both produce a usable panel with legible white text.

export type Rgb = { r: number; g: number; b: number };

/** Destiny orange — the fallback when a card has no usable artwork. */
export const DESTINY_ORANGE: Rgb = { r: 245, g: 128, b: 33 };

// Lightness of the three gradient stops, top to bottom. Tuned against the
// Rocknations artwork: a mid-tone band at the top fading to near-black, which
// keeps white body text well clear of contrast minimums for the whole card.
const STOPS: Array<[lightness: number, position: number]> = [
  [0.3, 0],
  [0.16, 52],
  [0.06, 100],
];

const SATURATION_RANGE = { min: 0.35, max: 0.75 };

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
export function gradientFrom(rgb: Rgb): string {
  const { h, s } = rgbToHsl(rgb);
  const sat = Math.min(SATURATION_RANGE.max, Math.max(SATURATION_RANGE.min, s));
  const stops = STOPS.map(
    ([l, pos]) => `hsl(${h.toFixed(0)} ${(sat * 100).toFixed(0)}% ${(l * 100).toFixed(0)}%) ${pos}%`,
  );
  return `linear-gradient(180deg, ${stops.join(", ")})`;
}

/** The branded gradient used for cards with no artwork. */
export const DESTINY_GRADIENT = gradientFrom(DESTINY_ORANGE);

/**
 * The most common colour in RGBA pixel data, on a 4-bit-per-channel histogram
 * (the same quantisation sharp's `dominant` uses).
 *
 * Near-black and near-white buckets are skipped: promo artwork usually sits on a
 * white or black backdrop, and picking that would make every card look the same.
 * They are only used if the image has nothing else in it.
 */
export function dominantColour(data: Uint8Array | Uint8ClampedArray): Rgb | null {
  const counts = new Map<number, number>();
  let fallbackKey = -1;
  let fallbackCount = 0;

  for (let i = 0; i < data.length; i += 4) {
    // Skip transparent pixels — PNG artwork is often cut out.
    if (data[i + 3] < 128) continue;

    const key = ((data[i] >> 4) << 8) | ((data[i + 1] >> 4) << 4) | (data[i + 2] >> 4);
    const next = (counts.get(key) ?? 0) + 1;
    counts.set(key, next);

    if (next > fallbackCount) {
      fallbackCount = next;
      fallbackKey = key;
    }
  }

  let bestKey = -1;
  let bestCount = 0;
  for (const [key, count] of counts) {
    const r = (key >> 8) & 0xf;
    const g = (key >> 4) & 0xf;
    const b = key & 0xf;
    if (r + g + b <= 3) continue; // near-black
    if (r >= 14 && g >= 14 && b >= 14) continue; // near-white
    if (count > bestCount) {
      bestCount = count;
      bestKey = key;
    }
  }

  const key = bestKey >= 0 ? bestKey : fallbackKey;
  if (key < 0) return null;

  // Bucket centre, so a 4-bit value maps back to the middle of its range.
  const expand = (v: number) => Math.min(255, v * 16 + 8);
  return {
    r: expand((key >> 8) & 0xf),
    g: expand((key >> 4) & 0xf),
    b: expand(key & 0xf),
  };
}
