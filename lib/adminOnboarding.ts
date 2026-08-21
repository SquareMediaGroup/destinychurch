// Every guided tour in /admin, in one place.
//
// Same idea as lib/adminNav.ts: one registry, everything derives from it. The
// welcome gate, the checklist, the spotlight overlay and the super-admin
// preview page all read this file, so adding a section to a tour is one edit.
//
// Tours are keyed by access level, not by page. Someone with three roles is
// taught three tours back to back — the checklist simply gets longer, which is
// the honest thing to show a person who genuinely does have three jobs.
// super_admin has no tour of its own: it can reach everything, so a "super
// admin tour" would be every tour at once. Super admins preview other roles
// from /admin/onboarding instead.
//
// Anchors are `data-tour` attributes, not CSS classes or nth-child paths, so a
// restyle can't silently break a tour. Most live on the shared admin primitives
// (PageHeader, ListToolbar, SearchInput, the sidebar links), which is why five
// tours need so few edits to the pages themselves. Keep the routes in step with
// ROUTE_RULES in lib/adminRoles.ts — tests/unit/admin-onboarding.spec.ts fails
// the build if a tour ever points a role at a page it cannot open.

import type { AdminRole, RoleFlags } from "@/lib/adminRoles";

/**
 * Roles with a tour. Deliberately not "every AdminRole except super_admin" —
 * HR is built but not yet launched (see the `unlisted` entries in
 * lib/adminNav.ts) and has no tour of its own yet. Listing the roles
 * explicitly means a future access level lands with no tour and no build
 * error, rather than forcing a placeholder tour into existence just to
 * satisfy a type.
 */
export type OnboardedRole = "training_admin" | "event_admin" | "store_admin" | "site_admin" | "host";

export interface TourStep {
  id: string;
  /** Navigated to before the step is shown. */
  route: string;
  /** `data-tour` value to spotlight. Omit for a centred card with no target. */
  anchor?: string;
  title: string;
  body: string;
  placement?: "top" | "bottom" | "left" | "right" | "auto";
  /**
   * This step invites a real interaction — typing into the form, pressing
   * Save. Demo mode is on for the whole tour regardless; this only tells the
   * overlay to stop asking for a click on Next and let the page do the talking.
   */
  sandbox?: boolean;
  /** Typed into the anchored field for them, so the demo has something to save. */
  prefill?: string;
  /** Advance when the anchored element is clicked, rather than on Next. */
  advanceOnClick?: boolean;
  /**
   * Don't navigate for this step — we're already somewhere the route can't
   * name, like the editor for the product the previous step just invented.
   */
  stay?: boolean;
}

export interface TourSection {
  /** Stable — this is what lands in admin_onboarding.completed_steps. */
  id: string;
  label: string;
  steps: TourStep[];
}

export interface Tour {
  role: OnboardedRole;
  label: string;
  icon: string;
  blurb: string;
  sections: TourSection[];
}

/** Shown to everyone, once, before their first role tour. */
const ORIENTATION: TourSection = {
  id: "orientation",
  label: "Find your way around",
  steps: [
    {
      id: "orientation-welcome",
      route: "/admin",
      title: "This is your dashboard",
      body: "Everything you can change on the website lives behind this screen. It only ever shows the sections your access level covers, so there is nothing here you can break by accident.",
    },
    {
      id: "orientation-sidebar",
      route: "/admin",
      anchor: "sidebar",
      placement: "right",
      title: "The sidebar is the whole map",
      body: "Every page you can reach is listed here, grouped by what it does. If it isn't in this list, you don't have access to it — that's normal, not a fault.",
    },
    {
      id: "orientation-search",
      route: "/admin",
      anchor: "command-trigger",
      placement: "bottom",
      title: "Jump anywhere with one key",
      body: "Press Command-K (or Control-K) from any page and start typing. It searches pages and your actual content — a product name, a post title — and takes you straight there.",
    },
  ],
};

/**
 * Closes every tour. Says out loud that nothing was saved, because the whole
 * point of practising is not having to wonder afterwards.
 */
export function finaleStep(role: string): TourStep {
  return {
    id: `${role}-finale`,
    route: "/admin",
    title: "That's it — and nothing was saved",
    body: "Everything you just did was a rehearsal. No product, post or setting was created or changed, and the moment you leave this tour it all disappears. You can run it again any time from the Get Started button.",
  };
}

const STORE: Tour = {
  role: "store_admin",
  label: "Store Admin",
  icon: "storefront",
  blurb: "Products, orders and the shop's hero slides.",
  sections: [
    {
      id: "store-products",
      label: "Add a product",
      steps: [
        {
          id: "store-list",
          route: "/admin/store",
          anchor: "page-header",
          placement: "bottom",
          title: "Everything in the shop",
          body: "Each row is one product. The badge tells you whether it's live on the site or still a draft — a draft is invisible to customers, so you can build a product over several days safely.",
        },
        {
          id: "store-toolbar",
          route: "/admin/store",
          anchor: "list-toolbar",
          placement: "bottom",
          title: "Finding one product",
          body: "Search by name, or filter by status. Pressing the forward-slash key focuses this box from anywhere on the page.",
        },
        {
          id: "store-new",
          route: "/admin/store",
          anchor: "page-action",
          placement: "left",
          title: "Start a new product",
          body: "Let's make one now. Nothing you do here is real — press this to begin.",
          advanceOnClick: true,
        },
        {
          id: "store-name",
          route: "/admin/store/products/new",
          anchor: "product-name",
          placement: "bottom",
          sandbox: true,
          prefill: "Practice Tee",
          title: "A name is all you need to start",
          body: "We've filled in a practice name. Everything else — photos, sizes, price — comes on the next screen, so you never have to get it all right in one go.",
        },
        {
          id: "store-create",
          route: "/admin/store/products/new",
          anchor: "product-submit",
          placement: "top",
          sandbox: true,
          advanceOnClick: true,
          title: "Create it",
          body: "Press this and you'll land in the product editor. To be completely clear: this does not create a product. The button behaves exactly as it will in real life, but the request never leaves your browser.",
        },
        {
          id: "store-editor",
          route: "/admin/store/products",
          stay: true,
          anchor: "page-header",
          placement: "bottom",
          sandbox: true,
          title: "The product editor",
          body: "This is where a product actually gets built: photos, description, price, and the grid of colours and sizes. Each colour-and-size pair is a variant with its own stock count, which is how the shop knows when to stop selling something.",
        },
      ],
    },
    {
      id: "store-orders",
      label: "Work through an order",
      steps: [
        {
          id: "orders-list",
          route: "/admin/store/orders",
          anchor: "page-header",
          placement: "bottom",
          title: "Orders come in here",
          body: "Paid orders need fulfilling — that means posting the item and marking it sent, which emails the customer. Pending orders are checkouts that were never paid for and can be ignored.",
        },
        {
          id: "orders-filter",
          route: "/admin/store/orders",
          anchor: "list-toolbar",
          placement: "bottom",
          title: "Start with what needs doing",
          body: "Filter to paid but unfulfilled and you have your job list for the day. The dashboard shows the same count so you can see it without coming in here.",
        },
      ],
    },
    {
      id: "store-hero",
      label: "Change the shop's hero",
      steps: [
        {
          id: "hero-intro",
          route: "/admin/store/hero",
          anchor: "page-header",
          placement: "bottom",
          title: "The slides at the top of the shop",
          body: "These rotate at the top of the public shop page. Keep them to two or three — every extra slide is one more thing a visitor has to wait through before they see products.",
        },
      ],
    },
  ],
};

const SITE: Tour = {
  role: "site_admin",
  label: "Site Admin",
  icon: "article",
  blurb: "Standalone pages and vanity URLs.",
  sections: [
    {
      id: "site-posts",
      label: "Write a page",
      steps: [
        {
          id: "posts-list",
          route: "/admin/posts",
          anchor: "page-header",
          placement: "bottom",
          title: "Posts are standalone pages",
          body: "Not a blog — these are one-off pages for campaigns and events, each living at its own address on the site. Drafts are invisible to the public until you publish them.",
        },
        {
          id: "posts-new",
          route: "/admin/posts",
          anchor: "page-action",
          placement: "left",
          title: "Starting one",
          body: "A new post opens the block editor: you stack sections — text, images, buttons — rather than fighting with one big text box.",
        },
        {
          id: "posts-slug",
          route: "/admin/posts",
          anchor: "list-toolbar",
          placement: "bottom",
          title: "The address matters",
          body: "Each post has a slug, which is the bit after the slash in the address. Change it after you've shared the link and the old link breaks — so set it once, before you publish.",
        },
      ],
    },
    {
      id: "site-redirects",
      label: "Make a short link",
      steps: [
        {
          id: "redirects-intro",
          route: "/admin/redirects",
          anchor: "page-header",
          placement: "bottom",
          title: "Short links you control",
          body: "A redirect is a tidy address on our own site that forwards somewhere else. Print it on a flyer, then change where it points later without reprinting anything.",
        },
        {
          id: "redirects-new",
          route: "/admin/redirects",
          anchor: "page-action",
          placement: "left",
          sandbox: true,
          advanceOnClick: true,
          title: "Make one now",
          body: "Press this to open the form. Nothing you enter will be saved.",
        },
        {
          id: "redirects-form",
          route: "/admin/redirects",
          anchor: "list-toolbar",
          placement: "bottom",
          sandbox: true,
          title: "Three fields, one rule",
          body: "The label is for you, the slug is what people type, and the target is where they end up. Keep slugs short and lower-case — they get read aloud from a stage more often than you'd think.",
        },
      ],
    },
  ],
};

const EVENT: Tour = {
  role: "event_admin",
  label: "Event Admin",
  icon: "campaign",
  blurb: "Courses, pop-ups, the featured event and the NFC page.",
  sections: [
    {
      id: "event-courses",
      label: "Update a course",
      steps: [
        {
          id: "courses-intro",
          route: "/admin/alpha",
          anchor: "page-header",
          placement: "bottom",
          title: "Course dates live here",
          body: "Alpha, Recovery, the Bible Course and CAP Money each have their own page and all work the same way: add a date, and it appears on the public course page automatically.",
        },
        {
          id: "courses-featured",
          route: "/admin/featured-course",
          anchor: "page-header",
          placement: "bottom",
          title: "One course gets top billing",
          body: "Whichever course you pick here headlines the What's On page. Only one at a time, on purpose — a page with four equal headlines has none.",
        },
      ],
    },
    {
      id: "event-popup",
      label: "Change the pop-up",
      steps: [
        {
          id: "popup-intro",
          route: "/admin/popup",
          anchor: "page-header",
          placement: "bottom",
          sandbox: true,
          title: "The pop-up visitors see",
          body: "This appears a few seconds after someone lands on the site, once per visit. It is the loudest thing we own, so it earns its place only when there's something genuinely time-sensitive to say.",
        },
        {
          id: "popup-save",
          route: "/admin/popup",
          anchor: "list-toolbar",
          placement: "top",
          sandbox: true,
          title: "Try saving it",
          body: "Change the wording and press Save. The page will tell you it saved — it didn't. Nothing on the live site has changed, and nobody has seen anything.",
        },
      ],
    },
    {
      id: "event-featured",
      label: "Promote an event",
      steps: [
        {
          id: "featured-intro",
          route: "/admin/featured-event",
          anchor: "page-header",
          placement: "bottom",
          title: "Pulling an event out of ChurchSuite",
          body: "The list comes straight from ChurchSuite, so you never retype an event. Pick one and it's promoted across the site; the separate Event Popup page controls the wording if you want it in the pop-up too.",
        },
      ],
    },
    {
      id: "event-nfc",
      label: "Edit the tap-card page",
      steps: [
        {
          id: "nfc-intro",
          route: "/admin/nfc",
          anchor: "page-header",
          placement: "bottom",
          title: "What the welcome cards open",
          body: "Tapping a card with a phone opens this page. Each tile is a link — keep it to the few things a first-time visitor needs, and hide the rest rather than deleting them.",
        },
      ],
    },
  ],
};

const TRAINING: Tour = {
  role: "training_admin",
  label: "Training Admin",
  icon: "school",
  blurb: "Team training categories, sub-groups and posts.",
  sections: [
    {
      id: "training-structure",
      label: "Learn the structure",
      steps: [
        {
          id: "training-intro",
          route: "/admin/training",
          anchor: "page-header",
          placement: "bottom",
          title: "Three levels, no more",
          body: "A category is a team — Production, Hospitality. Inside it are sub-groups, and inside those are the actual training posts. Getting the category right first saves moving things later.",
        },
        {
          id: "training-new",
          route: "/admin/training",
          anchor: "page-action",
          placement: "left",
          sandbox: true,
          advanceOnClick: true,
          title: "Make a practice category",
          body: "Press this and fill it in however you like. It won't be created.",
        },
        {
          id: "training-list",
          route: "/admin/training",
          anchor: "list-toolbar",
          placement: "bottom",
          sandbox: true,
          title: "Open one to go deeper",
          body: "Clicking a category takes you into its sub-groups, and a sub-group into its posts. The breadcrumbs at the top always climb back out.",
        },
      ],
    },
  ],
};

const HOST: Tour = {
  role: "host",
  label: "Host",
  icon: "smart_display",
  blurb: "Sunday broadcasts and moderating the live chat.",
  sections: [
    {
      id: "host-broadcast",
      label: "Run a broadcast",
      steps: [
        {
          id: "live-intro",
          route: "/admin/live",
          anchor: "page-header",
          placement: "bottom",
          sandbox: true,
          title: "Playing a recording as if it were live",
          body: "Point this at a video and the public live page plays it on a schedule, exactly like a real stream — nobody watching can skip ahead. The controls also sit on the live page itself, so running a service never means leaving it.",
        },
      ],
    },
    {
      id: "host-chat",
      label: "Moderate the chat",
      steps: [
        {
          id: "chat-intro",
          route: "/admin/live-chat",
          anchor: "page-header",
          placement: "bottom",
          title: "The room during a service",
          body: "Messages arrive here as they're posted. You can approve held messages, delete, mute someone, pause the room or close it — and prayer requests come through as their own queue rather than getting lost in the scroll.",
        },
        {
          id: "chat-prayer",
          route: "/admin/live-chat",
          anchor: "list-toolbar",
          placement: "bottom",
          title: "Prayer comes first",
          body: "Work the prayer queue before the general chat. Someone who asked for prayer and heard nothing back is the one person a Sunday online shouldn't lose.",
        },
      ],
    },
  ],
};

export const TOURS: Record<OnboardedRole, Tour> = {
  store_admin: STORE,
  site_admin: SITE,
  event_admin: EVENT,
  training_admin: TRAINING,
  host: HOST,
};

/** Short names for the access levels, for buttons that can't fit a sentence. */
export const ROLE_LABELS: Record<OnboardedRole, string> = {
  site_admin: "Site",
  store_admin: "Store",
  event_admin: "Events",
  training_admin: "Training",
  host: "Host",
};

/** Fixed order, so a two-role user always sees their tours in the same sequence. */
export const TOUR_ORDER: OnboardedRole[] = [
  "site_admin",
  "store_admin",
  "event_admin",
  "training_admin",
  "host",
];

/**
 * The tours this person is owed. Super admins get none — they have every role,
 * so this would be every tour; they preview a single role from
 * /admin/onboarding instead.
 */
export function toursFor(roles: RoleFlags): Tour[] {
  if (roles.super_admin) return [];
  return TOUR_ORDER.filter((role) => roles[role]).map((role) => TOURS[role]);
}

/** Orientation first, then every section of every tour they're owed. */
export function checklistFor(roles: RoleFlags): TourSection[] {
  const tours = toursFor(roles);
  if (!tours.length) return [];
  return [ORIENTATION, ...tours.flatMap((tour) => tour.sections)];
}

/** The same list for one role, used by the super-admin preview page. */
export function checklistForRole(role: OnboardedRole): TourSection[] {
  return [ORIENTATION, ...TOURS[role].sections];
}

export function stepsOf(sections: TourSection[]): TourStep[] {
  return sections.flatMap((section) => section.steps);
}

/** Which section a step belongs to — the overlay ticks it off on the last step. */
export function sectionOfStep(sections: TourSection[], stepId: string): TourSection | null {
  return sections.find((s) => s.steps.some((step) => step.id === stepId)) ?? null;
}

export function progressFor(
  sections: TourSection[],
  completed: ReadonlySet<string>,
): { done: number; total: number; pct: number } {
  const total = sections.length;
  const done = sections.filter((s) => completed.has(s.id)).length;
  return { done, total, pct: total === 0 ? 100 : Math.round((done / total) * 100) };
}

/** Roughly how long the whole thing takes, for the welcome gate. */
export function minutesFor(sections: TourSection[]): number {
  return Math.max(1, Math.round(stepsOf(sections).length * 0.25));
}

export const ORIENTATION_SECTION = ORIENTATION;
