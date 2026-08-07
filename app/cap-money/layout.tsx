import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "CAP Money Course",
  description:
    "The CAP Money Course at Destiny Church Tees Valley — a free, three-session course that teaches a simple budgeting system that really works. Budget, save and spend with confidence.",
  alternates: { canonical: "/cap-money" },
  openGraph: {
    title: "CAP Money Course | Destiny Church Tees Valley",
    description:
      "A free, three-session money management course teaching a simple budgeting system that really works. Everyone welcome.",
    url: "https://destinytees.uk/cap-money",
    images: [{ url: "/og/cap-money.webp", width: 1200, height: 630, alt: "CAP Money Course | Destiny Church Tees Valley" }],
  },
  twitter: {
    card: "summary_large_image",
    images: ["/og/cap-money.webp"],
  },
};

export default function CapMoneyLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
