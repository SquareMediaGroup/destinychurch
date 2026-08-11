import { appJson, simulatedState } from "@/lib/appApi";
import { CHURCH_TIME_ZONE } from "@/lib/appSerializers";

// App BFF — remote configuration.
//
// The highest-leverage endpoint in the set: the app's More tab, giving link,
// service times and venue are all rendered from this payload rather than
// hardcoded. A changed ChurchSuite form slug becomes a JSON edit instead of an
// App Store release, and `minSupportedBuild` is a kill switch for a bad build.
//
// Keep this in sync with the embeds on the website — the URLs below are the
// same ones `components/ChurchSuiteEmbed.tsx` is pointed at across the site.

export const revalidate = 300;

const CHURCHSUITE = "https://destinytees.churchsuite.com";

/**
 * The forms surfaced in the app's More tab, in display order.
 *
 * `systemImage` is an SF Symbol name — the app renders it directly, so adding
 * a row here needs no client change. Note the two URL shapes: some forms are
 * served from `/forms/…` and some from `/-/forms/…`. Both are live; the
 * difference is ChurchSuite's, not ours.
 */
const FORMS = [
  {
    id: "new-here",
    title: "I'm New",
    subtitle: "Tell us a bit about yourself",
    url: `${CHURCHSUITE}/embed/addressbook/form`,
    systemImage: "hand.wave",
  },
  {
    id: "connect",
    title: "Connect",
    subtitle: "Join a Connect Group",
    url: `${CHURCHSUITE}/forms/twuneiil`,
    systemImage: "person.2",
  },
  {
    id: "connect-card",
    title: "Connect Card",
    subtitle: "Let us know how we can help",
    url: `${CHURCHSUITE}/forms/kw3c1oly`,
    systemImage: "square.and.pencil",
  },
  {
    id: "prayer",
    title: "Prayer Request",
    subtitle: "We'd love to pray with you",
    url: `${CHURCHSUITE}/forms/1yctuibm`,
    systemImage: "hands.sparkles",
  },
  {
    id: "baptism",
    title: "Baptism",
    subtitle: "Take your next step",
    url: `${CHURCHSUITE}/forms/sdxbpkle`,
    systemImage: "drop",
  },
  {
    id: "child-dedication",
    title: "Child Dedication",
    subtitle: "Dedicate your child",
    url: `${CHURCHSUITE}/forms/tb7deesr`,
    systemImage: "figure.and.child.holdinghands",
  },
  {
    id: "serve",
    title: "Serve",
    subtitle: "Join a team",
    url: `${CHURCHSUITE}/-/forms/cdgkeqkm`,
    systemImage: "hands.and.sparkles",
  },
  {
    id: "contact",
    title: "Contact Us",
    subtitle: "Get in touch",
    url: `${CHURCHSUITE}/-/forms/fhq8ahuc`,
    systemImage: "envelope",
  },
] as const;

/**
 * Mirrors the service facts on `app/live/page.tsx`. Times are church-local
 * wall clock; the app pairs them with `timeZone` rather than assuming the
 * phone is in the UK.
 */
const SERVICE_TIMES = [
  { label: "Prayer", day: "Sunday", start: "10:00", end: "10:30" },
  { label: "Main Gathering", day: "Sunday", start: "11:00", end: "12:30" },
] as const;

export async function GET(request: Request) {
  const simulate = simulatedState(request);

  if (simulate === "error" || simulate === "degraded") {
    return appJson(
      { forms: [], serviceTimes: [] },
      {
        status: "degraded",
        notice: "Configuration is temporarily unavailable.",
        cacheControl: "public, s-maxage=300, stale-while-revalidate=3600",
      },
    );
  }

  return appJson(
    {
      /** Builds below this are refused entry; bump only to retire a bad build. */
      minSupportedBuild: 1,
      forceUpdateMessage: null as string | null,
      givingUrl: `${CHURCHSUITE}/donate`,
      forms: simulate === "empty" ? [] : FORMS,
      serviceTimes: SERVICE_TIMES,
      timeZone: CHURCH_TIME_ZONE,
      venue: {
        name: "Destiny Centre",
        address: "395 Norton Rd, Stockton-on-Tees, TS20 2QQ",
        latitude: 54.5798,
        longitude: -1.3162,
      },
      links: {
        website: "https://destinytees.uk",
        youtube: "https://www.youtube.com/destinychurchteesvalley",
        churchSuite: CHURCHSUITE,
        privacy: "https://destinytees.uk/privacy",
        safeguarding: "https://destinytees.uk/safeguarding",
      },
    },
    { cacheControl: "public, s-maxage=300, stale-while-revalidate=3600" },
  );
}
