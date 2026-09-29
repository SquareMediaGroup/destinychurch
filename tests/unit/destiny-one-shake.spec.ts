import { test, expect } from "@playwright/test";
import { createShakeDetector } from "../../apps/destiny-one/src/lib/shake";

/**
 * "Shake to report a problem" in Destiny One. It asks before opening
 * anything, but it still shouldn't pop up for ordinary handling: a phone
 * lying still, carried around, knocked once or dropped on a table.
 */

const still = { x: 0, y: 0, z: 1 }; // gravity only
const jolt = { x: 2.2, y: 0.4, z: 1 };

function run(readings: { x: number; y: number; z: number }[], stepMs = 100) {
  let shakes = 0;
  const feed = createShakeDetector(() => shakes++);
  readings.forEach((r, i) => feed(r, i * stepMs));
  return shakes;
}

test("a phone lying still or carried around is not a shake", () => {
  expect(run(Array(100).fill(still))).toBe(0);
  expect(run(Array(100).fill({ x: 0.3, y: 0.5, z: 1.2 }))).toBe(0); // walking
});

test("one knock or a drop is not a shake", () => {
  expect(run([still, jolt, still, still])).toBe(0);
  expect(run([still, jolt, jolt, still, still])).toBe(0);
});

test("three jolts within a second is a shake", () => {
  expect(run([still, jolt, still, jolt, still, jolt, still])).toBe(1);
});

test("jolts spread over more than a second are not", () => {
  expect(run([jolt, ...Array(6).fill(still), jolt, ...Array(6).fill(still), jolt])).toBe(0);
});

test("a long shake counts once, then again after a pause", () => {
  expect(run(Array(20).fill(jolt))).toBe(1); // 2 seconds of shaking
  expect(run([...Array(5).fill(jolt), ...Array(30).fill(still), ...Array(5).fill(jolt)])).toBe(2);
});
