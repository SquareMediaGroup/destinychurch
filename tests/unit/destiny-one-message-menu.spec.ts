import { test, expect } from "@playwright/test";
import { EDGE, GAP, MIN_BUBBLE, menuLayout, type MenuLayoutInput } from "../../apps/destiny-one/src/lib/menuLayout";

/**
 * Destiny One's press-and-hold message menu: a reactions bar above the
 * message, the message, and an actions card below. Wherever the message is
 * on screen and however tall it is, the three must be fully on screen (inside
 * the safe area) and must never overlap each other.
 */

const PHONES = [
  { name: "iPhone SE", w: 375, h: 667, top: 20, bottom: 0 },
  { name: "iPhone 17", w: 402, h: 874, top: 62, bottom: 34 },
  { name: "iPhone 17 Pro Max", w: 440, h: 956, top: 62, bottom: 34 },
  { name: "Android", w: 412, h: 915, top: 24, bottom: 24 },
];
const BAR = { w: 328, h: 56 };
const CARD = { w: 250, h: 324 };

function check(input: MenuLayoutInput) {
  const l = menuLayout(input);
  const { screen, insets, bar, card } = input;
  const top = insets.top + EDGE;
  const bottom = screen.h - insets.bottom - EDGE;

  // Stacked in order, with a gap, no overlap.
  expect(l.bar.y).toBeGreaterThanOrEqual(top);
  expect(l.bubble.y).toBeGreaterThanOrEqual(l.bar.y + bar.h + GAP);
  expect(l.card.y).toBeGreaterThanOrEqual(l.bubble.y + l.bubble.h + GAP);
  expect(l.card.y + card.h).toBeLessThanOrEqual(bottom + 0.001);

  // On screen sideways.
  for (const [x, w] of [[l.bar.x, bar.w], [l.card.x, card.w]] as const) {
    expect(x).toBeGreaterThanOrEqual(EDGE);
    expect(x + w).toBeLessThanOrEqual(screen.w - EDGE);
  }
  return l;
}

test.describe("Destiny One message menu layout", () => {
  for (const phone of PHONES) {
    test(`fits on screen and never overlaps: ${phone.name}`, () => {
      const screen = { w: phone.w, h: phone.h };
      const insets = { top: phone.top, bottom: phone.bottom };
      for (const mine of [true, false]) {
        for (const h of [36, 80, 200, 400, 900, 2000]) {
          for (let y = -h; y < phone.h + 50; y += 37) {
            const w = mine ? 180 : 240;
            const x = mine ? phone.w - 14 - w : 54;
            const l = check({ bubble: { x, y, w, h }, screen, insets, mine, bar: BAR, card: CARD });
            if (l.bubble.clipped) expect(l.bubble.h).toBeGreaterThanOrEqual(MIN_BUBBLE);
            else expect(l.bubble.h).toBe(h);
          }
        }
      }
    });
  }

  test("leaves a message where it is when there is room", () => {
    const l = menuLayout({ bubble: { x: 200, y: 400, w: 188, h: 44 }, screen: { w: 402, h: 874 }, insets: { top: 62, bottom: 34 }, mine: true, bar: BAR, card: CARD });
    expect(l.bubble.y).toBe(400);
    expect(l.bubble.clipped).toBe(false);
  });

  test("slides up from the composer and down from the header", () => {
    const base = { screen: { w: 402, h: 874 }, insets: { top: 62, bottom: 34 }, mine: false, bar: BAR, card: CARD };
    expect(menuLayout({ ...base, bubble: { x: 54, y: 780, w: 200, h: 44 } }).bubble.y).toBeLessThan(780);
    expect(menuLayout({ ...base, bubble: { x: 54, y: 70, w: 200, h: 44 } }).bubble.y).toBeGreaterThan(70);
  });

  test("lines up with the message's outer edge: right for mine, left for theirs", () => {
    const base = { screen: { w: 402, h: 874 }, insets: { top: 62, bottom: 34 }, bar: BAR, card: CARD };
    const mine = menuLayout({ ...base, mine: true, bubble: { x: 150, y: 400, w: 238, h: 44 } });
    expect(mine.card.x + CARD.w).toBe(388);
    const theirs = menuLayout({ ...base, mine: false, bubble: { x: 54, y: 400, w: 120, h: 44 } });
    expect(theirs.card.x).toBe(54);
  });
});
