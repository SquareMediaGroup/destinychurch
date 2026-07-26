// Server-side gradient extraction for the post promo cards.
//
// Deliberately does NOT use `sharp`. Importing sharp here pulls ~20MB of libvips
// into every function that renders a post, which pushed the `/[slug]` Vercel
// function past the 250MB uncompressed limit and broke the deploy. jpeg-js +
// pngjs are ~800KB combined and only ever decode a small thumbnail, so the cost
// is trivial and the function stays well inside the limit.
//
// ChurchSuite serves JPEG and PNG, which is all this handles. Course artwork is
// WebP and never changes, so those gradients are precomputed instead — see
// COURSE_GRADIENTS in lib/courses.ts and scripts/precompute-course-gradients.ts.
import "server-only";
import jpeg from "jpeg-js";
import { PNG } from "pngjs";
import { DESTINY_GRADIENT, dominantColour, gradientFrom } from "@/lib/promo-gradient";

export { DESTINY_GRADIENT };

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
 * The gradient for a remote JPEG/PNG. Falls back to the Destiny gradient when
 * `src` is missing or the image can't be read — a promo card must never fail the
 * page it sits on.
 */
export async function gradientForImage(src?: string): Promise<string> {
  if (!src) return DESTINY_GRADIENT;

  const cached = cache.get(src);
  if (cached) return cached;

  try {
    const res = await fetch(src, { next: { revalidate: 86400 } });
    if (!res.ok) return DESTINY_GRADIENT;

    const pixels = decode(Buffer.from(await res.arrayBuffer()));
    if (!pixels) return DESTINY_GRADIENT;

    const dominant = dominantColour(pixels);
    if (!dominant) return DESTINY_GRADIENT;

    const gradient = gradientFrom(dominant);
    cache.set(src, gradient);
    return gradient;
  } catch {
    return DESTINY_GRADIENT;
  }
}
