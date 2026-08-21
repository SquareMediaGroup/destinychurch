// The one list of everywhere you can go inside /admin.
//
// Before this file the same navigation was written out three times — once in
// AdminSidebar (with roles), once as a title map in AdminHeader (without), and
// once as hand-written cards on the dashboard (which had drifted and was
// missing Posts, Training, Store and Users entirely). Adding a section meant
// remembering all three, and the command palette would have made it four.
//
// Everything now derives from ADMIN_GROUPS: the sidebar, the header
// breadcrumbs, the dashboard grid and the ⌘K palette. Add a section here and
// it appears in all of them, correctly role-gated.
//
// Keep the `role` values in step with ROUTE_RULES in lib/adminRoles.ts — this
// file decides what a user is *shown*, that file decides what they can
// actually reach. Middleware is the real boundary; this is only signposting.

import type { AdminRole, RoleFlags } from "@/lib/adminRoles";

export interface AdminNavItem {
  href: string;
  label: string;
  /** Material Symbols Rounded icon name. */
  icon: string;
  /** Role needed to see it; null = every authenticated admin. */
  role: AdminRole | null;
  /** One line for the dashboard card and the palette's second row. */
  description: string;
  /**
   * Extra words that should find this page in the palette — what someone
   * would actually type when they don't know our name for it.
   */
  keywords?: string[];
  /** Match the pathname exactly rather than by prefix (for /admin itself). */
  exact?: boolean;
  /**
   * Reachable and searchable, but never listed in the sidebar or dashboard.
   * HR is built but not launched, so it stays off the nav on purpose.
   */
  unlisted?: boolean;
}

export interface AdminNavGroup {
  /** null for the ungrouped items that sit at the top of the sidebar. */
  label: string | null;
  icon?: string;
  items: AdminNavItem[];
}

export const ADMIN_GROUPS: AdminNavGroup[] = [
  {
    label: null,
    items: [
      {
        href: "/admin",
        label: "Dashboard",
        icon: "grid_view",
        role: null,
        description: "Overview of your site, content and tools.",
        keywords: ["home", "overview", "start"],
        exact: true,
      },
      {
        href: "/admin/posts",
        label: "Posts",
        icon: "article",
        role: "site_admin",
        description: "Standalone pages — campaigns, temporary pages and one-off content.",
        keywords: ["pages", "content", "articles", "blog", "landing page"],
      },
      {
        href: "/admin/training",
        label: "Training",
        icon: "school",
        role: "training_admin",
        description: "Team training categories, sub-groups and posts.",
        keywords: ["team", "volunteers", "courses", "sound", "production", "av"],
      },
      {
        href: "/admin/live",
        label: "Simulated Live",
        icon: "smart_display",
        role: "host",
        description:
          "Play a pre-recorded video on /live as if it were a live broadcast.",
        keywords: [
          "live",
          "stream",
          "premiere",
          "prerecorded",
          "pre-recorded",
          "replay",
          "youtube",
          "simulcast",
          "broadcast",
          "sunday",
        ],
      },
      {
        href: "/admin/live-chat",
        label: "Live Chat",
        icon: "forum",
        role: "host",
        description: "Moderate the chat on /live, work the prayer queue and review what was said.",
        keywords: [
          "chat",
          "host",
          "moderate",
          "prayer",
          "stream",
          "sunday",
          "held",
          "mute",
        ],
      },
    ],
  },
  {
    label: "Announcements",
    icon: "campaign",
    items: [
      {
        href: "/admin/banner",
        label: "Banner",
        icon: "campaign",
        role: "super_admin",
        description: "The strip across the top of every page.",
        keywords: ["notice", "alert", "sitewide", "top bar", "urgent"],
      },
      {
        href: "/admin/popup",
        label: "Popup",
        icon: "ad",
        role: "event_admin",
        description: "The pop-up shown to first-time visitors.",
        keywords: ["modal", "overlay", "dialog", "promo"],
      },
      {
        href: "/admin/featured-event",
        label: "Featured Event",
        icon: "star",
        role: "event_admin",
        description: "Promote one ChurchSuite event across the site.",
        keywords: ["promote", "churchsuite", "highlight", "whats on"],
      },
      {
        href: "/admin/event-popup",
        label: "Event Popup",
        icon: "co_present",
        role: "event_admin",
        description: "Copy for the pop-up advertising the featured event.",
        keywords: ["promote", "modal", "event"],
      },
      {
        href: "/admin/nfc",
        label: "NFC Page",
        icon: "nfc",
        role: "event_admin",
        description: "Tiles on the /nfc page — add, edit, reorder or hide.",
        keywords: ["tap", "card", "tiles", "signup", "welcome card"],
      },
    ],
  },
  {
    label: "Courses",
    icon: "event",
    items: [
      {
        href: "/admin/featured-course",
        label: "Featured Course",
        icon: "stars",
        role: "event_admin",
        description: "Choose which course headlines the What's On page.",
        keywords: ["whats on", "highlight", "promote"],
      },
      {
        href: "/admin/bible-course",
        label: "The Bible Course",
        icon: "menu_book",
        role: "event_admin",
        description: "Bible Course dates, details and sign-up links.",
        keywords: ["bible", "study", "dates"],
      },
      {
        href: "/admin/cap-money",
        label: "CAP Money",
        icon: "savings",
        role: "event_admin",
        description: "CAP Money Course dates and sign-up links.",
        keywords: ["debt", "money", "finance", "budget", "cap"],
      },
      {
        href: "/admin/alpha",
        label: "Alpha",
        icon: "event",
        role: "event_admin",
        description: "Alpha and Youth Alpha dates and sign-up links.",
        keywords: ["youth alpha", "course", "dates"],
      },
      {
        href: "/admin/recovery",
        label: "Recovery",
        icon: "healing",
        role: "event_admin",
        description: "Recovery group dates and sign-up information.",
        keywords: ["addiction", "support", "group"],
      },
    ],
  },
  {
    label: "Store",
    icon: "storefront",
    items: [
      {
        href: "/admin/store",
        label: "Products",
        icon: "inventory_2",
        role: "store_admin",
        description: "Products, variants, photos and stock.",
        keywords: ["shop", "merch", "stock", "tees", "clothing", "books"],
      },
      {
        href: "/admin/store/orders",
        label: "Orders",
        icon: "receipt_long",
        role: "store_admin",
        description: "Customer orders, fulfilment and refunds.",
        keywords: ["shop", "sales", "customers", "fulfil", "refund", "payments"],
      },
      {
        href: "/admin/store/hero",
        label: "Store Hero",
        icon: "view_carousel",
        role: "store_admin",
        description: "Rotating hero slides at the top of the shop.",
        keywords: ["shop", "slides", "carousel", "banner"],
      },
    ],
  },
  {
    label: "Site",
    icon: "settings",
    items: [
      {
        href: "/admin/redirects",
        label: "Redirects",
        icon: "alt_route",
        role: "site_admin",
        description: "Vanity URLs on destinytees.uk that point anywhere.",
        keywords: ["short link", "vanity", "url", "shortener", "qr"],
      },
      {
        href: "/admin/cache",
        label: "Clear Cache",
        icon: "refresh",
        role: "super_admin",
        description: "Force the site to rebuild a page right now.",
        keywords: ["revalidate", "purge", "refresh", "stale", "isr"],
      },
      {
        href: "/admin/onboarding",
        label: "Onboarding",
        icon: "school",
        role: "super_admin",
        description: "What each access level is taught, and the admin seen from their side.",
        keywords: ["tour", "training", "walkthrough", "welcome", "preview", "roles", "new starter"],
      },
      {
        href: "/admin/users",
        label: "Users",
        icon: "group",
        role: "super_admin",
        description: "Admin logins and which sections each person can reach.",
        keywords: ["staff", "access", "permissions", "roles", "logins", "team"],
      },
    ],
  },
  {
    // Built but not launched — unlisted keeps it out of the sidebar and
    // dashboard while leaving the pages reachable for whoever is building it.
    // Gated to hr_admin (super_admin still gets it, as with every section).
    label: "HR",
    icon: "badge",
    items: [
      {
        href: "/admin/hr",
        label: "HR",
        icon: "badge",
        role: "hr_admin",
        description: "People, leave, documents and reviews.",
        unlisted: true,
      },
      {
        href: "/admin/hr/staff",
        label: "Staff directory",
        icon: "groups",
        role: "hr_admin",
        description: "Everyone on the team and their key details.",
        unlisted: true,
      },
      {
        href: "/admin/hr/leave",
        label: "Leave & time-off",
        icon: "event_busy",
        role: "hr_admin",
        description: "Approve requests and track holiday balances.",
        unlisted: true,
      },
      {
        href: "/admin/hr/jobs",
        label: "Jobs & internships",
        icon: "work",
        role: "hr_admin",
        description: "Roles published on the public /jobs page.",
        unlisted: true,
      },
      {
        href: "/admin/hr/applications",
        label: "Applications",
        icon: "inbox",
        role: "hr_admin",
        description: "Candidates who applied through /jobs.",
        unlisted: true,
      },
      {
        href: "/admin/hr/documents",
        label: "Documents",
        icon: "folder_open",
        role: "hr_admin",
        description: "Contracts, policies and staff files.",
        unlisted: true,
      },
      {
        href: "/admin/hr/reviews",
        label: "Reviews & 1-to-1s",
        icon: "rate_review",
        role: "hr_admin",
        description: "Appraisals, catch-ups and what's coming up.",
        unlisted: true,
      },
      {
        href: "/admin/hr/checklists",
        label: "Checklists",
        icon: "checklist",
        role: "hr_admin",
        description: "Onboarding and offboarding templates.",
        unlisted: true,
      },
    ],
  },
];

/** Every item, flattened, in sidebar order. */
export const ADMIN_NAV_ITEMS: AdminNavItem[] = ADMIN_GROUPS.flatMap((g) => g.items);

/**
 * Things you *do* rather than places you go. Only surfaced in the palette,
 * where "new post" is what someone types when they mean /admin/posts and then
 * a click.
 */
export interface AdminQuickAction {
  id: string;
  label: string;
  icon: string;
  role: AdminRole | null;
  keywords?: string[];
  /** Navigate here; `?new=1` is honoured by the list pages that support it. */
  href: string;
  /** Opens in a new tab instead of navigating. */
  external?: boolean;
}

export const ADMIN_QUICK_ACTIONS: AdminQuickAction[] = [
  {
    id: "new-post",
    label: "New post",
    icon: "post_add",
    role: "site_admin",
    href: "/admin/posts?new=1",
    keywords: ["create", "add", "page", "write"],
  },
  {
    id: "new-redirect",
    label: "New redirect",
    icon: "add_link",
    role: "site_admin",
    href: "/admin/redirects?new=1",
    keywords: ["create", "add", "short link", "vanity"],
  },
  {
    id: "new-product",
    label: "New product",
    icon: "add_shopping_cart",
    role: "store_admin",
    href: "/admin/store/products/new",
    keywords: ["create", "add", "shop", "merch"],
  },
  {
    id: "new-category",
    label: "New training category",
    icon: "create_new_folder",
    role: "training_admin",
    href: "/admin/training?new=1",
    keywords: ["create", "add", "team"],
  },
  {
    id: "new-user",
    label: "Add admin user",
    icon: "person_add",
    role: "super_admin",
    href: "/admin/users?new=1",
    keywords: ["create", "invite", "access", "login"],
  },
  {
    id: "clear-cache",
    label: "Clear the cache",
    icon: "refresh",
    role: "super_admin",
    href: "/admin/cache",
    keywords: ["revalidate", "purge", "stale", "rebuild"],
  },
  {
    id: "view-site",
    label: "View live site",
    icon: "open_in_new",
    role: null,
    href: "/",
    external: true,
    keywords: ["public", "website", "preview"],
  },
];

export function canSee(roles: RoleFlags, role: AdminRole | null): boolean {
  if (roles.super_admin) return true;
  if (role === null) return true;
  return roles[role];
}

/** Groups with their items filtered by role, dropping groups left empty. */
export function visibleGroups(
  roles: RoleFlags,
  { includeUnlisted = false }: { includeUnlisted?: boolean } = {},
): AdminNavGroup[] {
  return ADMIN_GROUPS.map((group) => ({
    ...group,
    items: group.items.filter(
      (item) => (includeUnlisted || !item.unlisted) && canSee(roles, item.role),
    ),
  })).filter((group) => group.items.length > 0);
}

/** Flat, role-filtered list — what the palette searches over. */
export function visibleItems(
  roles: RoleFlags,
  options?: { includeUnlisted?: boolean },
): AdminNavItem[] {
  return visibleGroups(roles, options).flatMap((g) => g.items);
}

export function visibleQuickActions(roles: RoleFlags): AdminQuickAction[] {
  return ADMIN_QUICK_ACTIONS.filter((a) => canSee(roles, a.role));
}

/**
 * The registry entry a pathname belongs to — longest matching href wins, so
 * /admin/store/products/123 resolves to Products rather than Dashboard.
 */
export function itemForPath(pathname: string): AdminNavItem | null {
  const exact = ADMIN_NAV_ITEMS.find((i) => i.href === pathname);
  if (exact) return exact;
  return (
    ADMIN_NAV_ITEMS.filter((i) => !i.exact && pathname.startsWith(`${i.href}/`))
      .sort((a, b) => b.href.length - a.href.length)[0] ?? null
  );
}

export function groupForItem(item: AdminNavItem): AdminNavGroup | null {
  return ADMIN_GROUPS.find((g) => g.items.includes(item)) ?? null;
}

function prettify(segment: string): string {
  return segment.replace(/-/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

export function titleForPath(pathname: string): string {
  const item = itemForPath(pathname);
  if (item) return item.label;
  const last = pathname.split("/").filter(Boolean).pop();
  return last ? prettify(last) : "Dashboard";
}

export interface Crumb {
  label: string;
  href?: string;
}

/**
 * Breadcrumb trail for the header. Deep routes (an order, a product, a
 * training sub-group) get a real trail instead of the single flattened title
 * the old header showed, so you can always climb back out one level.
 */
export function breadcrumbsFor(pathname: string): Crumb[] {
  if (pathname === "/admin") return [{ label: "Dashboard" }];

  const item = itemForPath(pathname);
  const crumbs: Crumb[] = [{ label: "Dashboard", href: "/admin" }];

  if (!item) {
    crumbs.push({ label: titleForPath(pathname) });
    return crumbs;
  }

  // Any registry entry that is a strict parent of this one, shallowest first —
  // gives Store › Products for /admin/store/products/123.
  const ancestors = ADMIN_NAV_ITEMS.filter(
    (i) =>
      i !== item &&
      !i.exact &&
      i.href !== "/admin" &&
      item.href.startsWith(`${i.href}/`),
  ).sort((a, b) => a.href.length - b.href.length);

  for (const ancestor of ancestors) {
    crumbs.push({ label: ancestor.label, href: ancestor.href });
  }

  const isItemRoot = pathname === item.href;
  crumbs.push({ label: item.label, href: isItemRoot ? undefined : item.href });

  if (!isItemRoot) {
    // Whatever is left after the matched section — an id, "new", a sub-path.
    const rest = pathname.slice(item.href.length).split("/").filter(Boolean);
    const leaf = rest[rest.length - 1];
    if (leaf) {
      const looksLikeId = /^[0-9a-f-]{8,}$/i.test(leaf) || /^\d+$/.test(leaf);
      crumbs.push({ label: looksLikeId ? "Details" : prettify(leaf) });
    }
  }

  return crumbs;
}
