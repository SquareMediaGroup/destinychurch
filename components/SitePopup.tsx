"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import PopupShell from "@/components/PopupShell";

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

const STORAGE_KEY = "dc-popup-seen";

/**
 * The general announcement popup.
 *
 * app/layout.tsx passes `null` here whenever an event popup is live, so the two
 * can never stack — see components/events/EventPopup.tsx.
 *
 * Suppressed on /nfc: that page is a grid of popups people opened on purpose,
 * mid-service, and an announcement landing on top of one is the one failure it
 * can't afford. Suppressed on /admin/*: admin pages should never show popups
 * to staff. The layout is a server component and can't know the path, so
 * the check happens here with usePathname, as EventPopup does.
 */
export default function SitePopup({ popup }: { popup: PopupData | null }) {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();
  const excluded = pathname.startsWith("/nfc") || pathname.startsWith("/admin");

  useEffect(() => {
    if (excluded) return;
    if (!popup || !popup.active) return;
    const hasContent = !!popup.title || !!popup.body || !!popup.image_url;
    if (!hasContent) return;

    // Keyed on updated_at, so editing the popup shows it again this session
    // even to visitors who already saw the previous version.
    const key = popup.updated_at ?? "1";

    if (popup.show_once) {
      try {
        if (window.sessionStorage.getItem(STORAGE_KEY) === key) return;
      } catch {
        /* ignore */
      }
    }

    const t = window.setTimeout(() => {
      setOpen(true);
      if (popup.show_once) {
        try {
          window.sessionStorage.setItem(STORAGE_KEY, key);
        } catch {
          /* ignore */
        }
      }
    }, 7000);
    return () => window.clearTimeout(t);
  }, [popup, excluded]);

  function close() {
    setOpen(false);
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
