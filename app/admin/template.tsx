"use client";

// Smooths the jump between admin pages.
//
// A template rather than a layout: Next remounts it on every route change,
// which is exactly the boundary we want to animate. The shared `name` means
// React hands the old and new content to the View Transition API as the same
// element, so it cross-fades instead of the content snapping in — and the
// mobile tab bar's active pill (AdminTabBar.tsx), named in the same way, slides
// across the bar in the same frame.
//
// Everything about how it animates lives in app/globals.css next to the rest of
// the admin chrome, including the reduced-motion opt-out — browsers without the
// API simply navigate as before.

import { ViewTransition } from "react";

export default function AdminTemplate({ children }: { children: React.ReactNode }) {
  return <ViewTransition name="admin-page">{children}</ViewTransition>;
}
