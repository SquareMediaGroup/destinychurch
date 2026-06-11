"use client";

import dynamic from "next/dynamic";
import { useSearchParams } from "next/navigation";

// The visual-edit overlay is admin-only tooling; keep its chunk out of public
// page loads entirely and only fetch it when edit mode is requested.
const VisualEditOverlay = dynamic(() => import("./VisualEditOverlay"), {
  ssr: false,
});

export default function VisualEditOverlayGate() {
  const params = useSearchParams();
  if (params.get("__edit") !== "1") return null;
  return <VisualEditOverlay />;
}
