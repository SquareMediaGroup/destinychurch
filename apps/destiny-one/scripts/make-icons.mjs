// Generates the app icon, Android adaptive icon layers, splash mark and
// Android notification icon from the Destiny logo mark.
//
//   node scripts/make-icons.mjs
//
// Source: public/img/brand/destiny-icon.svg (the same mark as
// src/components/logoXml.ts). Re-run whenever the mark changes. To use a
// designed icon instead, replace assets/icon.png by hand and skip this.
//
// sharp comes from the website's dependencies (repo root node_modules).

import { fileURLToPath } from "node:url";
import path from "node:path";
import sharp from "sharp";

const here = path.dirname(fileURLToPath(import.meta.url));
const SOURCE = path.resolve(here, "../../../public/img/brand/destiny-icon.svg");
const OUT = path.resolve(here, "../assets");
const WHITE = { r: 255, g: 255, b: 255, alpha: 1 };
const CLEAR = { r: 0, g: 0, b: 0, alpha: 0 };

/** The mark, cropped to its own edges, fitted inside a `size` square (transparent). */
async function mark(size) {
  const trimmed = await sharp(SOURCE, { density: 600 }).png().trim().toBuffer();
  return sharp(trimmed).resize(size, size, { fit: "contain", background: CLEAR }).png().toBuffer();
}

/** `inner` centred on a `canvas`-sized square. */
async function place(inner, canvas, background) {
  return sharp({ create: { width: canvas, height: canvas, channels: 4, background } })
    .composite([{ input: inner, gravity: "center" }])
    .png();
}

/** The mark as a single-colour silhouette (only its shape is used by Android). */
async function silhouette(size) {
  const alpha = await sharp(await mark(size)).extractChannel("alpha").toBuffer();
  return sharp({ create: { width: size, height: size, channels: 3, background: { r: 255, g: 255, b: 255 } } })
    .joinChannel(alpha)
    .png()
    .toBuffer();
}

// iOS / store icon: opaque (App Store Connect rejects alpha), ~12% padding.
await (await place(await mark(780), 1024, WHITE)).flatten({ background: "#FFFFFF" }).removeAlpha().toFile(path.join(OUT, "icon.png"));

// Android adaptive icon: the launcher masks to a shape, so the mark stays
// inside the central 66% safe zone.
await (await place(await mark(560), 1024, CLEAR)).toFile(path.join(OUT, "android-icon-foreground.png"));
await sharp({ create: { width: 1024, height: 1024, channels: 3, background: { r: 255, g: 255, b: 255 } } })
  .png()
  .toFile(path.join(OUT, "android-icon-background.png"));
await (await place(await silhouette(560), 1024, CLEAR)).toFile(path.join(OUT, "android-icon-monochrome.png"));

// Splash: the mark alone; app.json sets the background and on-screen width.
await (await place(await mark(960), 1024, CLEAR)).toFile(path.join(OUT, "splash-icon.png"));

// Android status-bar notification icon: white silhouette on transparent.
await (await place(await silhouette(80), 96, CLEAR)).toFile(path.join(OUT, "notification-icon.png"));

console.log("✓ Icons written to", OUT);
