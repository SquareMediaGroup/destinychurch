import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "The Bible Course",
  description:
    "Explore the whole story of the Bible with The Bible Course by Bible Society at Destiny Church Tees Valley — an award-winning eight-session course. No experience needed, everyone welcome.",
  alternates: { canonical: "/bible-course" },
  openGraph: {
    title: "The Bible Course | Destiny Church Tees Valley",
    description:
      "An award-winning eight-session journey through the Bible with Bible Society. See how the whole story fits together — everyone welcome.",
    url: "https://destinytees.uk/bible-course",
  },
};

export default function BibleCourseLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
