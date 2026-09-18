import { test, expect } from "@playwright/test";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { textColors } from "../../packages/shared/src/design/tokens";

/**
 * Contrast floors for the site's text tokens.
 *
 * The site used to write secondary text as an opacity modifier on the brand
 * grey — `text-destiny-grey/60`, `/50`, `/40`. Those blend to 3.4:1, 2.7:1 and
 * 2.1:1 on white, all below the WCAG AA floor of 4.5:1 for normal-size text,
 * and `/40` was the single most common value in the codebase. `text-muted` and
 * `text-subtle` replace them with solid colours that clear the floor.
 *
 * These tests read the real values out of `app/globals.css` rather than
 * restating them, so the numbers cannot drift apart from the stylesheet. If a
 * token is ever nudged lighter "just a little", this fails.
 */

const AA_NORMAL = 4.5;
const AA_LARGE = 3;

const GLOBALS = readFileSync(join(process.cwd(), "app/globals.css"), "utf8");

type Rgb = [number, number, number];

function tokenValue(name: string): string {
  const match = GLOBALS.match(new RegExp(`^\\s*${name}:\\s*([^;]+);`, "m"));
  if (!match) throw new Error(`${name} is not defined in app/globals.css`);
  return match[1].trim();
}

function hexToRgb(hex: string): Rgb {
  const h = hex.replace("#", "").trim();
  return [
    parseInt(h.slice(0, 2), 16),
    parseInt(h.slice(2, 4), 16),
    parseInt(h.slice(4, 6), 16),
  ];
}

/** `rgb(255 255 255 / 0.82)` composited over an opaque backdrop. */
function compositeRgbToken(token: string, backdrop: Rgb): Rgb {
  const m = token.match(
    /rgb\(\s*(\d+)\s+(\d+)\s+(\d+)\s*\/\s*([\d.]+)\s*\)/,
  );
  if (!m) throw new Error(`Not an rgb()/alpha token: ${token}`);
  const fg: Rgb = [Number(m[1]), Number(m[2]), Number(m[3])];
  const a = Number(m[4]);
  return [0, 1, 2].map((i) => a * fg[i] + (1 - a) * backdrop[i]) as Rgb;
}

function relativeLuminance([r, g, b]: Rgb): number {
  const channel = (v: number) => {
    const c = v / 255;
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  };
  return 0.2126 * channel(r) + 0.7152 * channel(g) + 0.0722 * channel(b);
}

function contrast(a: Rgb, b: Rgb): number {
  const [hi, lo] = [relativeLuminance(a), relativeLuminance(b)].sort(
    (x, y) => y - x,
  );
  return (hi + 0.05) / (lo + 0.05);
}

const WHITE: Rgb = [255, 255, 255];
/** --color-destiny-grey, the darkest surface the site puts body text on. */
const DESTINY_GREY: Rgb = [0x36, 0x3f, 0x48];

test("text-muted clears AA for normal-size text on white", () => {
  const ratio = contrast(hexToRgb(tokenValue("--color-muted")), WHITE);
  expect(ratio).toBeGreaterThanOrEqual(AA_NORMAL);
});

test("text-subtle clears AA for normal-size text on white", () => {
  const ratio = contrast(hexToRgb(tokenValue("--color-subtle")), WHITE);
  expect(ratio).toBeGreaterThanOrEqual(AA_NORMAL);
});

test("text-muted is genuinely stronger than text-subtle", () => {
  // Two steps are only worth having if they are visibly different, and the
  // stronger one has to actually be the stronger one.
  const muted = contrast(hexToRgb(tokenValue("--color-muted")), WHITE);
  const subtle = contrast(hexToRgb(tokenValue("--color-subtle")), WHITE);
  expect(muted).toBeGreaterThan(subtle);
});

test("body foreground stays well clear of the floor on white", () => {
  // --foreground is the default text colour; it should have plenty of headroom
  // so that `text-muted` reads as quieter rather than as the same thing.
  const ratio = contrast(hexToRgb("#363f48"), WHITE);
  expect(ratio).toBeGreaterThanOrEqual(7);
});

test("on-dark text tokens clear AA over the brand grey", () => {
  for (const name of ["--color-on-dark-muted", "--color-on-dark-subtle"]) {
    const rgb = compositeRgbToken(tokenValue(name), DESTINY_GREY);
    expect(contrast(rgb, DESTINY_GREY), name).toBeGreaterThanOrEqual(AA_NORMAL);
  }
});

test("the mobile app's copy of these tokens has not drifted", () => {
  // packages/shared feeds the Expo app in mobile/ and promises its hex values
  // match globals.css exactly. Nothing else enforces that promise.
  const norm = (v: string) => v.toLowerCase().replace(/\s+/g, "");

  expect(norm(textColors.muted)).toBe(norm(tokenValue("--color-muted")));
  expect(norm(textColors.subtle)).toBe(norm(tokenValue("--color-subtle")));

  // The web writes `rgb(255 255 255 / 0.82)`; React Native needs
  // `rgba(255, 255, 255, 0.82)`. Compare the composited result, not the string.
  for (const [shared, cssVar] of [
    [textColors.onDarkMuted, "--color-on-dark-muted"],
    [textColors.onDarkSubtle, "--color-on-dark-subtle"],
  ] as const) {
    const alpha = (s: string) => Number(s.match(/([\d.]+)\s*\)$/)?.[1]);
    expect(alpha(shared), cssVar).toBeCloseTo(alpha(tokenValue(cssVar)), 5);
  }
});

test("the opacity idiom these tokens replace really did fail AA", () => {
  // Guards the rationale in globals.css: if someone reintroduces
  // `text-destiny-grey/60` for body copy, this is the number they are choosing.
  const blend = (alpha: number): Rgb =>
    [0, 1, 2].map(
      (i) => alpha * DESTINY_GREY[i] + (1 - alpha) * WHITE[i],
    ) as Rgb;

  expect(contrast(blend(0.7), WHITE)).toBeLessThan(AA_NORMAL);
  expect(contrast(blend(0.6), WHITE)).toBeLessThan(AA_NORMAL);
  // /40 was the most common secondary value and misses even the large-text bar.
  expect(contrast(blend(0.4), WHITE)).toBeLessThan(AA_LARGE);
});
