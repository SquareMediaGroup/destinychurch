// Desktop-only promo rails for post pages (the /[slug] catch-all).
//
// A post renders as a 768px column, which leaves a wide empty margin either side
// on a large desktop. Each margin holds one tall 300x600 promo card that sticks
// while the article scrolls and rotates to the next item every 15 seconds:
// upcoming ChurchSuite events on the left, the four courses on the right.
//
// Every card takes a light tint and CTA colour sampled from its own artwork (see
// lib/promo-palette.server.ts). This file does the data work on the server and
// hands plain props to the client rotator in components/posts/PromoRail.tsx.
//
// Hidden below 1600px — the narrowest viewport where two 300px rails plus 64px
// gutters fit without narrowing the article. See the grid in app/[slug]/page.tsx.

import {
  eventDescriptionText,
  eventImage,
  eventSignupUrl,
  parseFeedDate,
  stripEmoji,
  type EventSeries,
} from "@destiny/shared";
import { COURSES, COURSE_ORDER, COURSE_PALETTES } from "@/lib/courses";
import { getFeaturedCourseId } from "@/lib/courses.server";
import { getEventIndex } from "@/lib/events.server";
import { paletteForImage } from "@/lib/promo-palette.server";
import PromoRail, { type PromoCard } from "./PromoRail";

/** How many events the left rail cycles through. */
const MAX_EVENTS = 5;

/** Roughly six lines in the card — long feed descriptions run to 1200+ chars. */
const DESCRIPTION_LIMIT = 240;

/** "Thursday, 30-Jul-2026" — formatted server-side so hydration can't disagree. */
function formatDate(value: string): string {
  const date = parseFeedDate(value);
  const weekday = date.toLocaleDateString("en-GB", { weekday: "long" });
  const day = String(date.getDate()).padStart(2, "0");
  const month = date.toLocaleDateString("en-GB", { month: "short" });
  return `${weekday}, ${day}-${month}-${date.getFullYear()}`;
}

/**
 * Which series the left rail cycles through. `getEventIndex` has already
 * dropped past events and collapsed recurring sessions, so this only picks.
 */
function selectRailEvents(series: EventSeries[]): EventSeries[] {
  // The card is mostly artwork and description, so events carrying both promote
  // far better. Prefer them for the slots, then show in date order.
  const score = (s: EventSeries) =>
    (eventImage(s.primary) ? 2 : 0) + (eventDescriptionText(s.primary) ? 1 : 0);

  return series
    .slice(0, MAX_EVENTS * 2)
    .sort((a, b) => score(b) - score(a))
    .slice(0, MAX_EVENTS)
    .sort(
      (a, b) =>
        parseFeedDate(a.primary.datetime_start).getTime() -
        parseFeedDate(b.primary.datetime_start).getTime(),
    );
}

/** Left rail — upcoming ChurchSuite events. */
export async function EventsRail() {
  const { series } = await getEventIndex();
  const chosen = selectRailEvents(series);

  // The feed returns [] on any error, so this is also the degraded state.
  if (chosen.length === 0) return null;

  const cards: PromoCard[] = await Promise.all(
    chosen.map(async (item) => {
      const event = item.primary;
      const image = eventImage(event);
      const signupUrl = eventSignupUrl(event);
      const start = formatDate(event.datetime_start);
      const end = formatDate(event.datetime_end);

      return {
        id: item.seriesKey,
        // Points at the on-site event page now rather than off to ChurchSuite;
        // the signup link is one click further in, on the page itself.
        href: `/whats-on/${item.slug}`,
        external: false,
        image,
        // Event names are ChurchSuite-authored too, so they can carry emoji.
        title: stripEmoji(event.name),
        description: eventDescriptionText(event, DESCRIPTION_LIMIT) || undefined,
        dateStart: start,
        // Only show the second line when the event actually spans days.
        dateEnd: end !== start ? end : undefined,
        cta: signupUrl ? "Sign up" : "Find out more",
        accent: await paletteForImage(image),
      };
    }),
  );

  return <PromoRail side="left" label="What's on" cards={cards} />;
}

/** Right rail — the four courses, admin-featured one first. */
export async function CoursesRail() {
  const featuredId = await getFeaturedCourseId();
  const ids = [featuredId, ...COURSE_ORDER.filter((id) => id !== featuredId)];

  const cards: PromoCard[] = ids.map((id) => {
    const { card } = COURSES[id];
    return {
      id,
      href: card.cta.href,
      external: false,
      image: card.image,
      title: card.title,
      description:
        card.description.length > DESCRIPTION_LIMIT
          ? `${card.description.slice(0, DESCRIPTION_LIMIT).trimEnd()}…`
          : card.description,
      cta: card.cta.label,
      // Precomputed — course artwork is WebP and static. See COURSE_PALETTES.
      accent: COURSE_PALETTES[id],
    };
  });

  return <PromoRail side="right" label="Courses" cards={cards} />;
}
