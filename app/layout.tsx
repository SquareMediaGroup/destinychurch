import type { Metadata } from "next";
import { Suspense } from "react";
import { Roboto, Anton, Playfair_Display } from "next/font/google";
import "./globals.css";
import ChurchHeader from "@/components/ChurchHeader";
import FooterGate from "@/components/FooterGate";
import Providers from "@/components/Providers";
import CookieBanner from "@/components/CookieBanner";
import AnalyticsGate from "@/components/AnalyticsGate";
import SiteBanner from "@/components/SiteBanner";
import SitePopup from "@/components/SitePopup";
import BannerSpacer from "@/components/BannerSpacer";
import VisualEditOverlay from "@/components/admin/VisualEditOverlay";
import { createServiceClient } from "@/utils/supabase/service";
import { unstable_noStore as noStore } from "next/cache";
import { SpeedInsights } from "@vercel/speed-insights/next";

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

    const EVENT_TYPES = new Set(["alpha", "youth_alpha", "recovery"]);

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

    const alpha = banners.find((b) => b.type === "alpha");
    const youthAlpha = banners.find((b) => b.type === "youth_alpha");
    const recovery = banners.find((b) => b.type === "recovery");
    const other = banners.find((b) => !EVENT_TYPES.has(b.type));

    const resolvedAlpha = alpha ? await resolveEvent(alpha) : null;
    const resolvedYouth = youthAlpha ? await resolveEvent(youthAlpha) : null;
    const resolvedRecovery = recovery ? await resolveEvent(recovery) : null;

    const activeResolved = [resolvedAlpha, resolvedYouth, resolvedRecovery].filter(
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
        streetAddress: "Dovecot Street",
        addressLocality: "Stockton-on-Tees",
        addressRegion: "Teesside",
        postalCode: "TS18 1LL",
        addressCountry: "GB",
      },
      geo: {
        "@type": "GeoCoordinates",
        latitude: 54.5704,
        longitude: -1.3185,
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
        "https://www.youtube.com/@DestinyChurchTeesValley",
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
        name: "Destiny Church Tees Valley",
        address: {
          "@type": "PostalAddress",
          streetAddress: "Dovecot Street",
          addressLocality: "Stockton-on-Tees",
          postalCode: "TS18 1LL",
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
  const popup = await getActivePopup();

  return (
    <html lang="en">
      <head>
        <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Material+Symbols+Rounded:opsz,wght,FILL,GRAD@24,500,0,0" />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(orgSchema) }}
        />
      </head>
      <body
        className={`${roboto.variable} ${anton.variable} ${playfair.variable} antialiased`}
      >
        <Providers banner={banner}>
<SiteBanner />
          <CookieBanner />
          <div className="flex min-h-screen flex-col bg-[var(--background)] text-[var(--foreground)]">
            <BannerSpacer />
            <Suspense>
              <ChurchHeader />
            </Suspense>
            <main className="flex-1">{children}</main>
            <FooterGate />
          </div>
          <AnalyticsGate />
          <SitePopup popup={popup} />
        </Providers>
        <SpeedInsights />
        <Suspense>
          <VisualEditOverlay />
        </Suspense>
      </body>
    </html>
  );
}
