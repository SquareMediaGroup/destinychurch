"use client";

// The popup advertising the admin-featured event.
//
// Two behaviours differ from the generic SitePopup:
//
//   Frequency — sessionStorage, not localStorage, so it shows once per visit
//   rather than once ever. Event promotion is time-boxed; a returning visitor
//   next week should see it again.
//
//   Placement — suppressed on /whats-on and on the event's own page, where the
//   promo would be telling people about something they are already looking at.
//   The root layout is a server component and can't know the path, and a route
//   group would mean duplicating the whole layout, so the check happens here
//   with usePathname (which, unlike useSearchParams, needs no Suspense
//   boundary).
//
// Suppressing the *site* popup is handled server-side: app/layout.tsx passes
// null to <SitePopup> whenever this one resolves.

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import PopupShell from "@/components/PopupShell";
import type { ResolvedEventPopup } from "@/lib/events.server";

const STORAGE_KEY = "dc-event-popup-seen";

function isExcluded(pathname: string, eventSlug: string): boolean {
  const path = pathname.replace(/\/+$/, "") || "/";
  return (
    path === "/whats-on" ||
    // Temporary: the card-variant preview route. Remove with app/whats-on/new/.
    path === "/whats-on/new" ||
    (Boolean(eventSlug) && path === `/whats-on/${eventSlug}`)
  );
}

export default function EventPopup({
  popup,
}: {
  popup: ResolvedEventPopup | null;
}) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!popup) return;

    // Don't arm the timer on an excluded page. Closing an already-open popup
    // needs no state change: the render guard below returns null while the
    // path is excluded, and the effect re-runs on every navigation.
    if (isExcluded(pathname, popup.eventSlug)) return;

    // Both parts matter: switching the featured event *or* editing its copy
    // bumps updated_at, and either should show the popup again this session.
    const key = `${popup.identifier ?? popup.eventSlug}:${popup.updatedAt ?? ""}`;
    try {
      if (window.sessionStorage.getItem(STORAGE_KEY) === key) return;
    } catch {
      /* ignore */
    }

    const t = window.setTimeout(() => setOpen(true), 600);
    return () => window.clearTimeout(t);
  }, [popup, pathname]);

  function close() {
    setOpen(false);
    if (!popup) return;
    try {
      window.sessionStorage.setItem(
        STORAGE_KEY,
        `${popup.identifier ?? popup.eventSlug}:${popup.updatedAt ?? ""}`,
      );
    } catch {
      /* ignore */
    }
  }

  if (!popup || !open || isExcluded(pathname, popup.eventSlug)) return null;

  return (
    <PopupShell
      title={popup.title}
      body={popup.body}
      imageUrl={popup.imageUrl}
      ctaText={popup.ctaText}
      ctaLink={popup.ctaLink}
      onClose={close}
    />
  );
}
