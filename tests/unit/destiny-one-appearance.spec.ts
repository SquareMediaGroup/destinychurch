import { test, expect } from "@playwright/test";
import {
  DEFAULT_SEND_COLOUR,
  DEFAULT_WALLPAPER,
  INK,
  PAGE_BG,
  SEND_COLOURS,
  TEXT,
  WALLPAPERS,
  blend,
  contrast,
  sendColour,
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
