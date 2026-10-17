// Decides when the release splash shows, and remembers the last one seen
// (on this phone only). The splash is shown for the newest RELEASES entry that
// qualifies and is no newer than the running app: every X.X release, and an
// X.X.X patch only if its entry says `splash: true`.

import AsyncStorage from "@react-native-async-storage/async-storage";
import Constants from "expo-constants";
import { RELEASES, type Release } from "@/lib/releases";

const KEY = "d1.releaseSplash.seen.v1";

function parts(version: string): number[] {
  return version.split(".").map((n) => Number.parseInt(n, 10) || 0);
}

/** <0, 0 or >0 as a is older than, the same as, or newer than b. */
export function compareVersions(a: string, b: string): number {
  const x = parts(a);
  const y = parts(b);
  for (let i = 0; i < Math.max(x.length, y.length); i++) {
    const d = (x[i] ?? 0) - (y[i] ?? 0);
    if (d !== 0) return d;
  }
  return 0;
}

const isPatch = (r: Release) => parts(r.version).length > 2;

/** The release to splash for the running app, or null. */
export function splashRelease(current: string, releases: Release[] = RELEASES): Release | null {
  let best: Release | null = null;
  for (const r of releases) {
    if (isPatch(r) && !r.splash) continue;
    if (compareVersions(r.version, current) > 0) continue;
    if (!best || compareVersions(r.version, best.version) > 0) best = r;
  }
  return best;
}

export function shouldShowSplash(seen: string | null, release: Release | null): boolean {
  return !!release && (seen === null || compareVersions(release.version, seen) > 0);
}

export async function getSeenRelease(): Promise<string | null> {
  try {
    return await AsyncStorage.getItem(KEY);
  } catch {
    return null;
  }
}

/** Marks the splash for the running app as seen. Called when it is dismissed, and for brand-new members. */
export async function markReleaseSeen(): Promise<void> {
  const release = splashRelease(Constants.expoConfig?.version ?? "0");
  if (!release) return;
  try {
    await AsyncStorage.setItem(KEY, release.version);
  } catch {
    // Worst case it shows once more.
  }
}

/** The release to show right now, or null. */
export async function pendingSplash(): Promise<Release | null> {
  const release = splashRelease(Constants.expoConfig?.version ?? "0");
  return shouldShowSplash(await getSeenRelease(), release) ? release : null;
}
