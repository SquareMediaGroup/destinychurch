// Which popup gets the screen.
//
// SitePopup and EventPopup already sort themselves out server-side: app/layout.tsx
// passes null to <SitePopup> whenever an event popup resolves, so only one of the
// two can ever render. The welcome overlay can't join that scheme — whether it
// opens depends on the path and on sessionStorage, which only the client knows.
//
// So this is the one piece of shared client state: a flag the overlay raises while
// it owns the screen, and the two promo popups check before arming their 7s timer.
// Precedence is WelcomeOverlay > EventPopup > SitePopup.

"use client";

import { create } from "zustand";

interface PopupGateState {
  /** True while the homepage welcome overlay is open. */
  welcomeOpen: boolean;
  setWelcomeOpen: (open: boolean) => void;
}

export const usePopupGate = create<PopupGateState>((set) => ({
  welcomeOpen: false,
  setWelcomeOpen: (welcomeOpen) => set({ welcomeOpen }),
}));
