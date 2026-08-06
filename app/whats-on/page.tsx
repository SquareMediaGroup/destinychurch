import type { Metadata } from "next";
import WhatsOnPageBody from "@/components/whats-on/WhatsOnPageBody";

export const metadata: Metadata = {
  title: "What's On",
  description: "See what's happening at Destiny Church Tees Valley — upcoming events, courses, Alpha, and highlights. There's always something on.",
  alternates: { canonical: "/whats-on" },
  openGraph: {
    title: "What's On | Destiny Church Tees Valley",
    description: "Upcoming events, courses and Alpha at Destiny Church Stockton-on-Tees.",
    url: "https://destinytees.uk/whats-on",
    images: [{ url: "/og/whats-on.webp", width: 1200, height: 630, alt: "What's On | Destiny Church Tees Valley" }],
  },
  twitter: {
    card: "summary_large_image",
    images: ["/og/whats-on.webp"],
  },
};

export const revalidate = 300;

export default async function WhatsOnPage() {
  return <WhatsOnPageBody cardVariant="a" />;
}
