"use client";

// The admin dashboard.
//
// Three things were wrong with the old version and all three are fixed here:
//
//  1. The "Manage" grid was hand-written and had drifted — it listed Redirects
//     and the five course pages and nothing else, so Posts, Training, Store,
//     Announcements and Users were reachable only through the sidebar. It now
//     comes from lib/adminNav, role-filtered, so it can never fall behind.
//  2. Every visitor fetched every section's data, including sections their role
//     can't open, producing a row of 403s and empty cards. Fetches are now
//     gated on the signed-in roles.
//  3. It showed counts but never what needed doing. "Needs attention" surfaces
//     the handful of states someone actually opens the admin to deal with —
//     orders waiting to be fulfilled, stock about to run out, drafts left
//     unpublished, a banner still live after the event.

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import {
  visibleGroups,
  visibleQuickActions,
  ADMIN_NAV_ITEMS,
  type AdminNavItem,
} from "@/lib/adminNav";
import { useAdminSession } from "@/lib/useAdminSession";
import { useAdminRecents } from "@/lib/adminRecents";
import { totalStock, type ProductWithVariants, type Order } from "@/lib/shop";
import type { Post } from "@/lib/posts";
import { CommandTrigger } from "@/components/admin/AdminCommandPalette";
import { MetricCard } from "@/components/admin/AdminUI";

/** A variant at or below this many units is called out before it sells out. */
const LOW_STOCK_THRESHOLD = 3;

const gbp = new Intl.NumberFormat("en-GB", {
  style: "currency",
  currency: "GBP",
  maximumFractionDigits: 0,
});

interface Snapshot {
  redirects: { total: number; active: number } | null;
  courses: { total: number; upcoming: number } | null;
  banner: { active: boolean; message: string } | null;
  popup: { active: boolean; title: string } | null;
  posts: { total: number; drafts: number } | null;
  shop: {
    totalProducts: number;
    drafts: number;
    totalStock: number;
    lowStock: { id: string; name: string; units: number }[];
    soldThisYearPennies: number;
    pendingOrders: number;
    paidUnfulfilled: number;
  } | null;
}

const EMPTY: Snapshot = {
  redirects: null,
  courses: null,
  banner: null,
  popup: null,
  posts: null,
  shop: null,
};

/**
 * Today's date, assembled field by field.
 *
 * Formatting the whole date in one `toLocaleDateString` call caused a real
 * hydration error: Node and Chrome ship different ICU versions, and their en-GB
 * long-date patterns disagree about the comma after the weekday ("Monday, 17
 * August" vs "Monday 17 August"). React saw mismatched text and threw away the
 * whole client tree on every dashboard load. The individual field names are
 * stable across ICU versions — only the pattern that joins them isn't — so we
 * join them ourselves.
 */
function formatToday(now = new Date()): string {
  const weekday = now.toLocaleDateString("en-GB", { weekday: "long" });
  const month = now.toLocaleDateString("en-GB", { month: "long" });
  return `${weekday} ${now.getDate()} ${month} ${now.getFullYear()}`;
}

/** Fetch that resolves to null instead of throwing, so one 403 can't blank the page. */
async function getJson<T>(url: string): Promise<T | null> {
  try {
    const res = await fetch(url);
    if (!res.ok) return null;
    return (await res.json()) as T;
  } catch {
    return null;
  }
}

/**
 * "Since your last visit" trend, for the one metric here where more is
 * unambiguously good: revenue. Every other card on this page either already
 * carries a more specific chip (drafts, total, low stock — see the `chip`
 * props below) or has no natural "more is better" reading (more orders to
 * fulfil isn't good news the way more sales is), so this doesn't try to force
 * a trend arrow onto numbers where up and down don't mean anything on their
 * own.
 *
 * Deliberately a localStorage diff against this browser's last visit, not a
 * calendar-aligned week-over-week figure — there's no historical snapshot
 * table for dashboard metrics, and standing one up purely for a trend arrow
 * would be a lot of new backend for a visual-polish detail. The chip's title
 * says so, so it doesn't read as a proper analytics number.
 */
const DASHBOARD_SNAPSHOT_KEY = "dc-admin-dashboard-snapshot";

function readLastSoldPennies(): number | null {
  try {
    const raw = window.localStorage.getItem(DASHBOARD_SNAPSHOT_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as { soldThisYearPennies?: number };
    return typeof parsed.soldThisYearPennies === "number" ? parsed.soldThisYearPennies : null;
  } catch {
    return null;
  }
}

function writeLastSoldPennies(soldThisYearPennies: number) {
  try {
    window.localStorage.setItem(
      DASHBOARD_SNAPSHOT_KEY,
      JSON.stringify({ soldThisYearPennies }),
    );
  } catch {
    // Private browsing — the trend just won't have a "last visit" to compare to.
  }
}

const asArray = <T,>(value: unknown): T[] => (Array.isArray(value) ? (value as T[]) : []);

export default function AdminDashboard() {
  const { roles, loaded } = useAdminSession();
  const { recents } = useAdminRecents();
  const [snapshot, setSnapshot] = useState<Snapshot>(EMPTY);
  const [loading, setLoading] = useState(true);
  /** Pennies sold since the last time this browser loaded the dashboard. */
  const [soldDeltaPennies, setSoldDeltaPennies] = useState<number | null>(null);
  // Middleware bounces here with ?forbidden=1 when someone opens a section
  // their role can't reach. Read straight from the router — it's derived, not
  // state.
  const forbidden = useSearchParams().get("forbidden") === "1";

  useEffect(() => {
    if (!loaded) return;
    const su = roles.super_admin;
    const may = {
      site: su || roles.site_admin,
      events: su || roles.event_admin,
      store: su || roles.store_admin,
    };

    let cancelled = false;

    (async () => {
      const [redirects, courses, banner, popup, posts, products, orders] =
        await Promise.all([
          may.site ? getJson<unknown>("/api/admin/redirects") : null,
          may.events ? getJson<unknown>("/api/admin/alpha-events") : null,
          su ? getJson<{ active?: boolean; message?: string }>("/api/admin/banner") : null,
          may.events ? getJson<{ active?: boolean; title?: string }>("/api/admin/popup") : null,
          may.site ? getJson<unknown>("/api/admin/posts") : null,
          may.store ? getJson<unknown>("/api/admin/store/products") : null,
          may.store ? getJson<unknown>("/api/admin/store/orders") : null,
        ]);

      if (cancelled) return;

      const now = new Date();
      const year = now.getFullYear();

      const redirectRows = asArray<{ active: boolean }>(redirects);
      const courseRows = asArray<{ start_date: string }>(courses);
      const postRows = asArray<Post>(posts);
      const productRows = asArray<ProductWithVariants>(products);
      const orderRows = asArray<Order>(orders);

      const lowStock = productRows
        .filter((p) => p.is_published)
        .map((p) => ({ id: p.id, name: p.name, units: totalStock(p) }))
        .filter((p) => p.units <= LOW_STOCK_THRESHOLD)
        .sort((a, b) => a.units - b.units)
        .slice(0, 5);

      const soldThisYearPennies = orderRows
        .filter((o) => {
          if (o.status !== "paid" && o.status !== "fulfilled") return false;
          return new Date(o.paid_at ?? o.created_at).getFullYear() === year;
        })
        .reduce((sum, o) => sum + (o.total_pennies ?? 0), 0);

      if (orders && may.store) {
        const lastSold = readLastSoldPennies();
        setSoldDeltaPennies(lastSold === null ? null : soldThisYearPennies - lastSold);
        writeLastSoldPennies(soldThisYearPennies);
      }

      setSnapshot({
        redirects: redirects
          ? {
              total: redirectRows.length,
              active: redirectRows.filter((r) => r.active).length,
            }
          : null,
        courses: courses
          ? {
              total: courseRows.length,
              upcoming: courseRows.filter((e) => new Date(e.start_date) >= now).length,
            }
          : null,
        banner: banner
          ? { active: Boolean(banner.active), message: banner.message ?? "" }
          : null,
        popup: popup ? { active: Boolean(popup.active), title: popup.title ?? "" } : null,
        posts: posts
          ? {
              total: postRows.length,
              drafts: postRows.filter((p) => !p.is_published).length,
            }
          : null,
        shop:
          products || orders
            ? {
                totalProducts: productRows.length,
                drafts: productRows.filter((p) => !p.is_published).length,
                totalStock: productRows.reduce((sum, p) => sum + totalStock(p), 0),
                lowStock,
                soldThisYearPennies,
                pendingOrders: orderRows.filter((o) => o.status === "pending").length,
                paidUnfulfilled: orderRows.filter((o) => o.status === "paid").length,
              }
            : null,
      });
      setLoading(false);
    })();

    return () => {
      cancelled = true;
    };
  }, [loaded, roles]);

  /* ── Needs attention ─────────────────────────────────────────────────── */

  const alerts = useMemo(() => {
    const out: {
      icon: string;
      tone: "orange" | "blue" | "red";
      text: string;
      href: string;
      cta: string;
    }[] = [];
    const { shop, posts, banner } = snapshot;

    if (shop?.paidUnfulfilled) {
      out.push({
        icon: "local_shipping",
        tone: "blue",
        text: `${shop.paidUnfulfilled} paid order${shop.paidUnfulfilled === 1 ? "" : "s"} waiting to be fulfilled`,
        href: "/admin/store/orders?status=paid",
        cta: "Fulfil",
      });
    }
    if (shop?.pendingOrders) {
      out.push({
        icon: "hourglass_top",
        tone: "orange",
        text: `${shop.pendingOrders} order${shop.pendingOrders === 1 ? "" : "s"} still pending payment`,
        href: "/admin/store/orders?status=pending",
        cta: "Review",
      });
    }
    if (shop?.lowStock.length) {
      out.push({
        icon: "inventory",
        tone: "red",
        text:
          shop.lowStock.length === 1
            ? `${shop.lowStock[0].name} is down to ${shop.lowStock[0].units} in stock`
            : `${shop.lowStock.length} published products are low on stock`,
        href: "/admin/store?stock=low",
        cta: "Restock",
      });
    }
    if (posts?.drafts) {
      out.push({
        icon: "edit_note",
        tone: "orange",
        text: `${posts.drafts} post${posts.drafts === 1 ? "" : "s"} still in draft`,
        href: "/admin/posts?status=draft",
        cta: "Open",
      });
    }
    if (banner?.active) {
      out.push({
        icon: "campaign",
        tone: "orange",
        text: `The sitewide banner is live: “${banner.message.slice(0, 70)}${banner.message.length > 70 ? "…" : ""}”`,
        href: "/admin/banner",
        cta: "Edit",
      });
    }
    return out;
  }, [snapshot]);

  /* ── Recents ─────────────────────────────────────────────────────────── */

  const recentItems = useMemo(() => {
    const allowed = new Set(
      visibleGroups(roles)
        .flatMap((g) => g.items)
        .map((i) => i.href),
    );
    return recents
      .map((href) => ADMIN_NAV_ITEMS.find((i) => i.href === href))
      .filter((i): i is AdminNavItem => Boolean(i && allowed.has(i.href)))
      .slice(0, 5);
  }, [recents, roles]);

  const groups = visibleGroups(roles);
  const quickActions = visibleQuickActions(roles);
  const busy = loading || !loaded;

  const today = formatToday();

  return (
    <div className="mx-auto max-w-6xl px-6 py-8 md:px-8 md:py-10">
      {forbidden && (
        <div className="mb-6 flex items-center gap-2 rounded-xl bg-danger/10 px-4 py-3 text-sm font-bold text-danger">
          <span className="material-symbols-rounded text-lg">lock</span>
          You don&apos;t have access to that section.
        </div>
      )}

      {/* Header */}
      <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="mb-1 text-xs font-bold uppercase tracking-widest text-destiny-grey/40 dark:text-white/40">
            {today}
          </p>
          <h1 className="font-[family-name:var(--font-admin-heading)] text-3xl font-black tracking-tight text-destiny-grey dark:text-white">
            Dashboard
          </h1>
          <p className="mt-1 text-sm text-destiny-grey/50 dark:text-white/50">
            Everything you can manage, and anything that needs you.
          </p>
        </div>
        <CommandTrigger className="md:hidden" />
      </div>

      {/* Needs attention */}
      {!busy && alerts.length > 0 && (
        <section className="mb-10">
          <h2 className="mb-3 text-xs font-bold uppercase tracking-widest text-destiny-grey/40 dark:text-white/40">
            Needs attention
          </h2>
          <ul className="flex flex-col gap-2">
            {alerts.map((alert) => (
              <li key={alert.text}>
                <Link
                  href={alert.href}
                  className="group flex items-center gap-3 rounded-2xl border border-black/5 bg-white px-4 py-3 shadow-sm transition hover:shadow-md dark:border-white/8 dark:bg-destiny-grey-800"
                >
                  <span
                    className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${
                      alert.tone === "red"
                        ? "bg-destiny-red/10 text-destiny-red"
                        : alert.tone === "blue"
                          ? "bg-destiny-blue/10 text-destiny-blue"
                          : "bg-destiny-orange/10 text-destiny-orange"
                    }`}
                  >
                    <span className="material-symbols-rounded text-xl">{alert.icon}</span>
                  </span>
                  <p className="min-w-0 flex-1 text-sm font-bold text-destiny-grey dark:text-white">
                    {alert.text}
                  </p>
                  <span className="shrink-0 text-xs font-bold text-destiny-orange opacity-0 transition group-hover:opacity-100">
                    {alert.cta}
                  </span>
                  <span className="material-symbols-rounded shrink-0 text-base text-destiny-grey/25 transition group-hover:text-destiny-orange dark:text-white/25">
                    arrow_forward
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}

      {/* Metrics — only the sections this admin can actually open */}
      <section className="mb-10">
        <h2 className="mb-3 text-xs font-bold uppercase tracking-widest text-destiny-grey/40 dark:text-white/40">
          At a glance
        </h2>
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {snapshot.posts !== null || busy ? (
            <MetricCard
              href="/admin/posts"
              icon="article"
              iconColor="text-destiny-purple"
              iconBg="bg-destiny-purple/10"
              label="Published posts"
              loading={busy}
              value={(snapshot.posts?.total ?? 0) - (snapshot.posts?.drafts ?? 0)}
              chip={
                snapshot.posts?.drafts
                  ? { text: `${snapshot.posts.drafts} draft`, tone: "muted" }
                  : undefined
              }
            />
          ) : null}
          {snapshot.redirects !== null || busy ? (
            <MetricCard
              href="/admin/redirects"
              icon="alt_route"
              iconColor="text-destiny-blue"
              iconBg="bg-destiny-blue/10"
              label="Active redirects"
              loading={busy}
              value={snapshot.redirects?.active ?? 0}
              chip={
                snapshot.redirects
                  ? { text: `${snapshot.redirects.total} total`, tone: "muted" }
                  : undefined
              }
            />
          ) : null}
          {snapshot.courses !== null || busy ? (
            <MetricCard
              href="/admin/alpha"
              icon="event"
              iconColor="text-destiny-green"
              iconBg="bg-destiny-green/10"
              label="Upcoming course dates"
              loading={busy}
              value={snapshot.courses?.upcoming ?? 0}
              chip={
                snapshot.courses
                  ? { text: `${snapshot.courses.total} total`, tone: "muted" }
                  : undefined
              }
            />
          ) : null}
          {snapshot.popup !== null || busy ? (
            <MetricCard
              href="/admin/popup"
              icon="ad"
              iconColor={snapshot.popup?.active ? "text-destiny-orange" : "text-destiny-grey/40 dark:text-white/40"}
              iconBg={snapshot.popup?.active ? "bg-destiny-orange/10" : "bg-black/5 dark:bg-white/10"}
              label="Popup"
              loading={busy}
              value={snapshot.popup?.active ? "Live" : "Off"}
              valueClass={
                snapshot.popup?.active
                  ? "text-destiny-grey dark:text-white"
                  : "text-destiny-grey/40 dark:text-white/40"
              }
            />
          ) : null}
        </div>
      </section>

      {/* Shop */}
      {(snapshot.shop !== null || busy) && (
        <section className="mb-10">
          <h2 className="mb-3 text-xs font-bold uppercase tracking-widest text-destiny-grey/40 dark:text-white/40">
            Shop
          </h2>
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <MetricCard
              href="/admin/store"
              icon="inventory_2"
              iconColor="text-destiny-orange"
              iconBg="bg-destiny-orange/10"
              label="Products"
              loading={busy}
              value={snapshot.shop?.totalProducts ?? 0}
              chip={
                snapshot.shop?.drafts
                  ? { text: `${snapshot.shop.drafts} draft`, tone: "muted" }
                  : undefined
              }
            />
            <MetricCard
              href="/admin/store"
              icon="package_2"
              iconColor="text-destiny-blue"
              iconBg="bg-destiny-blue/10"
              label="Units in stock"
              loading={busy}
              value={snapshot.shop?.totalStock ?? 0}
              chip={
                snapshot.shop?.lowStock.length
                  ? { text: `${snapshot.shop.lowStock.length} low`, tone: "down" }
                  : undefined
              }
            />
            <MetricCard
              href="/admin/store/orders?status=paid"
              icon="local_shipping"
              iconColor="text-destiny-purple"
              iconBg="bg-destiny-purple/10"
              label="To fulfil"
              loading={busy}
              value={snapshot.shop?.paidUnfulfilled ?? 0}
            />
            <MetricCard
              href="/admin/store/orders"
              icon="payments"
              iconColor="text-destiny-green"
              iconBg="bg-destiny-green/10"
              label={`Sold in ${new Date().getFullYear()}`}
              loading={busy}
              value={
                snapshot.shop ? gbp.format(snapshot.shop.soldThisYearPennies / 100) : "£0"
              }
              chip={
                soldDeltaPennies !== null && soldDeltaPennies !== 0
                  ? {
                      text: `${soldDeltaPennies > 0 ? "+" : "−"}${gbp.format(
                        Math.abs(soldDeltaPennies) / 100,
                      )}`,
                      tone: soldDeltaPennies > 0 ? "up" : "down",
                      title: "Since your last visit to this dashboard, in this browser",
                    }
                  : undefined
              }
            />
          </div>
        </section>
      )}

      {/* Jump back in */}
      {recentItems.length > 0 && (
        <section className="mb-10">
          <h2 className="mb-3 text-xs font-bold uppercase tracking-widest text-destiny-grey/40 dark:text-white/40">
            Jump back in
          </h2>
          <div className="flex flex-wrap gap-2">
            {recentItems.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="flex items-center gap-2 rounded-xl border border-black/8 bg-white px-3.5 py-2 text-sm font-bold text-destiny-grey shadow-sm transition hover:shadow-md dark:border-white/10 dark:bg-destiny-grey-800 dark:text-white"
              >
                <span className="material-symbols-rounded text-lg text-destiny-orange">
                  {item.icon}
                </span>
                {item.label}
              </Link>
            ))}
          </div>
        </section>
      )}

      {/* Quick actions */}
      {quickActions.length > 0 && (
        <section className="mb-10">
          <h2 className="mb-3 text-xs font-bold uppercase tracking-widest text-destiny-grey/40 dark:text-white/40">
            Quick actions
          </h2>
          <div className="flex flex-wrap gap-2">
            {quickActions.map((action) => (
              <Link
                key={action.id}
                href={action.href}
                target={action.external ? "_blank" : undefined}
                rel={action.external ? "noreferrer" : undefined}
                className="flex items-center gap-2 rounded-xl border border-black/8 bg-white px-3.5 py-2 text-sm font-bold text-destiny-grey shadow-sm transition hover:shadow-md dark:border-white/10 dark:bg-destiny-grey-800 dark:text-white"
              >
                <span className="material-symbols-rounded text-lg text-destiny-orange">
                  {action.icon}
                </span>
                {action.label}
              </Link>
            ))}
          </div>
        </section>
      )}

      {/* Everything, straight from the registry */}
      <section className="space-y-6">
        <h2 className="text-xs font-bold uppercase tracking-widest text-destiny-grey/40 dark:text-white/40">
          Manage
        </h2>
        {groups.map((group) => (
          <div key={group.label ?? "top"}>
            {group.label && (
              <p className="mb-2 text-[11px] font-bold uppercase tracking-widest text-destiny-grey/30 dark:text-white/30">
                {group.label}
              </p>
            )}
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {group.items
                .filter((item) => !item.exact) // skip the Dashboard card on the dashboard
                .map((item) => (
                  <SectionCard key={item.href} item={item} />
                ))}
            </div>
          </div>
        ))}
      </section>
    </div>
  );
}

function SectionCard({ item }: { item: AdminNavItem }) {
  return (
    <Link
      href={item.href}
      className="group flex items-start gap-4 rounded-2xl border border-black/5 bg-white p-5 shadow-sm transition hover:shadow-md dark:border-white/8 dark:bg-destiny-grey-800"
    >
      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-destiny-orange/10 text-destiny-orange">
        <span className="material-symbols-rounded text-xl">{item.icon}</span>
      </span>
      <div className="min-w-0">
        <p className="mb-0.5 text-sm font-black text-destiny-grey transition-colors group-hover:text-destiny-orange dark:text-white">
          {item.label}
        </p>
        <p className="text-xs leading-relaxed text-destiny-grey/50 dark:text-white/50">
          {item.description}
        </p>
      </div>
      <span className="material-symbols-rounded ml-auto mt-0.5 shrink-0 text-base text-destiny-grey/20 transition group-hover:text-destiny-orange/50 dark:text-white/20">
        arrow_forward
      </span>
    </Link>
  );
}
