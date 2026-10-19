// Shake detection for "shake to report a problem". Pure (no React Native), so
// it's unit-tested (tests/unit/destiny-one-shake.spec.ts).
//
// Accelerometer readings are in g, so a phone lying still reads about 1 (just
// gravity). A shake is several readings well above that in quick succession:
// one knock or a drop onto a table gives one or two spikes, not three.

export interface ShakeOptions {
  /** Total acceleration, in g, that counts as a jolt. */
  threshold?: number;
  /** Jolts needed within `windowMs`. */
  hits?: number;
  windowMs?: number;
  /** After a shake, ignore movement for this long (it's still being shaken). */
  cooldownMs?: number;
}

export const SHAKE_DEFAULTS: Required<ShakeOptions> = { threshold: 1.8, hits: 3, windowMs: 1000, cooldownMs: 3000 };

/** Returns a function to feed each reading to; it calls `onShake` once per shake. */
export function createShakeDetector(onShake: () => void, options: ShakeOptions = {}) {
  const { threshold, hits, windowMs, cooldownMs } = { ...SHAKE_DEFAULTS, ...options };
  let jolts: number[] = [];
  let quietUntil = 0;

  return (reading: { x: number; y: number; z: number }, now: number) => {
    if (now < quietUntil) return;
    if (Math.hypot(reading.x, reading.y, reading.z) < threshold) return;
    jolts = jolts.filter((t) => now - t <= windowMs);
    jolts.push(now);
    if (jolts.length >= hits) {
      jolts = [];
      quietUntil = now + cooldownMs;
      onShake();
    }
  };
}
