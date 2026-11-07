import Link from "next/link";
import AnimateIn from "@/components/AnimateIn";
import EventsCarousel from "@/components/home/EventsCarousel";
import EventCard from "@/components/events/EventCard";
import WeeklyGatheringCard from "@/components/events/WeeklyGatheringCard";
import { WEEKLY_GATHERINGS } from "@/lib/weeklyGatherings";
import { getEventIndex, getFeaturedEvent } from "@/lib/events.server";

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

export default async function WhatsOnSection() {
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
              className="text-xs font-semibold text-muted underline underline-offset-4 transition hover:text-destiny-grey sm:text-sm"
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
                    featured={event.slug === featuredSlug}
                    priority={i === 0}
                    className={CARD_WIDTH}
                    sizes="(max-width: 640px) 280px, 320px"
                  />
                ))
              : // The degraded state: the feed is down (or genuinely empty),
                // so show the church's standing weekly gatherings instead of
                // an empty rail.
                WEEKLY_GATHERINGS.map((gathering) => (
                  <WeeklyGatheringCard
                    key={gathering.name}
                    gathering={gathering}
                    className={CARD_WIDTH}
                  />
                ))}
          </EventsCarousel>
        </AnimateIn>

        {/* View all button */}
        <AnimateIn delay={200}>
          {/* mt-1, not mt-6: the carousel track's own bottom padding (shadow
              clearance) already supplies most of the gap. */}
          <div className="mt-1 text-center">
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
