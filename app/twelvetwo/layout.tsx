import type { Metadata } from "next";

// The page itself is a client component, so its metadata lives here — without
// this layout /twelvetwo had no title or description and inherited the root
// layout's defaults.
export const metadata: Metadata = {
  title: "Destiny 12:2",
  description:
    "Destiny 12:2 is a 12-step, Christ-centred recovery course at Destiny Church Tees Valley — a pathway to overcoming struggles, healing from emotional wounds and pain, and growing in faith.",
  alternates: { canonical: "/twelvetwo" },
  openGraph: {
    title: "Destiny 12:2 | Destiny Church Tees Valley",
    description:
      "A 12-step, Christ-centred pathway to overcoming struggles and healing from emotional wounds and pain.",
    url: "https://destinytees.uk/twelvetwo",
  },
};

export default function TwelveTwoLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
