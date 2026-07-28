// TEMPORARY — event-card variant preview of /whats-on.
//
//   /whats-on/new             variant c (full-bleed poster)
//   /whats-on/new?card=a      variant a (restrained — what ships today)
//   /whats-on/new?card=a-pill
//
// This static segment SHADOWS app/whats-on/[slug], so a real ChurchSuite event
// whose name slugs to "new" would be unreachable. RESERVED_EVENT_SLUGS in
// lib/events.ts forces such an event to "new-{identifier}" instead.
//
// DELETE THIS FOLDER once a variant is chosen — see app/home/page.tsx for the
// full checklist.

import type { Metadata } from "next";
import WhatsOnPageBody from "@/components/whats-on/WhatsOnPageBody";
import { parseCardVariant } from "@/lib/events";

export const metadata: Metadata = {
  title: "Card variant preview — What's On",
  robots: { index: false, follow: false },
};

export const revalidate = 300;

export default async function WhatsOnVariantPreview({
  searchParams,
}: {
  searchParams: Promise<{ card?: string | string[] }>;
}) {
  const { card } = await searchParams;
  return <WhatsOnPageBody cardVariant={parseCardVariant(card, "c")} />;
}
