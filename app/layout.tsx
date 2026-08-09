import type { Metadata } from "next";
import { Suspense } from "react";
import { Roboto, Anton, Playfair_Display } from "next/font/google";
import "./globals.css";
import ChurchHeader from "@/components/ChurchHeader";
import FooterGate from "@/components/FooterGate";
import ChurchFooter from "@/components/ChurchFooter";
import Providers from "@/components/Providers";
import CookieBanner from "@/components/CookieBanner";
import AnalyticsGate from "@/components/AnalyticsGate";
import SiteBanner from "@/components/SiteBanner";
import LiveBanner from "@/components/LiveBanner";
import SitePopup from "@/components/SitePopup";
import EventPopup from "@/components/events/EventPopup";
import WelcomeOverlay from "@/components/WelcomeOverlay";
import { getActiveEventPopup } from "@/lib/events.server";
import FloatingSmartSearch from "@/components/FloatingSmartSearch";
import GlassBloomTracker from "@/components/GlassBloomTracker";
import PerformanceGate from "@/components/PerformanceGate";
import { isSmartSearchEnabled } from "@/lib/serviceStatus";
import { COURSE_EVENT_TYPES, isCourseEventType } from "@/lib/courseEvents";
import { CHANNEL_URL, getLiveStatus } from "@/lib/youtube";
import BannerSpacer from "@/components/BannerSpacer";
import { createServiceClient } from "@/utils/supabase/service";
import { unstable_noStore as noStore } from "next/cache";
import { SpeedInsights } from "@vercel/speed-insights/next";
import { GTProvider } from "gt-next";
import { getLocale, getLocaleDirection } from "gt-next/server";

const roboto = Roboto({
  variable: "--font-roboto",
  display: "swap",
  subsets: ["latin"],
  weight: ["400", "500", "700"],
});

const anton = Anton({
  variable: "--font-anton",
  display: "swap",
  subsets: ["latin"],
  weight: "400",
});

const playfair = Playfair_Display({
  variable: "--font-playfair",
  display: "swap",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  style: ["normal", "italic"],
});

export const metadata: Metadata = {
  metadataBase: new URL("https://destinytees.uk"),
  title: {
    default: "Destiny Church Tees Valley",
    template: "%s | Destiny Church",
  },
  description:
    "Destiny Church Tees Valley — a multi-cultural church where all can find a place to belong and thrive. Join us Sundays at 11am.",
  alternates: {
    canonical: "/",
  },
  openGraph: {
    title: "Destiny Church Tees Valley",
    description:
      "A multi-cultural church where all can find a place to belong and thrive.",
    url: "https://destinytees.uk",
    siteName: "Destiny Church",
    type: "website",
    images: [
      {
        url: "/og/sermons-hero.webp",
        alt: "Destiny Church Tees Valley",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Destiny Church Tees Valley",
    description:
      "A multi-cultural church where all can find a place to belong and thrive.",
    images: ["/og/sermons-hero.webp"],
  },
};

async function getActiveBanner() {
  noStore();
  try {
    const supabase = createServiceClient();
    const { data: rows } = await supabase
      .from("site_banner")
      .select("active, message, type, link, link_text")
      .eq("active", true);

    const banners = rows ?? [];
    if (banners.length === 0) return null;

    // Sitewide takes over everything.
    const sitewide = banners.find((b) => b.type === "sitewide");
    if (sitewide) return sitewide;

    async function resolveEvent(b: (typeof banners)[number]) {
      const { data: alpha } = await supabase
        .from("alpha_events")
        .select(
          "start_date, signup_url, frequency, custom_interval_days, format, location, meeting_platform"
        )
        .eq("type", b.type)
        .eq("active", true)
        .order("start_date", { ascending: true })
        .limit(1)
        .maybeSingle();
      if (!alpha) return { ...b, active: false };
      return { ...b, alpha };
    }

    // Course banners resolve in COURSE_EVENT_TYPES order, which is also the
    // priority order when more than one is switched on.
    const resolved = await Promise.all(
      COURSE_EVENT_TYPES.map(async (type) => {
        const row = banners.find((b) => b.type === type);
        return row ? await resolveEvent(row) : null;
      })
    );
    const other = banners.find((b) => !isCourseEventType(b.type));

    const activeResolved = resolved.filter(
      (b): b is NonNullable<typeof b> => !!b?.active
    );

    // Prefer event banners first, then any other banner.
    const primary = activeResolved[0] ?? other ?? null;

    if (!primary) return null;

    // Chain the next active event banner as a companion (only one slot).
    const companion = activeResolved.find((b) => b !== primary) ?? null;

    return companion ? { ...primary, companion } : primary;
  } catch {
    return null;
  }
}

async function getActivePopup() {
  noStore();
  try {
    const supabase = createServiceClient();
    const { data } = await supabase
      .from("site_popup")
      .select(
        "active, title, body, cta_text, cta_link, image_url, show_once, updated_at"
      )
      .eq("active", true)
      .order("created_at", { ascending: true })
      .limit(1)
      .maybeSingle();
    return data ?? null;
  } catch {
    return null;
  }
}

const orgSchema = {
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": ["Church", "LocalBusiness"],
      "@id": "https://destinytees.uk/#church",
      name: "Destiny Church Tees Valley",
      url: "https://destinytees.uk",
      logo: "https://destinytees.uk/img/logo.webp",
      image: "https://destinytees.uk/og/sermons-hero.webp",
      description:
        "A multi-cultural church where all can find a place to belong and thrive. Bible-based teaching, vibrant worship, and genuine community.",
      address: {
        "@type": "PostalAddress",
        streetAddress: "395 Norton Road",
        addressLocality: "Stockton-on-Tees",
        addressRegion: "Teesside",
        postalCode: "TS20 2QQ",
        addressCountry: "GB",
      },
      geo: {
        "@type": "GeoCoordinates",
        latitude: 54.5778,
        longitude: -1.3197,
      },
      telephone: "+44-1642-559797",
      email: "hello@destinytees.uk",
      openingHoursSpecification: [
        {
          "@type": "OpeningHoursSpecification",
          dayOfWeek: "Sunday",
          opens: "10:30",
          closes: "13:00",
        },
      ],
      sameAs: [
        CHANNEL_URL,
        "https://www.facebook.com/destinychurchteesvalley",
        "https://www.instagram.com/destinychurchteesvalley",
      ],
    },
    {
      "@type": "Event",
      "@id": "https://destinytees.uk/#sunday-service",
      name: "Sunday Morning Service",
      description:
        "Join us every Sunday morning for worship, Bible teaching, and community at Destiny Church Tees Valley.",
      startDate: "2024-01-07T11:00:00+00:00",
      eventSchedule: {
        "@type": "Schedule",
        repeatFrequency: "P1W",
        byDay: "https://schema.org/Sunday",
        startTime: "11:00",
        endTime: "12:30",
      },
      location: {
        "@type": "Place",
        name: "Destiny Centre",
        address: {
          "@type": "PostalAddress",
          streetAddress: "395 Norton Road",
          addressLocality: "Stockton-on-Tees",
          postalCode: "TS20 2QQ",
          addressCountry: "GB",
        },
      },
      organizer: { "@id": "https://destinytees.uk/#church" },
      eventStatus: "https://schema.org/EventScheduled",
      eventAttendanceMode: "https://schema.org/OfflineEventAttendanceMode",
      isAccessibleForFree: true,
    },
  ],
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const banner = await getActiveBanner();
  const [popup, eventPopup] = await Promise.all([
    getActivePopup(),
    getActiveEventPopup(),
  ]);
  const smartSearchEnabled = await isSmartSearchEnabled();
  const liveStatus = await getLiveStatus();
  // Farsi is right-to-left, so dir has to follow the locale rather than being
  // hardcoded — getLocaleDirection returns "rtl" for fa and "ltr" for en/pl/ro.
  const locale = await getLocale();
  const dir = await getLocaleDirection(locale);

  return (
    <html lang={locale} dir={dir} suppressHydrationWarning>
      <head>
        <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Material+Symbols+Rounded:opsz,wght,FILL,GRAD@24,500,0,0" />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(orgSchema) }}
        />
        <script
          dangerouslySetInnerHTML={{
            __html: `
              try {
                let glassFX = true;
                let reducedMotion = false;
                const stored = localStorage.getItem("destiny-a11y");
                if (stored) {
                  const parsed = JSON.parse(stored);
                  if (typeof parsed.glassFX === "boolean") glassFX = parsed.glassFX;
                  if (typeof parsed.reducedMotion === "boolean") reducedMotion = parsed.reducedMotion;
                } else {
                  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
                    reducedMotion = true;
                  }
                }
                
                if (!glassFX) {
                  document.documentElement.dataset.glassfx = "off";
                }
                if (reducedMotion) {
                  document.documentElement.dataset.motion = "reduced";
                }
              } catch (e) {}
            `,
          }}
        />
      </head>
      <body
        className={`${roboto.variable} ${anton.variable} ${playfair.variable} antialiased`}
      >
        {/* Shared lens filter for site-wide glass refraction. Mounted once;
            referenced by `.glass-refract` via backdrop-filter: url() on
            Chromium. The displacement map is synthesised from filter
            primitives (no feImage — Chromium resolves feImage percentage
            subregions against this 0x0 host SVG, not the filter region):
            blurring the backdrop's alpha gives an edge-distance ramp, and
            differencing two offset copies of that ramp yields signed X/Y lens
            vectors packed into the map's R/G channels. The result: a neutral
            centre with a constant ~40px rim band that bends inward on every
            surface regardless of its size. The backdrop is then displaced
            three times at staggered strengths (42/48/54 — same 48 mean so the
            refraction depth is unchanged, but a tighter ±6 spread for subtler
            colour separation) and the R/G/B channels recombined, so colours
            physically separate at the edges (chromatic dispersion) like light
            through thick glass. */}
        <svg
          aria-hidden
          focusable="false"
          width="0"
          height="0"
          style={{ position: "absolute", width: 0, height: 0 }}
        >
          <filter
            id="glass-refract"
            x="0"
            y="0"
            width="100%"
            height="100%"
            colorInterpolationFilters="sRGB"
          >
            <feGaussianBlur in="SourceAlpha" stdDeviation={16} result="soft" />
            <feOffset in="soft" dx={8} dy={0} result="sxp" />
            <feOffset in="soft" dx={-8} dy={0} result="sxn" />
            <feComposite
              in="sxp"
              in2="sxn"
              operator="arithmetic"
              k1={0}
              k2={-2.5}
              k3={2.5}
              k4={0.5}
              result="gx"
            />
            <feOffset in="soft" dx={0} dy={8} result="syp" />
            <feOffset in="soft" dx={0} dy={-8} result="syn" />
            <feComposite
              in="syp"
              in2="syn"
              operator="arithmetic"
              k1={0}
              k2={-2.5}
              k3={2.5}
              k4={0.5}
              result="gy"
            />
            <feColorMatrix
              in="gx"
              type="matrix"
              values="0 0 0 1 0  0 0 0 0 0  0 0 0 0 0  0 0 0 0 1"
              result="mx"
            />
            <feColorMatrix
              in="gy"
              type="matrix"
              values="0 0 0 0 0  0 0 0 1 0  0 0 0 0 0  0 0 0 0 1"
              result="my"
            />
            <feComposite
              in="mx"
              in2="my"
              operator="arithmetic"
              k1={0}
              k2={1}
              k3={1}
              k4={0}
              result="map"
            />
            <feDisplacementMap
              in="SourceGraphic"
              in2="map"
              scale={42}
              xChannelSelector="R"
              yChannelSelector="G"
              result="dispR"
            />
            <feColorMatrix
              in="dispR"
              type="matrix"
              values="1 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0 0 0 1 0"
              result="onlyR"
            />
            <feDisplacementMap
              in="SourceGraphic"
              in2="map"
              scale={48}
              xChannelSelector="R"
              yChannelSelector="G"
              result="dispG"
            />
            <feColorMatrix
              in="dispG"
              type="matrix"
              values="0 0 0 0 0  0 1 0 0 0  0 0 0 0 0  0 0 0 1 0"
              result="onlyG"
            />
            <feDisplacementMap
              in="SourceGraphic"
              in2="map"
              scale={54}
              xChannelSelector="R"
              yChannelSelector="G"
              result="dispB"
            />
            <feColorMatrix
              in="dispB"
              type="matrix"
              values="0 0 0 0 0  0 0 0 0 0  0 0 1 0 0  0 0 0 1 0"
              result="onlyB"
            />
            <feBlend in="onlyR" in2="onlyG" mode="screen" result="rg" />
            <feBlend in="rg" in2="onlyB" mode="screen" />
          </filter>
        </svg>
        <GTProvider>
        <Providers banner={banner} live={liveStatus}>
          <LiveBanner />
          <SiteBanner />
          <CookieBanner />
          <Suspense><PerformanceGate /></Suspense>
          {/* The padding is 0 until the sermons audio dock mounts and publishes
              its height (see PodcastPlayerProvider) — it keeps the fixed dock
              from covering the end of the footer. */}
          <div
            className="flex min-h-screen flex-col bg-[var(--background)] text-[var(--foreground)]"
            style={{ paddingBottom: "var(--podcast-dock-height, 0px)" }}
          >
            <BannerSpacer />
            <Suspense>
              <ChurchHeader />
            </Suspense>
            <main className="flex-1">{children}</main>
            <FooterGate><ChurchFooter /></FooterGate>
          </div>
          <AnalyticsGate />
          <GlassBloomTracker />
          {/* An active event popup suppresses the generic one — passing null
              here is the whole mechanism, so only ever one modal shows and
              there's no client-side coordination to get wrong.

              The welcome overlay sits above both, but it can't be resolved here:
              it depends on the path and on sessionStorage. It raises a flag in
              lib/popupGate.ts instead, which these two check before arming. */}
          <WelcomeOverlay />
          <SitePopup popup={eventPopup ? null : popup} />
          <EventPopup popup={eventPopup} />
          {smartSearchEnabled && <FloatingSmartSearch />}
        </Providers>
        </GTProvider>
        <SpeedInsights />
      </body>
    </html>
  );
}
