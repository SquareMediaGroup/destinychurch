"use client";

import dynamic from "next/dynamic";

// Code-split the search widget out of the shared bundle; it is floating UI
// that can appear after hydration without any layout shift.
const FloatingSmartSearch = dynamic(() => import("./FloatingSmartSearch"), {
  ssr: false,
});

export default function FloatingSmartSearchLazy() {
  return <FloatingSmartSearch />;
}
