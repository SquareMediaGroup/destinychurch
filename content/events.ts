export type Event = {
  slug: string;
  title: string;
  date: string;
  time: string;
  location: string;
  category: string;
  excerpt: string;
  description: string;
  image: string;
  featured?: boolean;
  ctaLabel?: string;
  ctaHref?: string;
};

export const events: Event[] = [
  {
    slug: "sunday-gathering",
    title: "Sunday Gathering",
    date: "2025-02-23",
    time: "11:00 AM",
    location: "Destiny Centre, 395 Norton Road, TS20 2QQ",
    category: "Gathering",
    excerpt: "Worship, teaching, and community for every age. Kids & youth programmes run alongside the main service.",
    description:
      "Join the Destiny family this Sunday for worship, teaching, and community. Kids Church and Youth run alongside the main gathering, with friendly hosts to help you find a seat. Doors open from 9:45am with coffee ready.",
    image:
      "https://images.unsplash.com/photo-1513546493312-0066d7de3fd2?auto=format&fit=crop&w=1600&q=80",
    featured: true,
    ctaLabel: "Plan your visit",
    ctaHref: "/new-here",
  },
  {
    slug: "alpha-supper",
    title: "Alpha Supper",
    date: "2025-03-05",
    time: "7:00 PM",
    location: "Destiny Centre Lounge, 395 Norton Road, TS20 2QQ",
    category: "Alpha",
    excerpt: "Share a meal, watch a short film, and chat about faith in a relaxed, no-pressure space.",
    description:
      "Alpha is for anyone with questions about life and faith. Each week starts with dinner, followed by a short film and open conversation. No pressure, no cost, bring your questions and friends.",
    image:
      "https://images.unsplash.com/photo-1521017432531-fbd92d768814?auto=format&fit=crop&w=1600&q=80",
    featured: true,
    ctaLabel: "Save my seat",
    ctaHref: "/connect",
  },
  {
    slug: "youth-friday",
    title: "Friday Youth",
    date: "2025-03-07",
    time: "6:30 PM",
    location: "Destiny Centre, 395 Norton Road, TS20 2QQ",
    category: "Youth",
    excerpt: "Games, worship, and small groups for Years 7–13. Bring a friend—first visit is on us.",
    description:
      "A vibrant Friday night for secondary school years 7–13. Expect games, worship, small groups, and space to grow in faith with friends and trusted leaders. Snack bar open from 6:15pm.",
    image:
      "https://images.unsplash.com/photo-1511632765486-a01980e01a18?auto=format&fit=crop&w=1600&q=80",
    ctaLabel: "Invite a friend",
    ctaHref: "/connect",
  },
  {
    slug: "serve-team-night",
    title: "Serve Team Night",
    date: "2025-03-12",
    time: "7:00 PM",
    location: "Destiny Centre, 395 Norton Road, TS20 2QQ",
    category: "Teams",
    excerpt: "An evening to refresh vision, pray together, and equip every team for the season ahead.",
    description:
      "If you serve on any team at Destiny, this night is for you. We’ll gather for worship, vision updates, and practical training across host, kids, worship, media, and outreach teams.",
    image:
      "https://images.unsplash.com/photo-1521737604893-d14cc237f11d?auto=format&fit=crop&w=1600&q=80",
    ctaLabel: "RSVP",
    ctaHref: "/connect",
  },
  {
    slug: "prayer-and-worship",
    title: "Prayer & Worship Night",
    date: "2025-03-19",
    time: "7:00 PM",
    location: "Destiny Centre, 395 Norton Road, TS20 2QQ",
    category: "Prayer",
    excerpt: "Unhurried worship, prayer ministry, and space to hear God together as a church family.",
    description:
      "A monthly night to pause and seek God together. Expect extended worship, prayer stations, and ministry for anyone who would like it. All ages welcome.",
    image:
      "https://images.unsplash.com/photo-1470229538611-16ba8c7ffbd7?auto=format&fit=crop&w=1600&q=80",
    featured: true,
    ctaLabel: "I’m coming",
    ctaHref: "/connect",
  },
];

export function getEventBySlug(slug: string): Event | undefined {
  return events.find((event) => event.slug === slug);
}

export function formatEventDate(dateString: string): string {
  const date = new Date(dateString);
  return new Intl.DateTimeFormat("en-GB", {
    weekday: "short",
    day: "numeric",
    month: "short",
  }).format(date);
}
