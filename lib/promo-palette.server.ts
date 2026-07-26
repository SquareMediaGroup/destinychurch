// Server-side colour sampling for the post promo cards.
//
// Deliberately does NOT use `sharp`. Importing sharp here pulls ~20MB of libvips
// into every function that renders a post, which pushed the `/[slug]` Vercel
// function past the 250MB uncompressed limit and broke the deploy. jpeg-js +
// pngjs are ~800KB combined and produce identical output.
//
// ChurchSuite serves JPEG and PNG, which is all this handles. Course artwork is
// WebP and never changes, so those palettes are precomputed instead — see
// COURSE_PALETTES in lib/courses.ts and scripts/precompute-course-palettes.ts.
import "server-only";
import jpeg from "jpeg-js";
import { PNG } from "pngjs";
import { DESTINY_PALETTE, dominantColour, paletteFrom } from "@/lib/promo-palette";

export { DESTINY_PALETTE };

/** Cache keyed by image URL. Artwork is immutable per URL, so this never stales. */
const cache = new Map<string, string>();

/** RGBA pixels from a JPEG or PNG buffer, or null for anything else. */
function decode(buffer: Buffer): Uint8Array | null {
  const isJpeg = buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff;
  const isPng =
    buffer[0] === 0x89 && buffer[1] === 0x50 && buffer[2] === 0x4e && buffer[3] === 0x47;

  if (isJpeg) return jpeg.decode(buffer, { useTArray: true }).data;
  if (isPng) return Uint8Array.from(PNG.sync.read(buffer).data);
  return null;
}

/**
 * The "H S%" palette for a remote JPEG/PNG. Falls back to the Destiny palette
 * when `src` is missing or the image can't be read — a promo card must never
 * fail the page it sits on.
 */
export async function paletteForImage(src?: string): Promise<string> {
  if (!src) return DESTINY_PALETTE;

  const cached = cache.get(src);
  if (cached) return cached;

  try {
    const res = await fetch(src, { next: { revalidate: 86400 } });
    if (!res.ok) return DESTINY_PALETTE;

    const pixels = decode(Buffer.from(await res.arrayBuffer()));
    if (!pixels) return DESTINY_PALETTE;

    const dominant = dominantColour(pixels);
    if (!dominant) return DESTINY_PALETTE;

    const palette = paletteFrom(dominant);
    cache.set(src, palette);
    return palette;
  } catch {
    return DESTINY_PALETTE;
  }
}
