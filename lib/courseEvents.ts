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
}

export const COURSE_EVENT_META: Record<CourseEventType, CourseEventMeta> = {
  alpha: { label: "Alpha", href: "/alpha", color: "#e51b1b" },
  youth_alpha: { label: "Youth Alpha", href: "/youth-alpha", color: "#b81313" },
  recovery: {
    label: "Destiny Recovery",
    href: "/destiny-recovery",
    color: "#006756",
  },
  bible_course: {
    label: "The Bible Course",
    href: "/bible-course",
    color: "#1b4965",
  },
  // CAP's brand green (#78be20) is far too light to carry white banner text —
  // this is the darkened version used for text and fills across /cap-money.
  cap: { label: "CAP Money Course", href: "/cap-money", color: "#4e7d14" },
};

export function isCourseEventType(value: unknown): value is CourseEventType {
  return (
    typeof value === "string" &&
    (COURSE_EVENT_TYPES as readonly string[]).includes(value)
  );
}

/** `(alpha,youth_alpha,…)` — PostgREST's `not.in` list syntax. */
export const COURSE_EVENT_TYPES_SQL = `(${COURSE_EVENT_TYPES.join(",")})`;
