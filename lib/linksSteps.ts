// The six "Next Steps" cards on /links, and nothing else about that page.
//
// Pulled out of app/links/page.tsx so the beacon at app/api/track/route.ts has
// something authoritative to validate a click against: a target_key it can't
// find here isn't a step that exists, and the row is rejected rather than
// written. The renderer (components/links/LinksStepGrid.tsx) and the validator
// read the same array, so the two can never drift apart.

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
