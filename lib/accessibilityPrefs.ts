"use client";

/**
 * The single owner of the Glass FX / reduced-motion preferences.
 *
 * These prefs are read in three places that used to each parse the stored JSON
 * themselves: the blocking script in app/layout.tsx (which must stay inline so
 * the dataset attributes land before first paint), AccessibilityContext, and
 * PerformanceGate. Two of those are React; both now read this store.
 *
 * It is an external store rather than component state because the value exists
 * before React does — the inline script has already applied it to <html> by the
 * time hydration starts. useSyncExternalStore lets the provider read it during
 * the first client render without a setState-in-effect cascade, while still
 * handing SSR the defaults so the hydrating markup matches the server's.
 */

export const A11Y_STORAGE_KEY = "destiny-a11y";

export interface AccessibilityPrefs {
  glassFX: boolean;
  reducedMotion: boolean;
}

/** Frozen so it is safe to hand out as the shared server snapshot. */
export const DEFAULT_PREFS: AccessibilityPrefs = Object.freeze({
  glassFX: true,
  reducedMotion: false,
});

/**
 * The prefs the user has explicitly stored, or null if they never have.
 *
 * The null case matters: PerformanceGate treats "nothing stored" as permission
 * to apply its own device heuristics, and must not see defaults that some
 * earlier render happened to write out.
 */
export function readStoredPrefs(): AccessibilityPrefs | null {
  try {
    const raw = localStorage.getItem(A11Y_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Record<string, unknown>;
    return {
      glassFX:
        typeof parsed.glassFX === "boolean" ? parsed.glassFX : DEFAULT_PREFS.glassFX,
      reducedMotion:
        typeof parsed.reducedMotion === "boolean"
          ? parsed.reducedMotion
          : DEFAULT_PREFS.reducedMotion,
    };
  } catch {
    return null;
  }
}

function initialPrefs(): AccessibilityPrefs {
  const stored = readStoredPrefs();
  if (stored) return stored;
  // No stored choice: mirror the OS setting, exactly as the inline script does.
  try {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      return { ...DEFAULT_PREFS, reducedMotion: true };
    }
  } catch {
    /* matchMedia unavailable — fall through to defaults */
  }
  return DEFAULT_PREFS;
}

let snapshot: AccessibilityPrefs | null = null;
const listeners = new Set<() => void>();

export function subscribePrefs(onChange: () => void): () => void {
  listeners.add(onChange);
  return () => listeners.delete(onChange);
}

/**
 * Cached so repeated reads return the identical object — useSyncExternalStore
 * re-renders forever if getSnapshot keeps handing back fresh references.
 */
export function getPrefsSnapshot(): AccessibilityPrefs {
  snapshot ??= initialPrefs();
  return snapshot;
}

export function getServerPrefsSnapshot(): AccessibilityPrefs {
  return DEFAULT_PREFS;
}

/** Applies a deliberate change: persists it and notifies every reader. */
export function setPrefs(patch: Partial<AccessibilityPrefs>): void {
  const next = { ...getPrefsSnapshot(), ...patch };
  if (next.glassFX === snapshot?.glassFX && next.reducedMotion === snapshot?.reducedMotion) {
    return;
  }
  snapshot = next;
  try {
    localStorage.setItem(A11Y_STORAGE_KEY, JSON.stringify(next));
  } catch {
    /* private mode / quota — the in-memory value still applies for this session */
  }
  for (const listener of listeners) listener();
}
