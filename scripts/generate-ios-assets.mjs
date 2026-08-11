#!/usr/bin/env node
// Generate the iOS app's asset catalog from the brand sources in this repo.
//
// Two jobs, both about keeping one source of truth:
//
//  1. Colours are read out of `packages/shared/src/design/tokens.ts` — the same
//     file the website's theme is checked against — and emitted as colorsets.
//     `Brand.swift` then refers to them by name and can never drift from web.
//  2. The app icon and launch logo are rasterised from the brand SVGs in
//     `public/img/brand/`, so there are no hand-exported PNGs to go stale.
//
// Run: npm run gen:ios-assets

import { mkdir, readFile, writeFile, rm } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const TOKENS = path.join(ROOT, "packages/shared/src/design/tokens.ts");
const BRAND = path.join(ROOT, "public/img/brand/Destiny SVG Logos");
const ASSETS = path.join(
  ROOT,
  "mobile/DestinyChurch/Resources/Assets.xcassets",
);

/**
 * The bare icon may never appear without its circular backing (a brand rule,
 * recorded at the top of tokens.ts), and iOS app icons are never transparent —
 * so the white-backed variant is the right source on both counts.
 */
const ICON_SVG = path.join(
  BRAND,
  "Destiny Logo Icons SVG/Icon_White_Background.svg",
);
const LOGO_SVG = path.join(BRAND, "Destiny Full Logo SVG/Full Logo Colour.svg");

/** Read a `name: "#RRGGBB"` pair out of the shared tokens file. */
function readToken(source, name) {
  const match = new RegExp(`\\b${name}:\\s*"(#[0-9A-Fa-f]{6})"`).exec(source);
  if (!match) throw new Error(`Token "${name}" not found in ${TOKENS}`);
  return match[1];
}

function hexToComponents(hex) {
  const n = parseInt(hex.slice(1), 16);
  const to = (v) => (v / 255).toFixed(3);
  return {
    red: to((n >> 16) & 255),
    green: to((n >> 8) & 255),
    blue: to(n & 255),
    alpha: "1.000",
  };
}

function colorEntry(hex, appearance) {
  return {
    idiom: "universal",
    ...(appearance
      ? { appearances: [{ appearance: "luminosity", value: appearance }] }
      : {}),
    color: {
      "color-space": "srgb",
      components: hexToComponents(hex),
    },
  };
}

/**
 * A colorset with light and dark entries. The brand palette is saturated
 * enough to hold up on a dark background unchanged, so most colours use the
 * same value for both; passing `dark` overrides that where contrast needs it.
 */
async function writeColorSet(name, hex, dark = hex) {
  const dir = path.join(ASSETS, `${name}.colorset`);
  await mkdir(dir, { recursive: true });
  await writeFile(
    path.join(dir, "Contents.json"),
    JSON.stringify(
      {
        colors: [colorEntry(hex), colorEntry(dark, "dark")],
        info: { author: "xcode", version: 1 },
      },
      null,
      2,
    ) + "\n",
  );
  return `${name} ${hex}${dark !== hex ? ` / ${dark}` : ""}`;
}

async function writeAppIcon() {
  const dir = path.join(ASSETS, "AppIcon.appiconset");
  await mkdir(dir, { recursive: true });

  const SIZE = 1024;
  // Size by *width*, not into a square box. The mark is wider than it is tall,
  // so fitting it inside a square leaves it constrained by width and floating
  // small. 72% of the canvas width matches Apple's icon grid once the squircle
  // mask has taken ~10% off each edge.
  //
  // `trim()` is deliberately not used: the SVG rasterises with a transparent
  // margin rather than a white one, so trimming against white is a no-op.
  const markWidth = Math.round(SIZE * 0.72);

  const mark = await sharp(await readFile(ICON_SVG), { density: 384 })
    .trim()
    .resize({ width: markWidth })
    .png()
    .toBuffer();

  await sharp({
    create: {
      width: SIZE,
      height: SIZE,
      channels: 4,
      background: "#FFFFFF",
    },
  })
    .composite([{ input: mark, gravity: "centre" }])
    // No alpha channel and no pre-applied corner radius — App Store submission
    // rejects both automatically. iOS applies the mask itself.
    //
    // `flatten` composites away transparency but still writes RGBA; the icon
    // must be a true 3-channel PNG, so drop the channel explicitly.
    .flatten({ background: "#FFFFFF" })
    .removeAlpha()
    .png({ compressionLevel: 9 })
    .toFile(path.join(dir, "AppIcon-1024.png"));

  await writeFile(
    path.join(dir, "Contents.json"),
    JSON.stringify(
      {
        images: [
          { filename: "AppIcon-1024.png", idiom: "universal", platform: "ios", size: "1024x1024" },
        ],
        info: { author: "xcode", version: 1 },
      },
      null,
      2,
    ) + "\n",
  );
}

/** The horizontal lockup shown on the launch screen, at @1x/@2x/@3x. */
async function writeLaunchLogo() {
  const dir = path.join(ASSETS, "LaunchLogo.imageset");
  await mkdir(dir, { recursive: true });

  const WIDTH = 240; // points
  const svg = await readFile(LOGO_SVG);

  for (const scale of [1, 2, 3]) {
    await sharp(svg, { density: 96 * scale })
      .resize({ width: WIDTH * scale })
      .png({ compressionLevel: 9 })
      .toFile(path.join(dir, `LaunchLogo@${scale}x.png`));
  }

  await writeFile(
    path.join(dir, "Contents.json"),
    JSON.stringify(
      {
        images: [1, 2, 3].map((scale) => ({
          filename: `LaunchLogo@${scale}x.png`,
          idiom: "universal",
          scale: `${scale}x`,
        })),
        info: { author: "xcode", version: 1 },
      },
      null,
      2,
    ) + "\n",
  );
}

async function main() {
  const source = await readFile(TOKENS, "utf8");

  await rm(ASSETS, { recursive: true, force: true });
  await mkdir(ASSETS, { recursive: true });
  await writeFile(
    path.join(ASSETS, "Contents.json"),
    JSON.stringify({ info: { author: "xcode", version: 1 } }, null, 2) + "\n",
  );

  const written = [];
  written.push(await writeColorSet("BrandAccent", readToken(source, "orange")));
  written.push(
    await writeColorSet("BrandAccentPressed", readToken(source, "orangeDark")),
  );
  // The brand's dark neutral is the light-mode foreground; in dark mode the
  // text goes white, so the colorset flips rather than staying unreadable.
  written.push(
    await writeColorSet("BrandInk", readToken(source, "grey"), "#F5F7FA"),
  );

  for (const [name, token] of [
    ["PillarMagnify", "red"],
    ["PillarMission", "blue"],
    ["PillarMinistry", "purple"],
    ["PillarMembership", "orange"],
    ["PillarMaturity", "green"],
  ]) {
    written.push(await writeColorSet(name, readToken(source, token)));
  }

  // The launch screen sits behind the logo and must match Home's first frame.
  written.push(await writeColorSet("LaunchBackground", "#FFFFFF", "#1C1C1E"));

  await writeAppIcon();
  await writeLaunchLogo();

  console.log("🎨 Colours (from packages/shared/src/design/tokens.ts):");
  for (const line of written) console.log(`   ${line}`);
  console.log("📱 AppIcon-1024.png (1024², no alpha, no baked corners)");
  console.log("🚀 LaunchLogo @1x/@2x/@3x");
  console.log(`✓ Wrote ${path.relative(ROOT, ASSETS)}`);
}

main().catch((error) => {
  console.error("✗ iOS asset generation failed:", error.message);
  process.exit(1);
});
