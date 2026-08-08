// Registry for the course/event types stored in `alpha_events` (and mirrored by
// `site_banner.type` for the thin banner bars).
//
// These five types were previously spelled out as chained conditionals in
// app/layout.tsx, components/SiteBanner.tsx, lib/useBannerBars.ts and
// app/api/admin/banner/route.ts — four places to touch, in the same order,
// every time a course is added. Adding `cap` made that a fifth branch in each,
// so the list lives here instead: add a type once and every banner surface
// picks it up.
//
// NOTE: the DB has its own copy in the `alpha_events_type_check` constraint.
// Adding a type here without the matching migration means inserts fail with a
// check-constraint error.

export const COURSE_EVENT_TYPES = [
  "alpha",
  "youth_alpha",
  "recovery",
  "bible_course",
  "cap",
] as const;

export type CourseEventType = (typeof COURSE_EVENT_TYPES)[number];

export interface CourseEventMeta {
  /** Default banner eyebrow when the banner row has no `message`. */
  label: string;
  /** Default banner link when the banner row has no `link`. */
  href: string;
  /** Banner bar background. */
  color: string;
  /** Sub-label on the admin banner toggle card. */
  hint: string;
  /** Heading above this type's list in /admin. */
  eventsLabel: string;
  /**
   * `message` sent to /api/admin/banner. Alpha deliberately posts an empty
   * string — its banner renders the eyebrow from `label` instead.
   */
  bannerMessage: string;
  /** `link_text` sent to /api/admin/banner. */
  bannerLinkText: string;
}

export const COURSE_EVENT_META: Record<CourseEventType, CourseEventMeta> = {
  alpha: {
    label: "Alpha",
    href: "/alpha",
    color: "#e51b1b",
    hint: "18+ course",
    eventsLabel: "Alpha Events",
    bannerMessage: "",
    bannerLinkText: "Sign up",
  },
  youth_alpha: {
    label: "Youth Alpha",
    href: "/youth-alpha",
    color: "#b81313",
    hint: "11–18 course",
    eventsLabel: "Youth Alpha Events",
    bannerMessage: "Youth Alpha",
    bannerLinkText: "Sign up",
  },
  recovery: {
    label: "Destiny Recovery",
    href: "/destiny-recovery",
    color: "#006756",
    hint: "12-step Christian recovery course",
    eventsLabel: "Recovery Events",
    bannerMessage: "Destiny Recovery",
    bannerLinkText: "Find out more",
  },
  bible_course: {
    label: "The Bible Course",
    href: "/bible-course",
    color: "#1b4965",
    hint: "8-session course exploring the Bible",
    eventsLabel: "Bible Course Events",
    bannerMessage: "The Bible Course",
    bannerLinkText: "Find out more",
  },
  // CAP's brand green (#78be20) is far too light to carry white banner text —
  // this is the darkened version used for text and fills across /cap-money.
  cap: {
    label: "CAP Money Course",
    href: "/cap-money",
    color: "#4e7d14",
    hint: "Free 3-session budgeting course",
    eventsLabel: "CAP Money Events",
    bannerMessage: "CAP Money Course",
    bannerLinkText: "Find out more",
  },
};

// The /admin pages that manage course events. Each used to be its own ~630-line
// file that differed from the others only in slug, accent and wording — adding
// CAP meant copying one wholesale, and a fix to the event list had to be
// applied four times. They are now four thin wrappers around
// components/admin/CourseAdminPage.tsx, configured from here.
//
// A page can own more than one type: /admin/alpha manages Alpha and Youth
// Alpha together, which is why `types` is a list and the create form only
// shows a type selector when there is more than one.
//
// Headings are stored verbatim rather than derived, because the article does
// not follow a rule ("Promote Destiny Recovery", "Promote The Bible Course",
// "Promote the CAP Money Course").
export interface CourseAdminPageMeta {
  heading: string;
  blurb: string;
  /** Buttons, focus rings and the online-details panel on this page. */
  accent: string;
  promoteHeading: string;
  promoteHelp: string;
  types: CourseEventType[];
}

export const COURSE_ADMIN_PAGES = {
  alpha: {
    heading: "Alpha Events",
    blurb:
      "Manage Alpha and Youth Alpha event dates, signup links, and availability.",
    accent: "#f58021", // destiny-orange: this page predates the per-course accents
    promoteHeading: "Promote courses",
    promoteHelp:
      "Toggle on to show each course's banner at the top of the site. Both can run at once — they stack when both are enabled.",
    types: ["alpha", "youth_alpha"],
  },
  recovery: {
    heading: "Destiny Recovery",
    blurb:
      "Manage Recovery course event dates, signup links, and the site banner.",
    accent: "#006756",
    promoteHeading: "Promote Destiny Recovery",
    promoteHelp:
      "Toggle on to show the Destiny Recovery banner at the top of the site.",
    types: ["recovery"],
  },
  "bible-course": {
    heading: "The Bible Course",
    blurb:
      "Manage The Bible Course event dates, signup links, and the site banner.",
    accent: "#1b4965",
    promoteHeading: "Promote The Bible Course",
    promoteHelp:
      "Toggle on to show The Bible Course banner at the top of the site.",
    types: ["bible_course"],
  },
  "cap-money": {
    heading: "CAP Money Course",
    blurb: "Manage CAP Money Course dates, signup links, and the site banner.",
    accent: "#4e7d14",
    promoteHeading: "Promote the CAP Money Course",
    promoteHelp:
      "Toggle on to show the CAP Money Course banner at the top of the site.",
    types: ["cap"],
  },
} as const satisfies Record<string, CourseAdminPageMeta>;

export type CourseAdminPageSlug = keyof typeof COURSE_ADMIN_PAGES;

/** `#4e7d14` -> `78,125,20`, for the rgba() tints the admin pages use. */
export function hexToRgb(hex: string): string {
  const h = hex.replace("#", "");
  const n = parseInt(
    h.length === 3
      ? h
          .split("")
          .map((c) => c + c)
          .join("")
      : h,
    16,
  );
  return `${(n >> 16) & 255},${(n >> 8) & 255},${n & 255}`;
}

export function isCourseEventType(value: unknown): value is CourseEventType {
  return (
    typeof value === "string" &&
    (COURSE_EVENT_TYPES as readonly string[]).includes(value)
  );
}

/** `(alpha,youth_alpha,…)` — PostgREST's `not.in` list syntax. */
export const COURSE_EVENT_TYPES_SQL = `(${COURSE_EVENT_TYPES.join(",")})`;
