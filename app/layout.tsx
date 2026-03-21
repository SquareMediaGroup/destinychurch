import type { Metadata } from "next";
import { Suspense } from "react";
import { Dosis, Roboto, Anton } from "next/font/google";
import "./globals.css";
import ChurchHeader from "@/components/ChurchHeader";
import FooterGate from "@/components/FooterGate";
import Providers from "@/components/Providers";
import CookieBanner from "@/components/CookieBanner";
import AnalyticsGate from "@/components/AnalyticsGate";
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

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <head>
        <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Material+Symbols+Rounded:opsz,wght,FILL,GRAD@24,500,0,0" />
      </head>
      <body
        className={`${roboto.variable} ${dosis.variable} ${anton.variable} antialiased`}
      >
        <Providers>
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
