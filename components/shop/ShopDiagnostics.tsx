"use client";

// ─────────────────────────────────────────────────────────────────────────────
// TEMPORARY DIAGNOSTIC — remove once the /shop blank-page bug is identified.
//
// Symptom being chased: /shop (and its sub-routes) intermittently render as a
// blank/white page in Chrome. Investigation ruled out server errors (12/12
// identical 200s), JS heap growth (flat at ~15MB), image weight (largest source
// image 110KB), console errors (none), and a renderer crash (Chrome's Crashpad
// directory is empty). It could not be reproduced on demand.
//
// The two candidate failure modes need *different* evidence, which is why this
// captures more than an error handler would:
//
//   A) React/JS died      → the DOM is gone. `dom` in the payload shows an empty
//                           <main>, and a js-error / react-error fires.
//   B) Compositing failed  → the DOM is perfectly intact and no error fires; the
//                           GPU just never painted. Nothing automatic can see
//                           this from JS, which is why the manual hotkey exists.
//                           A `manual` report showing a healthy DOM and zero
//                           errors is itself the finding: it rules out (A) and
//                           confirms the paint path.
//
// `webglcontextlost` is the one automatic signal that catches a GPU process
// reset, so a 1x1 context is held purely as a tripwire (never drawn to).
//
// Observability is deliberately passive — PerformanceObserver rather than a
// requestAnimationFrame loop — so the instrument does not perturb the
// compositing behaviour it is trying to measure.
// ─────────────────────────────────────────────────────────────────────────────

import { useEffect, useRef } from "react";
import { usePathname } from "next/navigation";
import { useToast } from "@/components/ToastProvider";

const ENDPOINT = "/api/shop-diagnostics";
const MAX_EVENTS = 50;
const MAX_REPORTS_PER_SESSION = 3;
const BLANK_POLL_MS = 3000;

type EventKind =
  | "js-error"
  | "unhandled-rejection"
  | "webgl-context-lost"
  | "webgl-context-restored"
  | "dom-blank"
  | "long-task"
  | "visibility";

interface DiagEvent {
  kind: EventKind;
  at: number; // ms since page mount
  detail: string;
}

type ReportReason = EventKind | "manual";

export default function ShopDiagnostics() {
  const pathname = usePathname();
  const toast = useToast();

  // Refs throughout: this component must never re-render the tree it observes.
  const events = useRef<DiagEvent[]>([]);
  const mountedAt = useRef(0);
  const sent = useRef(0);
  const maxLongTask = useRef(0);

  useEffect(() => {
    // Reset per route. This component lives in the shop layout, so its refs
    // survive client-side navigation between shop pages — without this, the
    // report budget would be consumed once for the whole browsing session and
    // the instrument would go silent exactly when the bug next appeared.
    mountedAt.current = performance.now();
    sent.current = 0;
    events.current = [];
    maxLongTask.current = 0;

    const since = () => Math.round(performance.now() - mountedAt.current);

    const record = (kind: EventKind, detail: string) => {
      events.current.push({ kind, at: since(), detail: detail.slice(0, 300) });
      if (events.current.length > MAX_EVENTS) events.current.shift();
    };

    // ── Snapshot builders ───────────────────────────────────────────────────

    // Is the SVG refraction backdrop-filter actually live right now? This is the
    // prime suspect, and it differs per route: the /shop index disables it via
    // `html:has(.shop-page)` in globals.css, the sub-routes do not.
    const renderState = () => {
      let refractActive = false;
      let backdropCount = 0;
      let largestBackdropArea = 0;
      let promotedCount = 0;

      try {
        document.querySelectorAll<HTMLElement>("*").forEach((el) => {
          const cs = getComputedStyle(el);
          const bf =
            cs.backdropFilter ||
            (cs as CSSStyleDeclaration & { webkitBackdropFilter?: string })
              .webkitBackdropFilter ||
            "";
          if (!bf || bf === "none") return;
          backdropCount++;
          if (bf.includes("url(")) refractActive = true;
          if (cs.transform && cs.transform !== "none") promotedCount++;
          const r = el.getBoundingClientRect();
          largestBackdropArea = Math.max(
            largestBackdropArea,
            Math.round(r.width * r.height),
          );
        });
      } catch {
        /* style read failed — not worth losing the whole report over */
      }

      return {
        refractActive,
        backdropCount,
        largestBackdropArea,
        promotedCount,
        glassFx: document.documentElement.dataset.glassfx ?? "on",
        motion: document.documentElement.dataset.motion ?? "normal",
      };
    };

    // Distinguishes failure mode (A) from (B): if these numbers look healthy,
    // React is fine and the problem is downstream of the DOM.
    const domState = () => {
      const main = document.querySelector("main");
      return {
        mainChildren: main ? main.children.length : -1,
        mainHeight: main ? Math.round(main.getBoundingClientRect().height) : -1,
        bodyTextLength: (document.body?.innerText ?? "").trim().length,
        productCards: document.querySelectorAll(".shop-card").length,
        hasShopPage: !!document.querySelector(".shop-page"),
      };
    };

    const buildPayload = (reason: ReportReason) => {
      const perfMemory = (
        performance as Performance & {
          memory?: { usedJSHeapSize: number; jsHeapSizeLimit: number };
        }
      ).memory;

      const nav = performance.getEntriesByType(
        "navigation",
      )[0] as PerformanceNavigationTiming | undefined;

      return {
        reason,
        page: {
          href: location.href,
          pathname: location.pathname,
          referrer: document.referrer || null,
          navType: nav?.type ?? null,
          msOnPage: since(),
          scrollY: Math.round(window.scrollY),
          docHeight: document.documentElement.scrollHeight,
        },
        viewport: {
          w: window.innerWidth,
          h: window.innerHeight,
          dpr: window.devicePixelRatio,
          visibility: document.visibilityState,
        },
        device: {
          ua: navigator.userAgent,
          cores: navigator.hardwareConcurrency ?? null,
          deviceMemory:
            (navigator as Navigator & { deviceMemory?: number }).deviceMemory ??
            null,
          reducedMotion: window.matchMedia("(prefers-reduced-motion: reduce)")
            .matches,
        },
        render: renderState(),
        dom: domState(),
        perf: {
          jsHeapMB: perfMemory
            ? Math.round(perfMemory.usedJSHeapSize / 1048576)
            : null,
          heapLimitMB: perfMemory
            ? Math.round(perfMemory.jsHeapSizeLimit / 1048576)
            : null,
          maxLongTaskMs: Math.round(maxLongTask.current),
        },
        events: events.current,
      };
    };

    const send = (reason: ReportReason) => {
      if (sent.current >= MAX_REPORTS_PER_SESSION) return;
      sent.current++;
      try {
        // keepalive so the report survives an immediate navigation away.
        fetch(ENDPOINT, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(buildPayload(reason)),
          keepalive: true,
        }).catch(() => {
          /* diagnostics must never surface an error of their own */
        });
      } catch {
        /* ignore */
      }
    };

    // ── Automatic tripwires ─────────────────────────────────────────────────

    const onError = (e: ErrorEvent) => {
      record("js-error", `${e.message} @ ${e.filename}:${e.lineno}`);
      send("js-error");
    };

    const onRejection = (e: PromiseRejectionEvent) => {
      record("unhandled-rejection", String(e.reason));
      send("unhandled-rejection");
    };

    const onVisibility = () => record("visibility", document.visibilityState);

    window.addEventListener("error", onError);
    window.addEventListener("unhandledrejection", onRejection);
    document.addEventListener("visibilitychange", onVisibility);

    // GPU process tripwire. A 1x1 context that is never drawn to — if the GPU
    // process resets underneath us, this fires and we learn the paint path died.
    let canvas: HTMLCanvasElement | null = null;
    const onContextLost = () => {
      record("webgl-context-lost", "GPU context lost");
      send("webgl-context-lost");
    };
    const onContextRestored = () => record("webgl-context-restored", "restored");
    try {
      canvas = document.createElement("canvas");
      canvas.width = 1;
      canvas.height = 1;
      canvas.getContext("webgl");
      canvas.addEventListener("webglcontextlost", onContextLost);
      canvas.addEventListener("webglcontextrestored", onContextRestored);
    } catch {
      canvas = null;
    }

    // Passive stall observation — no rAF loop, so we don't perturb compositing.
    let observer: PerformanceObserver | null = null;
    try {
      observer = new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
          if (entry.duration > maxLongTask.current) {
            maxLongTask.current = entry.duration;
          }
          if (entry.duration >= 500) {
            record("long-task", `${entry.entryType} ${Math.round(entry.duration)}ms`);
          }
        }
      });
      observer.observe({ type: "longtask", buffered: true });
    } catch {
      observer = null;
    }

    // Catches failure mode (A) only — an emptied DOM.
    const blankPoll = window.setInterval(() => {
      if (document.visibilityState !== "visible") return;
      const dom = domState();
      if (dom.mainChildren === 0 || dom.bodyTextLength === 0) {
        record("dom-blank", JSON.stringify(dom));
        send("dom-blank");
      }
    }, BLANK_POLL_MS);

    // ── Manual trigger ──────────────────────────────────────────────────────
    // The important one. If the screen is white but JS is alive, this still
    // fires — and a report with a healthy DOM and no errors is the evidence
    // that distinguishes a paint failure from a React failure.
    const onKey = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key === "9") {
        e.preventDefault();
        send("manual");
        toast.push({
          tone: "info",
          title: "Diagnostic captured",
          message:
            "Sent a snapshot of this page to the dev team. Thanks — you can keep browsing.",
          durationMs: 6000,
        });
      }
    };
    window.addEventListener("keydown", onKey);

    return () => {
      window.removeEventListener("error", onError);
      window.removeEventListener("unhandledrejection", onRejection);
      document.removeEventListener("visibilitychange", onVisibility);
      window.removeEventListener("keydown", onKey);
      window.clearInterval(blankPoll);
      observer?.disconnect();
      if (canvas) {
        canvas.removeEventListener("webglcontextlost", onContextLost);
        canvas.removeEventListener("webglcontextrestored", onContextRestored);
      }
    };
    // Re-arm per route so `msOnPage` and the event buffer are scoped to the
    // page the user is actually looking at.
  }, [pathname, toast]);

  return null;
}
