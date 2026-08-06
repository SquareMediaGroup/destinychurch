import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Alpha",
  description: "Explore the big questions of life, faith and meaning with Alpha at Destiny Church Tees Valley. A free, relaxed course — no pressure, no judgement. Open to everyone.",
  alternates: { canonical: "/alpha" },
  openGraph: {
    title: "Alpha | Destiny Church Tees Valley",
    description: "Got questions about life and faith? Join Alpha — a free, welcoming course where no question is off limits.",
    url: "https://destinytees.uk/alpha",
    images: [{ url: "/og/alpha.webp", width: 1200, height: 630, alt: "Alpha | Destiny Church Tees Valley" }],
  },
  twitter: {
    card: "summary_large_image",
    images: ["/og/alpha.webp"],
  },
};

export default function AlphaLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
