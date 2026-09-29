import { test, expect } from "@playwright/test";
import {
  CUSTOM_WALLPAPER,
  DEFAULT_BLUR,
  DEFAULT_DIM,
  DEFAULT_SEND_COLOUR,
  DEFAULT_WALLPAPER,
  INK,
  MAX_DIM,
  PAGE_BG,
  PHOTO_CHIP_ALPHA,
  PHOTO_WALLPAPERS,
  SEND_COLOURS,
  TEXT,
  WALLPAPERS,
  blend,
  contrast,
  isPhotoWallpaper,
  photoWallpaper,
  sendColour,
  unit,
  wallpaper,
} from "../../apps/destiny-one/src/theme/appearance";

/**
 * Destiny One lets people pick their own send colour and chat wallpaper. A
 * free colour picker can't promise legibility, so both are short curated
 * lists, and these tests are the guarantee: every combination a person can
 * choose keeps text at WCAG AA (4.5:1) and keeps sent bubbles distinct from
 * the page (3:1), in light and dark. Add a colour or wallpaper that fails
 * and this file goes red.
 */

const MODES = ["light", "dark"] as const;

test.describe("contrast helper", () => {
  test("matches known WCAG values", () => {
    expect(contrast("#000000", "#FFFFFF")).toBeCloseTo(21, 1);
    expect(contrast("#FFFFFF", "#FFFFFF")).toBeCloseTo(1, 5);
    expect(contrast("#777777", "#FFFFFF")).toBeCloseTo(4.48, 1);
  });

  test("blend mixes alpha over a background", () => {
    expect(blend("#FFFFFF", 0.5, "#000000")).toBe("#808080");
    expect(blend("#123456", 1, "#FFFFFF")).toBe("#123456");
  });
});

test.describe("send colours", () => {
  test("ids are unique and the default exists", () => {
    const ids = SEND_COLOURS.map((c) => c.id);
    expect(new Set(ids).size).toBe(ids.length);
    expect(ids).toContain(DEFAULT_SEND_COLOUR);
  });

  test("unknown or missing ids fall back to the default", () => {
    expect(sendColour("nope").id).toBe(DEFAULT_SEND_COLOUR);
    expect(sendColour(null).id).toBe(DEFAULT_SEND_COLOUR);
  });

  for (const c of SEND_COLOURS) {
    for (const mode of MODES) {
      test(`${c.id} (${mode}): text on the bubble is at least 4.5:1`, () => {
        expect(contrast(c[mode].bg, c[mode].fg)).toBeGreaterThanOrEqual(4.5);
      });

      test(`${c.id} (${mode}): bubble stands out from the page and every wallpaper at 3:1`, () => {
        expect(contrast(c[mode].bg, PAGE_BG[mode])).toBeGreaterThanOrEqual(3);
        for (const w of WALLPAPERS) {
          for (const stop of [...w[mode].stops, w[mode].ink]) {
            expect(contrast(c[mode].bg, stop), `${c.id} on ${w.id}`).toBeGreaterThanOrEqual(3);
          }
        }
      });
    }

    test(`${c.id}: foreground is only white or ink`, () => {
      for (const mode of MODES) expect(["#FFFFFF", INK]).toContain(c[mode].fg);
    });
  }
});

test.describe("wallpapers", () => {
  test("ids are unique and the default is plain", () => {
    const ids = WALLPAPERS.map((w) => w.id);
    expect(new Set(ids).size).toBe(ids.length);
    expect(wallpaper(DEFAULT_WALLPAPER).pattern).toBe("none");
    expect(wallpaper("nope").id).toBe(DEFAULT_WALLPAPER);
  });

  for (const w of WALLPAPERS) {
    for (const mode of MODES) {
      test(`${w.id} (${mode}): message text and timestamps stay readable on every part`, () => {
        const t = TEXT[mode];
        for (const part of [...w[mode].stops, w[mode].ink]) {
          expect(contrast(t.text, part), "body text").toBeGreaterThanOrEqual(7);
          const muted = blend(t.muted.rgb, t.muted.alpha, part);
          expect(contrast(muted, part), "muted text").toBeGreaterThanOrEqual(4.5);
        }
      });
    }
  }
});

test.describe("photo wallpapers", () => {
  test("ids are unique, prefixed, and never clash with a pattern or the custom photo", () => {
    const ids = PHOTO_WALLPAPERS.map((p) => p.id);
    expect(new Set(ids).size).toBe(ids.length);
    for (const p of PHOTO_WALLPAPERS) expect(p.id).toBe(`photo:${p.key}`);
    const taken = new Set([...WALLPAPERS.map((w) => w.id), CUSTOM_WALLPAPER]);
    for (const id of ids) expect(taken.has(id)).toBe(false);
  });

  test("each stock photo ships as a full-size image and a thumbnail", async () => {
    const { existsSync } = await import("node:fs");
    const { join } = await import("node:path");
    const dir = join(__dirname, "../../apps/destiny-one/assets/wallpapers");
    for (const p of PHOTO_WALLPAPERS) {
      expect(existsSync(join(dir, `${p.key}.jpg`)), `${p.key}.jpg`).toBe(true);
      expect(existsSync(join(dir, `${p.key}-thumb.jpg`)), `${p.key}-thumb.jpg`).toBe(true);
    }
  });

  test("isPhotoWallpaper recognises stock photos and the custom photo, and nothing else", () => {
    expect(isPhotoWallpaper(PHOTO_WALLPAPERS[0].id)).toBe(true);
    expect(isPhotoWallpaper(CUSTOM_WALLPAPER)).toBe(true);
    expect(isPhotoWallpaper("dawn")).toBe(false);
    expect(isPhotoWallpaper("photo:nope")).toBe(false);
    expect(isPhotoWallpaper(null)).toBe(false);
    expect(photoWallpaper("photo:nope")).toBeUndefined();
  });

  test("dim and blur defaults sit inside their limits", () => {
    expect(DEFAULT_DIM).toBeGreaterThan(0);
    expect(DEFAULT_DIM).toBeLessThanOrEqual(MAX_DIM);
    expect(DEFAULT_BLUR).toBe(0);
    expect(MAX_DIM).toBeLessThan(1); // the photo never disappears
  });

  test("unit() clamps, and replaces junk with the fallback", () => {
    expect(unit(0.5, 0.2)).toBe(0.5);
    expect(unit(-3, 0.2)).toBe(0);
    expect(unit(7, 0.2)).toBe(1);
    expect(unit(7, 0.2, MAX_DIM)).toBe(MAX_DIM);
    expect(unit("0.5", 0.2)).toBe(0.2);
    expect(unit(NaN, 0.2)).toBe(0.2);
    expect(unit(Infinity, 0.2)).toBe(0.2);
    expect(unit(undefined, 0.2)).toBe(0.2);
  });

  for (const mode of MODES) {
    test(`${mode}: text on the photo chip is readable over the harshest photo (pure black or pure white)`, () => {
      const t = TEXT[mode];
      for (const pixel of ["#000000", "#FFFFFF"]) {
        const chip = blend(PAGE_BG[mode], PHOTO_CHIP_ALPHA, pixel);
        expect(contrast(t.text, chip), `body text over ${pixel}`).toBeGreaterThanOrEqual(7);
        const muted = blend(t.muted.rgb, t.muted.alpha, chip);
        expect(contrast(muted, chip), `muted text over ${pixel}`).toBeGreaterThanOrEqual(4.5);
      }
    });
  }
});
