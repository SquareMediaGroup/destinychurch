import { NextResponse } from "next/server";
import { headers } from "next/headers";
import { createServiceClient } from "@/utils/supabase/service";
import { AUDIT_ACTOR_HEADERS } from "@/lib/audit";
import { COURSE_EVENT_TYPES_SQL } from "@/lib/courseEvents";

export const dynamic = "force-dynamic";

const LOW_STOCK_THRESHOLD = 3;

// Everything the dashboard cards need, in one round trip.
//
// The dashboard used to download the full products (with variants), orders
// (with line items) and posts (with bodies) lists just to count them in the
// browser, plus four more requests that each paid for their own auth check in
// middleware. This does the counting in the database, and returns only numbers.
//
// Open to every admin in ROUTE_RULES (lib/adminRoles.ts), but not unguarded:
// each section is only queried if the caller holds its role, read from the
// x-dc-actor-roles header middleware sets (and overwrites, so a client can't
// forge it).
export async function GET() {
  const h = await headers();
  const held = new Set((h.get(AUDIT_ACTOR_HEADERS.roles) ?? "").split(",").filter(Boolean));
  const su = held.has("super_admin");
  const may = {
    site: su || held.has("site_admin"),
    events: su || held.has("event_admin"),
    store: su || held.has("store_admin"),
  };

  const db = createServiceClient();
  const nowIso = new Date().toISOString();
  const today = nowIso.slice(0, 10);
  const yearStart = `${new Date().getFullYear()}-01-01T00:00:00.000Z`;

  const count = async (
    run: PromiseLike<{ count: number | null; error: unknown }>,
  ): Promise<number | null> => {
    const { count: n, error } = await run;
    return error ? null : (n ?? 0);
  };

  const [
    redirectsTotal,
    redirectsActive,
    coursesTotal,
    coursesUpcoming,
    postsTotal,
    postsDrafts,
    bannerRes,
    popupRes,
    productsRes,
    ordersRes,
  ] = await Promise.all([
    may.site ? count(db.from("redirects").select("id", { count: "exact", head: true })) : null,
    may.site
      ? count(db.from("redirects").select("id", { count: "exact", head: true }).eq("active", true))
      : null,
    may.events ? count(db.from("alpha_events").select("id", { count: "exact", head: true })) : null,
    may.events
      ? count(
          db.from("alpha_events").select("id", { count: "exact", head: true }).gte("start_date", today),
        )
      : null,
    may.site ? count(db.from("posts").select("id", { count: "exact", head: true })) : null,
    may.site
      ? count(db.from("posts").select("id", { count: "exact", head: true }).eq("is_published", false))
      : null,
    su
      ? db
          .from("site_banner")
          .select("active, message")
          .not("type", "in", COURSE_EVENT_TYPES_SQL)
          .order("created_at", { ascending: true })
          .limit(1)
          .maybeSingle()
      : null,
    may.events
      ? db
          .from("site_popup")
          .select("active, title")
          .order("created_at", { ascending: true })
          .limit(1)
          .maybeSingle()
      : null,
    may.store
      ? db.from("products").select("id, name, is_published, variants:product_variants(is_active, stock)")
      : null,
    // Paid/fulfilled orders this year, plus every pending one, and nothing else.
    may.store
      ? db
          .from("orders")
          .select("status, total_pennies, paid_at, created_at")
          .or(`status.eq.pending,and(status.in.(paid,fulfilled),created_at.gte.${yearStart})`)
      : null,
  ]);

  const banner = bannerRes && !bannerRes.error
    ? { active: Boolean(bannerRes.data?.active), message: bannerRes.data?.message ?? "" }
    : null;
  const popup = popupRes && !popupRes.error
    ? { active: Boolean(popupRes.data?.active), title: popupRes.data?.title ?? "" }
    : null;

  let shop = null;
  if (productsRes && ordersRes && !productsRes.error && !ordersRes.error) {
    type Variant = { is_active: boolean; stock: number };
    const products = (productsRes.data ?? []) as unknown as {
      id: string;
      name: string;
      is_published: boolean;
      variants: Variant[];
    }[];
    const stockOf = (p: { variants: Variant[] }) =>
      p.variants.filter((v) => v.is_active).reduce((s, v) => s + Math.max(0, v.stock), 0);

    const year = new Date().getFullYear();
    const orders = ordersRes.data ?? [];
    shop = {
      totalProducts: products.length,
      drafts: products.filter((p) => !p.is_published).length,
      totalStock: products.reduce((s, p) => s + stockOf(p), 0),
      lowStock: products
        .filter((p) => p.is_published)
        .map((p) => ({ id: p.id, name: p.name, units: stockOf(p) }))
        .filter((p) => p.units <= LOW_STOCK_THRESHOLD)
        .sort((a, b) => a.units - b.units)
        .slice(0, 5),
      soldThisYearPennies: orders
        .filter(
          (o) =>
            (o.status === "paid" || o.status === "fulfilled") &&
            new Date(o.paid_at ?? o.created_at).getFullYear() === year,
        )
        .reduce((s, o) => s + (o.total_pennies ?? 0), 0),
      pendingOrders: orders.filter((o) => o.status === "pending").length,
      paidUnfulfilled: orders.filter((o) => o.status === "paid").length,
    };
  }

  return NextResponse.json({
    redirects:
      redirectsTotal === null || redirectsActive === null
        ? null
        : { total: redirectsTotal, active: redirectsActive },
    courses:
      coursesTotal === null || coursesUpcoming === null
        ? null
        : { total: coursesTotal, upcoming: coursesUpcoming },
    banner,
    popup,
    posts:
      postsTotal === null || postsDrafts === null ? null : { total: postsTotal, drafts: postsDrafts },
    shop,
  });
}
