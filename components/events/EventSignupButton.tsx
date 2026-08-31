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
import Button from "@/components/ui/Button";

/** ChurchSuite serves our own subdomain, which allows framing; nothing else. */
function isEmbeddable(url: string): boolean {
  try {
    return new URL(url).hostname.endsWith("churchsuite.com");
  } catch {
    return false;
  }
}

/**
 * The id ChurchSuite gives the signup form. Loading the iframe at this fragment
 * opens it scrolled straight to the first field, so the artwork, date block,
 * description and map — all of which the page around the modal already shows —
 * sit above the fold instead of making the visitor scroll past them twice.
 *
 * A fragment is the only lever we have: the iframe is cross-origin, so its DOM
 * is opaque to our CSS and JS, and none of ChurchSuite's URL variants
 * (/embed/events/…, /events/…/signup, ?embedded=1) serve a signup-only view —
 * all four return the identical full page. Proxying it through our own server
 * would make it ours to style, but it would also put us in the path of their
 * Cloudflare clearance, reCAPTCHA and Stripe session. Not worth it.
 *
 * Degrades quietly on both sides: events with signups closed have no such
 * element and open at the top (which is right — the page content *is* the
 * point there), and if ChurchSuite ever renames the id, same outcome.
 */
const SIGNUP_ANCHOR = "#form_event_signup";

export default function EventSignupButton({
  url,
  label,
  eventName,
  subtitle,
  jumpToSignup = false,
}: {
  url: string;
  label: string;
  eventName: string;
  subtitle?: string;
  /** Set when the event actually takes signups; see SIGNUP_ANCHOR. */
  jumpToSignup?: boolean;
}) {
  const [open, setOpen] = useState(false);

  if (!isEmbeddable(url)) {
    return (
      <Button href={url} variant="primary" shape="pill" size="lg">
        {label}
      </Button>
    );
  }

  return (
    <>
      <Button type="button" variant="primary" shape="pill" size="lg" onClick={() => setOpen(true)}>
        {label}
      </Button>
      <AlphaSignupModal
        open={open}
        onClose={() => setOpen(false)}
        signupUrl={
          jumpToSignup && !url.includes("#") ? `${url}${SIGNUP_ANCHOR}` : url
        }
        title={eventName}
        subtitle={subtitle}
        size="lg"
      />
    </>
  );
}
