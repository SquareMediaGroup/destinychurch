"use client";

import { usePathname } from "next/navigation";
import { useFloatingSmartSearchHidden } from "@/lib/smartSearchVisibility";
import SmartSearchWidget from "@/components/smartSearch/SmartSearchWidget";

export default function FloatingSmartSearch({
  searchEnabled = true,
}: {
  /** Whether the AI service is up. False hides the widget entirely — there's
   *  nothing else for it to do. */
  searchEnabled?: boolean;
}) {
  const pathname = usePathname();
  const hiddenByPage = useFloatingSmartSearchHidden();

  // /nfc is the chrome-free in-service page: the tiles are the whole interface.
  // /portal is the staff self-service area: its own minimal shell, no site nav.
  if (
    pathname.startsWith("/admin") ||
    pathname.startsWith("/training") ||
    pathname.startsWith("/nfc") ||
    pathname.startsWith("/portal")
  )
    return null;

  // Some pages (e.g. the 404 page) embed their own Smart Search box and hide
  // this floating pill for as long as they're mounted, so there's only ever
  // one Smart Search entry point on screen at once.
  if (hiddenByPage) return null;

  return <SmartSearchWidget searchEnabled={searchEnabled} fixed />;
}
