"use client";

// An event block: one pinned ChurchSuite event, or the next few.
//
// Cards whose event takes signups in ChurchSuite open the signup form in the
// same modal /nfc uses; the rest go to the event's /whats-on page. The cards
// are resolved on the server (lib/linkPages/linkPages.server.ts), so this only
// handles the click.

import { useState } from "react";
import Link from "next/link";
import ChurchSuiteModal from "@/components/ui/ChurchSuiteModal";
import { trackClick } from "@/lib/track";
import { safeMediaUrl } from "@/lib/linkPages/urls";
import type { EventCard, LinkBlockOf } from "@/lib/linkPages/types";

function EventRow({
  event,
  featured,
  onOpen,
  onNavigate,
}: {
  event: EventCard;
  featured: boolean;
  onOpen: () => void;
  onNavigate: (e: React.MouseEvent) => void;
}) {
  const image = safeMediaUrl(event.image);
  const badge = event.signupUrl ? "Sign up" : null;

  const body = featured ? (
    <>
      <span className="lp-btn-fill" aria-hidden="true" />
      {image ? (
        // eslint-disable-next-line @next/next/no-img-element -- ChurchSuite artwork, no intrinsic size
        <img className="lp-btn-art" src={image} alt="" loading="lazy" />
      ) : (
        <span className="lp-btn-art-fallback" aria-hidden="true">
          <span className="material-symbols-rounded">event</span>
        </span>
      )}
      <span className="lp-btn-caption">
        <span className="lp-btn-body">
          <span className="lp-event-kicker">{event.kicker}</span>
          <span className="lp-btn-title">{event.name}</span>
          {event.location && <span className="lp-btn-sub">{event.location}</span>}
        </span>
        {badge ? <span className="lp-btn-badge">{badge}</span> : (
          <span className="lp-btn-arrow material-symbols-rounded" aria-hidden="true">arrow_forward</span>
        )}
      </span>
    </>
  ) : (
    <>
      <span className="lp-btn-fill" aria-hidden="true" />
      {image ? (
        // eslint-disable-next-line @next/next/no-img-element -- ChurchSuite artwork, no intrinsic size
        <img className="lp-event-thumb" src={image} alt="" loading="lazy" />
      ) : (
        <DateChip kicker={event.kicker} />
      )}
      <span className="lp-btn-body">
        <span className="lp-event-kicker">{event.kicker}</span>
        <span className="lp-btn-title">{event.name}</span>
      </span>
      {badge ? <span className="lp-btn-badge">{badge}</span> : (
        <span className="lp-btn-arrow material-symbols-rounded" aria-hidden="true">arrow_forward</span>
      )}
    </>
  );

  const common = { className: "lp-btn", "data-variant": featured ? "featured" : "button" };

  return event.signupUrl ? (
    <button type="button" {...common} onClick={onOpen}>
      {body}
    </button>
  ) : (
    <Link href={event.href} prefetch={false} {...common} onClick={onNavigate}>
      {body}
    </Link>
  );
}

/** The day/month square for events without artwork. */
function DateChip({ kicker }: { kicker: string }) {
  // The kicker is already formatted ("WED 5 AUG · 10:00 AM"); pull the day and
  // month back out rather than threading the raw feed date through.
  const match = kicker.match(/(\d{1,2})\s+([A-Z]{3})/);
  return (
    <span className="lp-event-date" aria-hidden="true">
      {match ? (
        <span style={{ display: "flex", flexDirection: "column", alignItems: "center", lineHeight: 1 }}>
          <span style={{ fontSize: 20, fontWeight: 800 }}>{match[1]}</span>
          <span style={{ fontSize: 10, fontWeight: 800, letterSpacing: "0.1em", marginTop: 2 }}>{match[2]}</span>
        </span>
      ) : (
        <span className="material-symbols-rounded">event</span>
      )}
    </span>
  );
}

export default function LinkEvents({
  block,
  events,
  preview,
}: {
  block: LinkBlockOf<"event">;
  events: EventCard[];
  preview: boolean;
}) {
  const [openKey, setOpenKey] = useState<string | null>(null);
  const openEvent = events.find((e) => e.key === openKey) ?? null;
  const featured = block.data.mode === "single";
  const label = block.data.mode === "single" ? block.data.event_name : block.data.heading || "Upcoming events";

  const track = (event: EventCard) => trackClick("links", block.id, `${label}: ${event.name}`);

  return (
    <div>
      {block.data.mode === "upcoming" && block.data.heading && (
        <p className="lp-events-heading">{block.data.heading}</p>
      )}
      <div className="lp-events">
        {events.map((event) => (
          <EventRow
            key={event.key}
            event={event}
            featured={featured}
            onOpen={() => {
              if (preview) return;
              track(event);
              setOpenKey(event.key);
            }}
            onNavigate={(e) => {
              if (preview) {
                e.preventDefault();
                return;
              }
              track(event);
            }}
          />
        ))}
      </div>
      {openEvent?.signupUrl && (
        <ChurchSuiteModal
          open
          onClose={() => setOpenKey(null)}
          src={openEvent.signupUrl}
          title={openEvent.name}
          subtitle={openEvent.kicker}
          embedTitle={`${openEvent.name} signup form`}
          size="lg"
        />
      )}
    </div>
  );
}
