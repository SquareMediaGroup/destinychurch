import type { Metadata } from "next";
import { Suspense } from "react";
import { Dosis, Roboto, Anton } from "next/font/google";
import "./globals.css";
import ChurchHeader from "@/components/ChurchHeader";
import FooterGate from "@/components/FooterGate";
import Providers from "@/components/Providers";
import CookieBanner from "@/components/CookieBanner";
import AnalyticsGate from "@/components/AnalyticsGate";
import SiteBanner from "@/components/SiteBanner";
import BetaDisclaimer from "@/components/BetaDisclaimer";
import { createServiceClient } from "@/utils/supabase/service";
import { unstable_noStore as noStore } from "next/cache";
import { SpeedInsights } from "@vercel/speed-insights/next";

const roboto = Roboto({
  variable: "--font-roboto",
  display: "swap",
  subsets: ["latin"],
  weight: ["400", "500", "700"],
});

const dosis = Dosis({
  variable: "--font-dosis",
  display: "swap",
  subsets: ["latin"],
  weight: ["500", "600", "700"],
});

const anton = Anton({
  variable: "--font-anton",
  display: "swap",
  subsets: ["latin"],
  weight: "400",
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
        url: "/og/sermons-hero.jpg",
        alt: "Destiny Church Tees Valley",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Destiny Church Tees Valley",
    description:
      "A multi-cultural church where all can find a place to belong and thrive.",
    images: ["/og/sermons-hero.jpg"],
  },
};

async function getActiveBanner() {
  noStore();
  try {
    const supabase = createServiceClient();
    const { data } = await supabase
      .from("site_banner")
      .select("active, message, link, link_text")
      .eq("active", true)
      .limit(1)
      .maybeSingle();
    return data;
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
      logo: "https://destinytees.uk/img/logo.png",
      image: "https://destinytees.uk/og/sermons-hero.jpg",
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
      telephone: "",
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
        className={`${roboto.variable} ${dosis.variable} ${anton.variable} antialiased`}
      >
        <Providers banner={banner}>
          {/* <BetaDisclaimer /> */}
<SiteBanner />
          <CookieBanner />
          <div className="flex min-h-screen flex-col bg-[var(--background)] text-[var(--foreground)]">
            <Suspense>
              <ChurchHeader />
            </Suspense>
            <main className="flex-1">{children}</main>
            <FooterGate />
          </div>
          <AnalyticsGate />
        </Providers>
        <SpeedInsights />
      </body>
    </html>
  );
}
