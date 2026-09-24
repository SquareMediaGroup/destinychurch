// The six "Next Steps" /links has always shown.
//
// /links is now built in /admin/links (lib/linkPages/), and these are no longer
// what it renders. They survive in two places, deliberately:
//   - fallbackMainPage() in lib/linkPages/linkPages.server.ts renders them if
//     the database can't answer, so /links is never blank;
//   - app/api/track/route.ts still accepts their hrefs as click targets, since
//     that fallback page reports clicks against them.
// The migration that created link_pages seeded these same six as the first
// blocks on the main page.

export interface Step {
  index: string;
  title: string;
  blurb: string;
  href: string;
  icon: string;
}

export const LINKS_STEPS: Step[] = [
  {
    index: "01",
    title: "Baptism",
    blurb: "Go public with your faith.",
    href: "/baptism",
    icon: "water_drop",
  },
  {
    index: "02",
    title: "Joining a Team",
    blurb: "Use your gifts and serve.",
    href: "/serve",
    icon: "diversity_3",
  },
  {
    index: "03",
    title: "Joining a Connect Group",
    blurb: "Find your people midweek.",
    href: "/connect",
    icon: "groups",
  },
  {
    index: "04",
    title: "Dedicating your Child",
    blurb: "Celebrate and bless the little ones.",
    href: "/child-dedication",
    icon: "child_care",
  },
  {
    index: "05",
    title: "Courses",
    blurb: "Explore life, faith and meaning.",
    href: "/alpha",
    icon: "menu_book",
  },
  {
    index: "06",
    title: "Giving",
    blurb: "Partner with the vision.",
    href: "/give",
    icon: "volunteer_activism",
  },
];

const STEP_BY_HREF = new Map(LINKS_STEPS.map((step) => [step.href, step]));

/** Looks up a /links card by its href — the only valid `target_key` for this source. */
export function findLinksStep(href: string): Step | null {
  return STEP_BY_HREF.get(href) ?? null;
}
