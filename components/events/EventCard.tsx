// The one event card. Used by the /whats-on grid, the homepage carousel, and
// the variant preview routes — replacing three drifted copies that each had to
// be updated by hand.
//
// Three treatments are in trial (see lib/events.ts):
//   a       restrained — neutral surface, type-led, orange only on the kicker
//           and CTA. The default, and what ships on the live pages.
//   a-pill  as `a`, plus a category chip over the artwork.
//   c       full-bleed poster — artwork fills the card, copy on a glass panel.
// Once one is chosen the other two bodies get deleted.
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
  type EventSeries,
} from "@destiny/shared";
import type { EventCardVariant } from "@/lib/events";
import EventCardArtwork from "./EventCardArtwork";

export type EventCardProps = {
  event: EventSeries;
  variant?: EventCardVariant;
  href?: string;
  /** Adds the "Featured" marker used when the card is pinned first. */
  featured?: boolean;
  priority?: boolean;
  sizes?: string;
  className?: string;
};

/**
 * Anton is applied inline rather than by utility because globals.css carries an
 * *unlayered* `h1,h2,h3 { font-family: var(--font-heading) }`, which outranks
 * every Tailwind font utility. Same workaround PromoRail.tsx documents.
 */
const TITLE_FONT = { fontFamily: "var(--font-roboto)" } as const;

/**
 * The line under the title. Location when we have one, otherwise the session
 * count for a recurring series. Only a real location gets the pin icon — a
 * pin next to "7 sessions" would be nonsense.
 */
function secondaryLine(
  event: EventSeries,
): { text: string; isLocation: boolean } | null {
  const location = event.primary.location?.name?.trim();
  if (location) return { text: location, isLocation: true };
  if (event.sessionCount > 1)
    return { text: `${event.sessionCount} sessions`, isLocation: false };
  return null;
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
  variant = "a",
  href,
  featured = false,
  priority,
  sizes,
  className = "",
}: EventCardProps) {
  const target = href ?? `/whats-on/${event.slug}`;
  const kicker = formatKicker(event.primary);
  const secondary = secondaryLine(event);
  const category = event.primary.category?.name;
  // Roughly half the feed has no artwork, which changes how overlays read.
  const hasArtwork = Boolean(eventImage(event.primary));

  if (variant === "c") {
    return (
      <Link
        href={target}
        className={`group relative block aspect-[3/4] overflow-hidden rounded-[24px] shadow-[0_2px_6px_rgba(16,24,40,.08),0_18px_40px_-16px_rgba(16,24,40,.35)] transition-transform duration-300 hover:-translate-y-1 focus-visible:-translate-y-1 ${className}`}
      >
        <EventCardArtwork event={event} variant="c" priority={priority} sizes={sizes} />
        <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/35 to-transparent" />

        {(featured || category) && (
          <span className="glass glass-sm glass-pill absolute left-4 top-4 px-3 py-1 text-[10.5px] font-bold uppercase tracking-[0.08em] text-white">
            {featured ? "Featured" : category}
          </span>
        )}

        <div className="glass glass-md absolute inset-x-3 bottom-3 rounded-2xl p-4">
          <p className="text-[11px] font-bold uppercase tracking-[0.1em] text-white/85">
            {kicker}
          </p>
          <h3
            style={TITLE_FONT}
            className="mt-2 text-[22px] font-semibold leading-[1.15] tracking-[-0.02em] text-white"
          >
            {event.name}
          </h3>
          {secondary && (
            <p className="mt-2 flex items-center gap-1.5 text-sm text-white/75">
              {secondary.isLocation && <LocationPin />}
              <span className="min-w-0 truncate">{secondary.text}</span>
            </p>
          )}
          <span className="mt-4 inline-flex rounded-full bg-white px-4 py-2 text-[13px] font-bold text-destiny-grey transition-transform duration-300 group-hover:scale-[1.03]">
            {ctaLabel(event)}
          </span>
        </div>
      </Link>
    );
  }

  // Variants `a` and `a-pill` share everything but the chip.
  return (
    <Link
      href={target}
      className={`group flex flex-col overflow-hidden rounded-[20px] border border-black/[0.07] bg-white shadow-[0_1px_2px_rgba(16,24,40,.04),0_8px_24px_-8px_rgba(16,24,40,.10)] transition-all duration-300 hover:-translate-y-1 hover:shadow-[0_2px_4px_rgba(16,24,40,.05),0_16px_36px_-12px_rgba(16,24,40,.16)] focus-visible:-translate-y-1 ${className}`}
    >
      <div className="relative shrink-0">
        <EventCardArtwork
          event={event}
          variant={variant}
          priority={priority}
          sizes={sizes}
        />
        {(variant === "a-pill" || featured) && (category || featured) && (
          <>
            {/* The scrim only earns its place over real artwork, where a pale
                photo would swallow the white chip. The orange fallback is
                already dark enough to carry white text on its own. */}
            {hasArtwork && (
              <div
                aria-hidden
                className="absolute inset-x-0 top-0 h-16 bg-gradient-to-b from-black/35 to-transparent"
              />
            )}
            <span className="glass glass-sm glass-pill absolute left-3 top-3 px-3 py-1 text-[10.5px] font-bold uppercase tracking-[0.08em] text-white">
              {featured ? "Featured" : category}
            </span>
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
        {secondary && (
          <p className="mt-2 flex items-center gap-1.5 text-sm leading-[1.45] text-destiny-grey/55">
            {secondary.isLocation && <LocationPin className="text-destiny-grey/35" />}
            <span className="min-w-0 truncate">{secondary.text}</span>
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
            <span className="min-w-0 truncate text-[11.5px] text-destiny-grey/45">
              {category}
            </span>
          )}
        </div>
      </div>
    </Link>
  );
}
