// The five things nearly everyone arrives at the site to do, and the rules that
// decide whether the homepage welcome overlay opens.
//
// The decision lives here, away from React, because it is the part with the edge
// cases — a deep-link entry, an unanswered cookie banner, a session that has
// already seen it — and it is pinned down by tests/unit/welcome-overlay.spec.ts.

/**
 * Session marker value. Bump it when the options below change, so a browser
 * session that has already dismissed the old set is shown the new one.
 */
export const WELCOME_VERSION = "1";

/** sessionStorage, not localStorage: once per visit, not once ever. */
export const WELCOME_STORAGE_KEY = "dc-welcome-seen";

export type WelcomeOption = {
  index: string;
  title: string;
  blurb: string;
  href: string;
  /** Material Symbols ligature — the site-wide icon convention. */
  icon: string;
  /** Spans the grid. The strongest first step for someone who has never been. */
  featured?: boolean;
};

export const WELCOME_OPTIONS: WelcomeOption[] = [
  {
    index: "01",
    title: "Plan a Visit",
    blurb: "Know what to expect before you come.",
    href: "/visit",
    icon: "directions_walk",
    featured: true,
  },
  {
    index: "02",
    title: "Connect Card",
    blurb: "Say hello or send a prayer request.",
    href: "/connect-card",
    icon: "waving_hand",
  },
  {
    index: "03",
    title: "Give",
    blurb: "Partner with the vision.",
    href: "/give",
    icon: "volunteer_activism",
  },
  {
    index: "04",
    title: "What's On",
    blurb: "Events, socials and everything coming up.",
    href: "/whats-on#events",
    icon: "calendar_month",
  },
  {
    index: "05",
    title: "Courses",
    blurb: "Explore life, faith and meaning.",
    href: "/whats-on#courses",
    icon: "menu_book",
  },
];

/** Trailing slashes and the empty string all mean the homepage. */
export function isHomepage(pathname: string): boolean {
  return (pathname.replace(/\/+$/, "") || "/") === "/";
}

export type WelcomeDecision =
  /** Open it. */
  | "show"
  /** Never this session — record the marker and stop asking. */
  | "suppress"
  /** Not now, but the answer could still change (wrong page, or consent pending). */
  | "wait";

export function decideWelcome({
  pathname,
  entryPathname,
  stored,
  consentResolved,
}: {
  /** Where the visitor is now. */
  pathname: string;
  /** The first path this browser session rendered, or null if not yet known. */
  entryPathname: string | null;
  /** Current value of WELCOME_STORAGE_KEY. */
  stored: string | null;
  /** Whether the cookie banner has been answered. */
  consentResolved: boolean;
}): WelcomeDecision {
  if (stored === WELCOME_VERSION) return "suppress";

  // Someone who landed on /give or /visit from search or a shared link already
  // knows what they came for. Asking them what they'd like to do is noise, and
  // it stays noise if they later hop to the homepage.
  if (entryPathname !== null && !isHomepage(entryPathname)) return "suppress";

  // Entry was the homepage but they've navigated on before we could open. Leave
  // the door ajar rather than burning the session — they may come back to /.
  if (!isHomepage(pathname)) return "wait";

  // The cookie banner is a fixed bar at z-50; this overlay sits at z-200 and
  // would bury it. Let them answer that first.
  if (!consentResolved) return "wait";

  return "show";
}
