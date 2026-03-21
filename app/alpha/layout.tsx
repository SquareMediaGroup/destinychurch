import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Alpha",
  description: "Explore the big questions of life, faith and meaning with Alpha at Destiny Church Tees Valley. A free, relaxed course — no pressure, no judgement. Open to everyone.",
  alternates: { canonical: "/alpha" },
  openGraph: {
    title: "Alpha | Destiny Church Tees Valley",
    description: "Got questions about life and faith? Join Alpha — a free, welcoming course where no question is off limits.",
    url: "https://destinytees.uk/alpha",
  },
};

export default function AlphaLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
