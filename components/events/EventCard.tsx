// The one event card. Used by the /whats-on grid and the homepage carousel —
// replacing three drifted copies that each had to be updated by hand.
//
// This was the "a" treatment out of three tried in a variant trial (see the
// removed lib/events.ts EventCardVariant): restrained, neutral surface,
// type-led, orange only on the kicker and CTA. It shipped on the live pages
// from the start; the other two ("a-pill", a category chip over the artwork,
// and "c", a full-bleed poster) only ever existed on the /home and
// /whats-on/new preview routes, which are gone along with them.
//
// Deliberately server-safe: no "use client", no hooks, and — importantly — no
// clock reads. Filtering to upcoming events and grouping by month happen on the
// server, so the card only formats dates it is handed. A `Date.now()` in here
// would hydrate differently from the server at midnight and DST boundaries.

import Link from "next/link";
import {
  eventImage,
  eventSignupUrl,
  formatKicker,
  isMultiday,
  type EventSeries,
} from "@destiny/shared";
import EventCardArtwork from "./EventCardArtwork";

export type EventCardProps = {
  event: EventSeries;
  href?: string;
  /** Adds the "Featured" marker used when the card is pinned first. */
  featured?: boolean;
  priority?: boolean;
  sizes?: string;
  className?: string;
};

/**
 * Applied inline rather than by utility because globals.css carries an
 * *unlayered* `h1,h2,h3 { font-family: var(--font-heading) }`, which outranks
 * every Tailwind font utility. Same workaround PromoRail.tsx documents, but
 * this card's title uses the body font (Roboto), not Anton.
 */
const TITLE_FONT = { fontFamily: "var(--font-roboto)" } as const;

/**
 * The line under the title: the venue, when the feed gives us one. The session
 * count used to fall back into this slot, but it lives in the tag row now, so
 * this is location-only and always earns the pin icon.
 */
function locationName(event: EventSeries): string | null {
  return event.primary.location?.name?.trim() || null;
}

/**
 * The pills overlaid on the artwork.
 *
 * `Multiday` and `N Sessions` are the two the old cards carried; `Featured`
 * marks the admin-promoted event.
 */
function eventTags(event: EventSeries, featured: boolean): string[] {
  const tags: string[] = [];
  if (featured) tags.push("Featured");
  if (isMultiday(event.primary)) tags.push("Multiday");
  if (event.sessionCount > 1) tags.push(`${event.sessionCount} Sessions`);
  return tags;
}

/** One shared pill treatment, so every tag reads the same as `Featured`. */
function EventTags({ tags, inset }: { tags: string[]; inset: string }) {
  if (tags.length === 0) return null;
  return (
    <div className={`absolute ${inset} flex flex-wrap items-center gap-2`}>
      {tags.map((tag) => (
        <span
          key={tag}
          className="glass glass-sm glass-pill px-3 py-1 text-[10.5px] font-bold uppercase tracking-[0.08em] text-white"
        >
          {tag}
        </span>
      ))}
    </div>
  );
}

function LocationPin({ className = "" }: { className?: string }) {
  return (
    <svg
      aria-hidden
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={`h-[15px] w-[15px] shrink-0 ${className}`}
    >
      <path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 1116 0z" />
      <circle cx="12" cy="10" r="3" />
    </svg>
  );
}

function ctaLabel(event: EventSeries): string {
  return eventSignupUrl(event.primary) ? "Sign up" : "Find out more";
}

export default function EventCard({
  event,
  href,
  featured = false,
  priority,
  sizes,
  className = "",
}: EventCardProps) {
  const target = href ?? `/whats-on/${event.slug}`;
  const kicker = formatKicker(event.primary);
  const location = locationName(event);
  const category = event.primary.category?.name;
  // Roughly half the feed has no artwork, which changes how overlays read.
  const hasArtwork = Boolean(eventImage(event.primary));
  const tags = eventTags(event, featured);

  return (
    <Link
      href={target}
      className={`group flex flex-col overflow-hidden rounded-[20px] border border-black/[0.07] bg-white shadow-[0_1px_2px_rgba(16,24,40,.04),0_8px_24px_-8px_rgba(16,24,40,.10)] transition-all duration-300 hover:-translate-y-1 hover:shadow-[0_2px_4px_rgba(16,24,40,.05),0_16px_36px_-12px_rgba(16,24,40,.16)] focus-visible:-translate-y-1 ${className}`}
    >
      <div className="relative shrink-0">
        <EventCardArtwork event={event} priority={priority} sizes={sizes} />
        {tags.length > 0 && (
          <>
            {/* The scrim only earns its place over real artwork, where a pale
                photo would swallow the white pills. The orange fallback is
                already dark enough to carry white text on its own. */}
            {hasArtwork && (
              <div
                aria-hidden
                className="absolute inset-x-0 top-0 h-16 bg-gradient-to-b from-black/35 to-transparent"
              />
            )}
            <EventTags tags={tags} inset="left-3 top-3 right-3" />
          </>
        )}
      </div>

      <div className="flex flex-1 flex-col p-5 sm:p-6">
        <p className="text-[11.5px] font-bold uppercase tracking-[0.09em] text-destiny-orange">
          {kicker}
        </p>
        <h3
          style={TITLE_FONT}
          className="mt-2 text-[20px] font-semibold leading-[1.22] tracking-[-0.017em] text-destiny-grey"
        >
          {event.name}
        </h3>
        {location && (
          <p className="mt-2 flex items-center gap-1.5 text-sm leading-[1.45] text-subtle">
            <LocationPin className="text-destiny-grey/35" />
            <span className="min-w-0 truncate">{location}</span>
          </p>
        )}

        {/* mt-auto pins the footer to the card bottom so cards in a row share a
            baseline; pt-5 is the floor, guaranteeing breathing room even when a
            two-line title leaves no slack to distribute. */}
        <div className="mt-auto flex items-center justify-between gap-4 pt-5">
          <span className="inline-flex items-center gap-1 text-sm font-semibold text-destiny-orange">
            {ctaLabel(event)}
            <span aria-hidden className="transition-transform duration-200 group-hover:translate-x-0.5">
              ›
            </span>
          </span>
          {category && (
            <span className="min-w-0 truncate text-[11.5px] text-subtle">
              {category}
            </span>
          )}
        </div>
      </div>
    </Link>
  );
}
