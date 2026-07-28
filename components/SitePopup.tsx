"use client";

import { useEffect, useState } from "react";
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

const STORAGE_KEY = "dc-popup-dismissed";

/**
 * The general announcement popup.
 *
 * app/layout.tsx passes `null` here whenever an event popup is live, so the two
 * can never stack — see components/events/EventPopup.tsx.
 */
export default function SitePopup({ popup }: { popup: PopupData | null }) {
  const [open, setOpen] = useState(false);

  useEffect(() => {
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

    const t = window.setTimeout(() => setOpen(true), 600);
    return () => window.clearTimeout(t);
  }, [popup]);

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

  if (!popup || !popup.active || !open) return null;

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
