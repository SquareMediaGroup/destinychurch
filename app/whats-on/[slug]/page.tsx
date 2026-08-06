// On-site page for a single ChurchSuite event series.
//
// Until now every event card linked straight out to destinytees.churchsuite.com
// in a new tab, so the site had no shareable, indexable page for anything on the
// calendar. This renders one per *series* — the seven "Destiny 12:2" occurrences
// share one page listing their sessions, rather than seven near-identical pages.

import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import {
  eventDescriptionText,
  eventImage,
  eventSignupUrl,
  formatDateRange,
  formatDayChip,
  formatTimeRange,
  parseFeedDate,
  sanitizeEventHtml,
  type EventIndex,
  type EventSeries,
} from "@destiny/shared";
import EventSignupButton from "@/components/events/EventSignupButton";
import { getEventIndex } from "@/lib/events.server";
import RichContent from "@/components/content/RichContent";

export const revalidate = 300;
// New events appear in the feed between builds; render them on demand rather
// than 404ing until the next revalidation.
export const dynamicParams = true;

type Props = { params: Promise<{ slug: string }> };

export async function generateStaticParams() {
  // The feed returns [] on failure, which yields no params — every page then
  // renders on demand. Deliberately no build-time coupling to ChurchSuite.
  const { series } = await getEventIndex();
  return series.map((s) => ({ slug: s.slug }));
}

/**
 * Find the series for a slug.
 *
 * Falls back to the occurrence identifier so that disambiguated URLs
 * (`kids-fest-bps2cp2r`) and bare identifiers (`/whats-on/bps2cp2r`) keep
 * working after a collision clears or the event is renamed. Returns the
 * canonical slug when a redirect is needed.
 */
function resolve(
  index: EventIndex,
  slug: string,
): { series: EventSeries; canonical: string } | null {
  const direct = index.bySlug.get(slug);
  if (direct) return { series: direct, canonical: direct.slug };

  const trailing = /-([a-z0-9]{6,10})$/i.exec(slug);
  const identifier = trailing?.[1] ?? slug;
  const viaIdentifier = index.byIdentifier.get(identifier);
  if (viaIdentifier) return { series: viaIdentifier, canonical: viaIdentifier.slug };

  return null;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const index = await getEventIndex();
  const found = resolve(index, slug);
  if (!found) return { title: "Event not found" };

  const { series } = found;
  const description =
    eventDescriptionText(series.primary, 160) ||
    `${series.name} at Destiny Church Tees Valley.`;
  const image = eventImage(series.primary, "hero");

  return {
    title: series.name,
    description,
    alternates: { canonical: `/whats-on/${series.slug}` },
    openGraph: {
      title: `${series.name} | Destiny Church Tees Valley`,
      description,
      url: `https://destinytees.uk/whats-on/${series.slug}`,
      type: "website",
      ...(image ? { images: [image] } : {}),
    },
  };
}

function mapsHref(location: NonNullable<EventSeries["primary"]["location"]>): string | null {
  if (location.latitude != null && location.longitude != null) {
    return `https://www.google.com/maps/search/?api=1&query=${location.latitude},${location.longitude}`;
  }
  const query = [location.name, location.address].filter(Boolean).join(", ").trim();
  return query
    ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(query)}`
    : null;
}

function eventSchema(series: EventSeries) {
  const event = series.primary;
  const image = eventImage(event, "hero");
  const signup = eventSignupUrl(event);

  return {
    "@context": "https://schema.org",
    "@type": "Event",
    name: series.name,
    startDate: event.datetime_start.replace(" ", "T"),
    endDate: event.datetime_end.replace(" ", "T"),
    eventStatus: "https://schema.org/EventScheduled",
    eventAttendanceMode: "https://schema.org/OfflineEventAttendanceMode",
    url: `https://destinytees.uk/whats-on/${series.slug}`,
    ...(image ? { image: [image] } : {}),
    ...(eventDescriptionText(event, 300)
      ? { description: eventDescriptionText(event, 300) }
      : {}),
    ...(event.location?.name
      ? {
          location: {
            "@type": "Place",
            name: event.location.name,
            ...(event.location.address
              ? { address: { "@type": "PostalAddress", streetAddress: event.location.address } }
              : {}),
            ...(event.location.latitude != null && event.location.longitude != null
              ? {
                  geo: {
                    "@type": "GeoCoordinates",
                    latitude: event.location.latitude,
                    longitude: event.location.longitude,
                  },
                }
              : {}),
          },
        }
      : {}),
    organizer: {
      "@type": "Organization",
      name: "Destiny Church Tees Valley",
      url: "https://destinytees.uk",
    },
    ...(signup
      ? { offers: { "@type": "Offer", url: signup, availability: "https://schema.org/InStock" } }
      : {}),
  };
}

export default async function EventPage({ params }: Props) {
  const { slug } = await params;
  const index = await getEventIndex();
  const found = resolve(index, slug);
  if (!found) notFound();

  const { series, canonical } = found;
  if (canonical !== slug) redirect(`/whats-on/${canonical}`);

  const event = series.primary;
  const image = eventImage(event, "hero");
  const chip = formatDayChip(event.datetime_start);
  const description = sanitizeEventHtml(event.description);
  const signup = eventSignupUrl(event);
  const location = event.location;
  const maps = location ? mapsHref(location) : null;

  return (
    <article className="bg-white pb-20">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(eventSchema(series)) }}
      />

      <div className="mx-auto max-w-4xl px-4 pt-8 lg:px-8">
        <nav className="mb-6 text-sm text-destiny-grey/50">
          <Link href="/whats-on#events" className="transition hover:text-destiny-grey">
            What&apos;s On
          </Link>
          <span className="mx-2" aria-hidden>
            /
          </span>
          <span className="text-destiny-grey/70">{series.name}</span>
        </nav>

        {image && (
          <div className="relative mb-8 aspect-[4/3] w-full overflow-hidden rounded-3xl bg-[#f5f7fa] sm:aspect-[21/9]">
            <Image
              src={image}
              alt=""
              fill
              priority
              sizes="(max-width: 896px) 100vw, 896px"
              className="object-cover"
            />
          </div>
        )}

        <header className="flex items-start gap-5">
          <div className="flex h-[70px] w-[70px] shrink-0 flex-col items-center justify-center rounded-2xl border border-black/[0.07] bg-white shadow-[0_1px_2px_rgba(16,24,40,.04),0_8px_24px_-8px_rgba(16,24,40,.10)]">
            <span className="text-[26px] font-black leading-none text-destiny-orange">
              {chip.day}
            </span>
            <span className="mt-1 text-[10px] font-bold uppercase tracking-[0.14em] text-destiny-grey/55">
              {chip.month}
            </span>
          </div>
          <div className="min-w-0">
            <h1
              style={{ fontFamily: "var(--font-roboto)" }}
              className="text-[30px] font-semibold leading-[1.15] tracking-[-0.02em] text-destiny-grey md:text-[38px]"
            >
              {series.name}
            </h1>
            <p className="mt-2 text-[15px] text-destiny-grey/65">
              {formatDateRange(event)}
            </p>
            {event.category?.name && (
              <p className="mt-1 text-[13px] text-destiny-grey/45">
                {event.category.name}
              </p>
            )}
          </div>
        </header>

        {(location?.name || location?.address) && (
          <section className="mt-8 rounded-2xl border border-black/[0.07] bg-[#f5f7fa] p-5">
            <h2 className="text-[11.5px] font-bold uppercase tracking-[0.09em] text-destiny-grey/45">
              Where
            </h2>
            <p className="mt-2 text-[15px] font-semibold text-destiny-grey">
              {location.name || location.address}
            </p>
            {location.name && location.address && (
              <p className="mt-0.5 text-sm text-destiny-grey/60">{location.address}</p>
            )}
            {maps && (
              <a
                href={maps}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-3 inline-flex items-center gap-1 text-sm font-semibold text-destiny-orange"
              >
                View on map
                <span aria-hidden>›</span>
              </a>
            )}
          </section>
        )}

        {description && (
          <section className="mt-10">
            <h2 className="text-[11.5px] font-bold uppercase tracking-[0.09em] text-destiny-grey/45">
              About
            </h2>
            {/* Routed through RichContent for one code path, though this
                content comes from the sanitised ChurchSuite feed and so will
                never contain blocks — it always takes the safety-valve path. */}
            <RichContent
              html={description}
              className="rte-content mt-3 text-[0.97rem] text-destiny-grey/80"
            />
          </section>
        )}

        {series.sessionCount > 1 && (
          <section className="mt-10">
            <h2 className="text-[11.5px] font-bold uppercase tracking-[0.09em] text-destiny-grey/45">
              Upcoming sessions
            </h2>
            <ul className="mt-3 divide-y divide-black/[0.07] overflow-hidden rounded-2xl border border-black/[0.07]">
              {series.occurrences.map((occurrence) => (
                <li
                  key={occurrence.identifier ?? occurrence.id}
                  className="flex flex-wrap items-center justify-between gap-3 px-5 py-3.5"
                >
                  <div>
                    <p className="text-[15px] font-semibold text-destiny-grey">
                      {parseFeedDate(occurrence.datetime_start).toLocaleDateString("en-GB", {
                        weekday: "long",
                        day: "numeric",
                        month: "long",
                      })}
                    </p>
                    <p className="text-sm text-destiny-grey/55">
                      {formatTimeRange(occurrence)}
                    </p>
                  </div>
                  <a
                    href={`/api/events/${series.slug}/ics?occurrence=${occurrence.identifier ?? ""}`}
                    className="text-sm font-semibold text-destiny-orange"
                  >
                    Add to calendar
                  </a>
                </li>
              ))}
            </ul>
          </section>
        )}

        <section className="mt-10 flex flex-wrap items-center gap-3">
          {/* Opens in a modal rather than sending people to ChurchSuite; the
              whole multi-step signup runs inside it. */}
          <EventSignupButton
            url={
              signup ??
              `https://destinytees.churchsuite.com/events/${event.identifier ?? ""}`
            }
            label={signup ? "Sign up" : "View details"}
            eventName={series.name}
            subtitle={formatDateRange(event)}
            jumpToSignup={Boolean(signup)}
          />
          <a
            href={`/api/events/${series.slug}/ics`}
            className="inline-flex items-center justify-center rounded-full border border-black/10 px-7 py-3 text-sm font-bold text-destiny-grey transition hover:bg-[#f5f7fa]"
          >
            Add to calendar
          </a>
          <Link
            href="/whats-on#events"
            className="text-sm font-semibold text-destiny-grey/60 underline underline-offset-4 transition hover:text-destiny-grey"
          >
            See all events
          </Link>
        </section>
      </div>
    </article>
  );
}
