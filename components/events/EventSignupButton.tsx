"use client";

// The event page's primary CTA.
//
// It used to be an <a target="_blank"> that dropped visitors on
// destinytees.churchsuite.com — losing the site's chrome halfway through the
// journey. ChurchSuite's own event pages frame cleanly (KidsCampForm has
// embedded one for a while), and the whole signup is multi-step *inside* the
// iframe, so the entire flow — tickets, details, confirmation — completes in
// the modal without another navigation.
//
// The one case that still leaves the site is a third-party ticket URL
// (Eventbrite and friends set X-Frame-Options: DENY, so an iframe would render
// a blank box). Those keep the old new-tab link.

import { useState } from "react";
import AlphaSignupModal from "@/components/AlphaSignupModal";

/** ChurchSuite serves our own subdomain, which allows framing; nothing else. */
function isEmbeddable(url: string): boolean {
  try {
    return new URL(url).hostname.endsWith("churchsuite.com");
  } catch {
    return false;
  }
}

export default function EventSignupButton({
  url,
  label,
  eventName,
  subtitle,
}: {
  url: string;
  label: string;
  eventName: string;
  subtitle?: string;
}) {
  const [open, setOpen] = useState(false);

  const className =
    "inline-flex items-center justify-center rounded-full bg-destiny-orange px-7 py-3 text-sm font-bold text-white shadow-sm shadow-destiny-orange/20 transition hover:brightness-110";

  if (!isEmbeddable(url)) {
    return (
      <a href={url} target="_blank" rel="noopener noreferrer" className={className}>
        {label}
      </a>
    );
  }

  return (
    <>
      <button type="button" onClick={() => setOpen(true)} className={className}>
        {label}
      </button>
      <AlphaSignupModal
        open={open}
        onClose={() => setOpen(false)}
        signupUrl={url}
        title={eventName}
        subtitle={subtitle}
        size="lg"
      />
    </>
  );
}
