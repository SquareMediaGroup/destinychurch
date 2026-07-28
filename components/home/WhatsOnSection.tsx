import Link from "next/link";
import AnimateIn from "@/components/AnimateIn";
import EventsCarousel from "@/components/home/EventsCarousel";
import EventCard from "@/components/events/EventCard";
import { getEventIndex, getFeaturedEvent } from "@/lib/events.server";
import type { EventCardVariant } from "@/lib/events";

/**
 * Carousel cards are narrower than grid cards; the width lives here now.
 *
 * A fixed width, not a min/max range. Flex sizes a ranged card to its intrinsic
 * content, so a long title pushed that card to the ceiling while short ones sat
 * at the floor — and since the artwork is `aspect-[16/10]`, the extra width
 * became extra height and the row stopped lining up. The old card got away with
 * a range only because its image had a fixed pixel height.
 */
const CARD_WIDTH = "w-[280px] shrink-0 sm:w-[320px]";

/**
 * The degraded state. `fetchChurchSuiteEvents` returns [] on any error, so an
 * empty feed is indistinguishable from an outage — showing the church's three
 * standing weekly gatherings beats showing an empty rail.
 */
function EventCardPlaceholder({ index }: { index: number }) {
  const placeholders = [
    { name: "Sunday Service", day: "SUN", location: "Destiny Centre" },
    { name: "Connect Groups", day: "WED", location: "Various Locations" },
    { name: "Prayer Meeting", day: "TUE", location: "Destiny Centre" },
  ];
  const item = placeholders[index % placeholders.length];

  return (
    <div
      className={`${CARD_WIDTH} overflow-hidden rounded-[20px] border border-black/[0.07] bg-white shadow-[0_1px_2px_rgba(16,24,40,.04),0_8px_24px_-8px_rgba(16,24,40,.10)]`}
    >
      <div className="relative flex aspect-[16/10] w-full items-center justify-center bg-[#f5f7fa]">
        <span className="text-[52px] font-black leading-none tracking-[-0.03em] text-destiny-grey/20">
          {item.day}
        </span>
      </div>
      <div className="p-5">
        <p className="text-[11.5px] font-bold uppercase tracking-[0.09em] text-destiny-orange">
          Weekly
        </p>
        <h3
          style={{ fontFamily: "var(--font-roboto)" }}
          className="mt-1.5 text-[20px] font-semibold leading-[1.22] tracking-[-0.017em] text-destiny-grey"
        >
          {item.name}
        </h3>
        <p className="mt-1.5 text-sm text-destiny-grey/55">{item.location}</p>
      </div>
    </div>
  );
}

export default async function WhatsOnSection({
  cardVariant = "a",
}: {
  cardVariant?: EventCardVariant;
}) {
  const index = await getEventIndex();
  const featured = await getFeaturedEvent(index);

  // The featured event leads the rail, with the rest of the calendar behind it
  // in date order.
  const featuredSlug = featured?.series?.slug;
  const ordered = featuredSlug
    ? [
        ...index.series.filter((s) => s.slug === featuredSlug),
        ...index.series.filter((s) => s.slug !== featuredSlug),
      ]
    : index.series;

  const events = ordered.slice(0, 6);
  const hasEvents = events.length > 0;

  return (
    <section className="bg-white py-10 sm:py-16">
      <div className="mx-auto max-w-7xl px-4 lg:px-8">
        {/* Header */}
        <AnimateIn>
          <div className="mb-8 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
            <h2 className="text-2xl font-black text-destiny-orange sm:text-3xl md:text-4xl">
              What&apos;s On
            </h2>
            <Link
              href="/whats-on"
              className="text-xs font-semibold text-destiny-grey/70 underline underline-offset-4 transition hover:text-destiny-grey sm:text-sm"
            >
              View Church Calendar
            </Link>
          </div>
        </AnimateIn>

        {/* Event cards carousel */}
        <AnimateIn delay={100}>
          <EventsCarousel>
            {hasEvents
              ? events.map((event, i) => (
                  <EventCard
                    key={event.slug}
                    event={event}
                    variant={cardVariant}
                    featured={event.slug === featuredSlug}
                    priority={i === 0}
                    className={CARD_WIDTH}
                    sizes="(max-width: 640px) 280px, 320px"
                  />
                ))
              : Array.from({ length: 3 }).map((_, i) => (
                  <EventCardPlaceholder key={i} index={i} />
                ))}
          </EventsCarousel>
        </AnimateIn>

        {/* View all button */}
        <AnimateIn delay={200}>
          <div className="mt-6 text-center">
            <Link
              href="/whats-on"
              className="inline-flex items-center justify-center rounded-full border-2 border-destiny-orange px-8 py-3 text-sm font-bold text-destiny-orange transition hover:bg-destiny-orange hover:text-white"
            >
              View All
            </Link>
          </div>
        </AnimateIn>
      </div>
    </section>
  );
}
