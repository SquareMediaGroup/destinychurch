"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import PopupShell from "@/components/PopupShell";
import { usePopupGate } from "@/lib/popupGate";

interface PopupData {
  active: boolean;
  title: string | null;
  body: string | null;
  cta_text: string | null;
  cta_link: string | null;
  image_url: string | null;
  show_once: boolean;
  updated_at?: string | null;
}

const STORAGE_KEY = "dc-popup-dismissed";

/**
 * The general announcement popup.
 *
 * app/layout.tsx passes `null` here whenever an event popup is live, so the two
 * can never stack — see components/events/EventPopup.tsx.
 *
 * Suppressed on /nfc: that page is a grid of popups people opened on purpose,
 * mid-service, and an announcement landing on top of one is the one failure it
 * can't afford. The layout is a server component and can't know the path, so
 * the check happens here with usePathname, as EventPopup does.
 *
 * Also held off while the homepage welcome overlay is open — see lib/popupGate.ts.
 * The timer arms once it closes, so the announcement still lands, just after.
 */
export default function SitePopup({ popup }: { popup: PopupData | null }) {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();
  const welcomeOpen = usePopupGate((s) => s.welcomeOpen);
  const excluded = pathname.startsWith("/nfc");

  useEffect(() => {
    if (excluded) return;
    if (welcomeOpen) return;
    if (!popup || !popup.active) return;
    const hasContent = !!popup.title || !!popup.body || !!popup.image_url;
    if (!hasContent) return;

    if (popup.show_once) {
      try {
        // Keyed on updated_at, so editing the popup re-shows it to everyone
        // who had already dismissed the previous version.
        const dismissed = window.localStorage.getItem(STORAGE_KEY);
        if (dismissed && dismissed === (popup.updated_at ?? "")) return;
      } catch {
        /* ignore */
      }
    }

    const t = window.setTimeout(() => setOpen(true), 7000);
    return () => window.clearTimeout(t);
  }, [popup, excluded, welcomeOpen]);

  function close() {
    setOpen(false);
    if (popup?.show_once) {
      try {
        window.localStorage.setItem(STORAGE_KEY, popup.updated_at ?? "1");
      } catch {
        /* ignore */
      }
    }
  }

  if (excluded || !popup || !popup.active || !open) return null;

  return (
    <PopupShell
      title={popup.title}
      body={popup.body}
      imageUrl={popup.image_url}
      ctaText={popup.cta_text}
      ctaLink={popup.cta_link}
      onClose={close}
    />
  );
}
