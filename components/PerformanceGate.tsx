"use client";

/**
 * PerformanceGate
 *
 * Runs once per session on first visit. Determines whether the device can
 * comfortably handle Glass FX and animations, then:
 *
 *  - If the device is capable:    does nothing (silent).
 *  - If the device is limited:    disables the relevant feature(s) via
 *                                  AccessibilityContext and fires a persistent,
 *                                  dismissible toast explaining what was changed,
 *                                  with an "Undo" button and a "Settings" CTA
 *                                  linking to /accessibility.
 *
 * It also handles the /lite route: when the URL contains ?lite=1 (injected by
 * middleware.ts for any path ending in /lite), it forces both features off and
 * always shows the toast, even for returning visitors.
 *
 * It never overrides settings the user has already made deliberately
 * (i.e. destiny-a11y is already in localStorage), EXCEPT for the /lite path
 * which is always an explicit opt-in.
 */

import { useEffect, useRef, useCallback } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { useAccessibility } from "@/contexts/AccessibilityContext";
import { useToast } from "@/components/ToastProvider";

// ─── Storage keys ──────────────────────────────────────────────────────────
const PERF_GATE_KEY = "destiny-perf-gate";
const A11Y_KEY = "destiny-a11y";

// ─── Heuristics ────────────────────────────────────────────────────────────
interface DeviceVerdict {
  disableGlass: boolean;
  disableMotion: boolean;
}

/**
 * Scores the device using:
 *  - navigator.hardwareConcurrency  (CPU cores)
 *  - navigator.deviceMemory         (Chrome-only, GB RAM; absent → assume 4)
 *  - prefers-reduced-motion         (OS accessibility preference)
 *  - Short JS throughput benchmark  (5M additions)
 */
function scoreDevice(): DeviceVerdict {
  const cores = navigator.hardwareConcurrency ?? 4;
  const ram =
    (navigator as Navigator & { deviceMemory?: number }).deviceMemory ?? 4;
  const prefersReducedMotion = window.matchMedia(
    "(prefers-reduced-motion: reduce)"
  ).matches;

  // Benchmark: 5M additions. Capable desktop ≈ 5ms; slow device ≈ 80ms+.
  const t0 = performance.now();
  let acc = 0;
  for (let i = 0; i < 5_000_000; i++) acc += i;
  void acc;
  const benchMs = performance.now() - t0;

  const slowCPU = cores <= 2 || benchMs > 60;
  const lowRAM = ram <= 2;

  return {
    disableGlass: lowRAM || (slowCPU && benchMs > 80),
    disableMotion: prefersReducedMotion || slowCPU,
  };
}

// ─── Toast copy ────────────────────────────────────────────────────────────
function toastTitle(isLite: boolean) {
  return isLite ? "Lite Mode" : "Performance Mode";
}

function toastMessage(
  disableGlass: boolean,
  disableMotion: boolean,
  isLite: boolean
): string {
  if (isLite)
    return "Both animations and glass effects have been turned off for a lighter experience.";
  if (disableGlass && disableMotion)
    return "Animations and glass effects have been turned off to keep things smooth on your device.";
  if (disableGlass)
    return "Glass effects have been turned off to improve performance on your device.";
  return "Animations have been reduced to keep things smooth on your device.";
}

// ─── Stored preference helpers ─────────────────────────────────────────────
function readStoredA11y(): { glass: boolean; motion: boolean } {
  try {
    const raw = localStorage.getItem(A11Y_KEY);
    if (!raw) return { glass: true, motion: false };
    const p = JSON.parse(raw) as Record<string, unknown>;
    return {
      glass: typeof p.glassFX === "boolean" ? p.glassFX : true,
      motion: typeof p.reducedMotion === "boolean" ? p.reducedMotion : false,
    };
  } catch {
    return { glass: true, motion: false };
  }
}

// ─── Component ─────────────────────────────────────────────────────────────
export default function PerformanceGate() {
  const { setGlassFX, setReducedMotion } = useAccessibility();
  const toast = useToast();
  const searchParams = useSearchParams();
  const router = useRouter();
  const ran = useRef(false);

  // Stable ref so the callbacks passed to toast actions can always reach the
  // latest setters without stale closure issues.
  const setGlassFXRef = useRef(setGlassFX);
  const setReducedMotionRef = useRef(setReducedMotion);
  setGlassFXRef.current = setGlassFX;
  setReducedMotionRef.current = setReducedMotion;

  const fireToast = useCallback(
    (opts: {
      disableGlass: boolean;
      disableMotion: boolean;
      isLite: boolean;
      prevGlass: boolean;
      prevMotion: boolean;
    }) => {
      const { disableGlass, disableMotion, isLite, prevGlass, prevMotion } =
        opts;

      toast.push({
        tone: "info",
        title: toastTitle(isLite),
        message: toastMessage(disableGlass, disableMotion, isLite),
        durationMs: 0, // persistent — user must act or dismiss
        actions: [
          {
            label: "Undo",
            variant: "ghost",
            onClick: () => {
              setGlassFXRef.current(prevGlass);
              setReducedMotionRef.current(prevMotion);
              // Let next visit re-evaluate from scratch.
              try {
                localStorage.removeItem(PERF_GATE_KEY);
              } catch { /* */ }
            },
          },
          {
            label: "Settings",
            variant: "primary",
            onClick: () => {
              router.push("/accessibility");
            },
          },
        ],
      });
    },
    [toast, router]
  );

  useEffect(() => {
    if (ran.current) return;
    ran.current = true;

    const isLite = searchParams.get("lite") === "1";

    // ── /lite path ─────────────────────────────────────────────────────────
    if (isLite) {
      const prev = readStoredA11y();
      setGlassFXRef.current(false);
      setReducedMotionRef.current(true);

      // Remove ?lite=1 from the address bar (no history entry).
      const params = new URLSearchParams(searchParams.toString());
      params.delete("lite");
      const qs = params.size > 0 ? `?${params.toString()}` : "";
      router.replace(window.location.pathname + qs);

      fireToast({
        disableGlass: true,
        disableMotion: true,
        isLite: true,
        prevGlass: prev.glass,
        prevMotion: prev.motion,
      });
      return;
    }

    // ── Auto-detect on first visit ─────────────────────────────────────────
    try {
      // User already has explicit prefs, or gate already ran → bail silently.
      if (
        localStorage.getItem(A11Y_KEY) ||
        localStorage.getItem(PERF_GATE_KEY)
      )
        return;
    } catch {
      return;
    }

    const verdict = scoreDevice();

    if (!verdict.disableGlass && !verdict.disableMotion) {
      // Device is fine — log it and stay silent.
      try {
        localStorage.setItem(PERF_GATE_KEY, "ok");
      } catch { /* */ }
      return;
    }

    // Apply settings.
    if (verdict.disableGlass) setGlassFXRef.current(false);
    if (verdict.disableMotion) setReducedMotionRef.current(true);

    try {
      localStorage.setItem(PERF_GATE_KEY, "degraded");
    } catch { /* */ }

    fireToast({
      ...verdict,
      isLite: false,
      prevGlass: true,   // first visit: defaults are glass=on, motion=off
      prevMotion: false,
    });

    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // intentionally run once on mount only

  return null;
}
