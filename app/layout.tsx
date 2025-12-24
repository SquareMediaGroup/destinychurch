import type { Metadata } from "next";
import { Dosis, Roboto } from "next/font/google";
import "./globals.css";
import SiteFooter from "@/components/SiteFooter";
import SiteHeader from "@/components/SiteHeader";
import Providers from "@/components/Providers";
import CookieBanner from "@/components/CookieBanner";
import AnalyticsGate from "@/components/AnalyticsGate";
import GlobalAudioProvider from "@/components/GlobalAudioProvider";
import { SpeedInsights } from "@vercel/speed-insights/next";
import TurnstileGate from "@/components/TurnstileGate";

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

export const metadata: Metadata = {
  metadataBase: new URL("https://sermons.destinytees.uk"),
  title: {
    default: "Destiny Sermons",
    template: "%s | Destiny Sermons",
  },
  description:
    "Watch the latest Destiny Sermons with summaries, transcripts, and podcasts.",
  alternates: {
    canonical: "/",
  },
  openGraph: {
    title: "Destiny Sermons",
    description:
      "Watch the latest Destiny Sermons with summaries, transcripts, and podcasts.",
    url: "https://sermons.destinytees.uk",
    siteName: "Destiny Sermons",
    type: "website",
    images: [
      {
        url: "/og/sermons-hero.jpg",
        alt: "Destiny Sermons",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Destiny Sermons",
    description:
      "Watch the latest Destiny Sermons with summaries, transcripts, and podcasts.",
    images: ["/og/sermons-hero.jpg"],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const turnstileSiteKey = process.env.SITE_KEY ?? "";

  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          rel="stylesheet"
          href="https://fonts.googleapis.com/css2?family=Material+Symbols+Rounded:opsz,wght,FILL,GRAD@24,500,0,0"
        />
      </head>
      <body
        className={`${roboto.variable} ${dosis.variable} antialiased transition-colors`}
      >
        <Providers>
          <GlobalAudioProvider>
            <CookieBanner />
            <div className="flex min-h-screen flex-col bg-[var(--background)] text-[var(--foreground)]">
              <SiteHeader />
              <main className="flex-1">
                <div className="mx-auto w-full max-w-7xl px-4 pb-16 pt-8 lg:px-8">
                  {children}
                </div>
              </main>
              <SiteFooter />
            </div>
            <AnalyticsGate />
            {turnstileSiteKey ? (
              <TurnstileGate siteKey={turnstileSiteKey} />
            ) : null}
          </GlobalAudioProvider>
        </Providers>
        <SpeedInsights />
      </body>
    </html>
  );
}
