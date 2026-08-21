"use client";

// The signed-in admin's onboarding progress, shared by the gate, the checklist
// and the tour.
//
// Same module-scope cached-promise trick as lib/useAdminSession.ts: three
// components need this on every admin page load, and without sharing they'd
// each fire their own request.
//
// It fails open, deliberately. If /api/admin/onboarding can't be read — the
// table isn't migrated yet, the network blipped — we resolve to "gate already
// seen, checklist already dismissed". A welcome modal that hard-gates the
// dashboard must never be able to lock someone out because a table is missing;
// the worst case is that nobody is offered onboarding, which is exactly where
// we were before this feature existed.

import { useCallback, useEffect, useState } from "react";

export interface OnboardingState {
  loaded: boolean;
  gateSeen: boolean;
  dismissed: boolean;
  completed: Set<string>;
}

const CLOSED: OnboardingState = {
  loaded: true,
  gateSeen: true,
  dismissed: true,
  completed: new Set(),
};

let cached: Promise<OnboardingState> | null = null;
const listeners = new Set<(state: OnboardingState) => void>();
let current: OnboardingState = { ...CLOSED, loaded: false, gateSeen: false, dismissed: false };

function publish(next: OnboardingState) {
  current = next;
  for (const listener of listeners) listener(next);
}

function load(): Promise<OnboardingState> {
  cached ??= fetch("/api/admin/onboarding")
    .then((r) => (r.ok ? r.json() : null))
    .then((data) => {
      const state: OnboardingState = data
        ? {
            loaded: true,
            gateSeen: Boolean(data.gate_seen),
            dismissed: Boolean(data.dismissed),
            completed: new Set<string>(
              Array.isArray(data.completed_steps) ? data.completed_steps : [],
            ),
          }
        : { ...CLOSED, completed: new Set() };
      publish(state);
      return state;
    })
    .catch(() => {
      const state = { ...CLOSED, completed: new Set<string>() };
      publish(state);
      return state;
    });
  return cached;
}

/**
 * Local state moves first and the write follows. A failed PATCH is swallowed:
 * losing a tick is a smaller problem than a checklist that freezes because the
 * network hiccupped mid-tour.
 */
function save(patch: Record<string, unknown>) {
  void fetch("/api/admin/onboarding", {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(patch),
  }).catch(() => {});
}

export function useOnboarding() {
  const [state, setState] = useState<OnboardingState>(current);

  useEffect(() => {
    listeners.add(setState);
    void load().then(setState);
    return () => {
      listeners.delete(setState);
    };
  }, []);

  const completeSection = useCallback((id: string) => {
    if (current.completed.has(id)) return;
    const completed = new Set(current.completed);
    completed.add(id);
    publish({ ...current, completed });
    save({ completed_steps: [id] });
  }, []);

  const setGateSeen = useCallback(() => {
    if (current.gateSeen) return;
    publish({ ...current, gateSeen: true });
    save({ gate_seen: true });
  }, []);

  const dismiss = useCallback(() => {
    publish({ ...current, dismissed: true, gateSeen: true });
    save({ dismissed: true, gate_seen: true });
  }, []);

  const restore = useCallback(() => {
    publish({ ...current, dismissed: false });
    save({ dismissed: false });
  }, []);

  /** "Run it again" — clears every tick so the checklist starts over. */
  const reset = useCallback(() => {
    publish({ ...current, completed: new Set(), dismissed: false });
    save({ completed_steps: [], reset: true, dismissed: false });
  }, []);

  return { ...state, completeSection, setGateSeen, dismiss, restore, reset };
}
