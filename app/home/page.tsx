// TEMPORARY — event-card variant preview of the homepage.
//
// Renders the real homepage with a different event-card treatment so the three
// candidates can be compared on a real page with real artwork:
//   /home            variant c (full-bleed poster)
//   /home?card=a     variant a (restrained — what ships today)
//   /home?card=a-pill
//
// DELETE THIS FOLDER once a variant is chosen, along with:
//   - app/whats-on/new/
//   - "home" in ROUTE_SLUGS (lib/reserved-slugs.ts)
//   - "new" in RESERVED_EVENT_SLUGS (lib/events.ts)
//   - the /home and /whats-on/new robots disallows (app/robots.ts)
//   - the /whats-on/new case in EventPopup's path exclusion
//   - the two unused variant bodies in components/events/EventCard.tsx
//
// Note this folder shadows the /[slug] Posts catch-all, which is why "home" is
// reserved in lib/reserved-slugs.ts for as long as it exists.

import type { Metadata } from "next";
import HomePageBody from "@/components/home/HomePageBody";
import { parseCardVariant } from "@/lib/events";

export const metadata: Metadata = {
  title: "Card variant preview — Home",
  robots: { index: false, follow: false },
};

export const revalidate = 30;

export default async function HomeVariantPreview({
  searchParams,
}: {
  searchParams: Promise<{ card?: string | string[] }>;
}) {
  const { card } = await searchParams;
  return <HomePageBody cardVariant={parseCardVariant(card, "c")} />;
}
