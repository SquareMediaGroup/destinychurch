"use client";

// Smart Search on the 404 page — the exact same widget as the site-wide
// floating pill (components/FloatingSmartSearch.tsx), just dropped inline in
// the page flow instead of floating fixed to the viewport. The floating pill
// hides itself for as long as this is mounted (useHideFloatingSmartSearch)
// so there's only one Smart Search entry point on screen.

import { useEffect } from "react";
import { useHideFloatingSmartSearch } from "@/lib/smartSearchVisibility";
import SmartSearchWidget from "@/components/smartSearch/SmartSearchWidget";

export default function NotFoundSearch({ searchEnabled }: { searchEnabled: boolean }) {
  const hide = useHideFloatingSmartSearch();
  useEffect(() => hide(), [hide]);

  return <SmartSearchWidget searchEnabled={searchEnabled} fixed={false} />;
}
