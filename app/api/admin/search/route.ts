import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createClient } from "@/utils/supabase/server";
import { createServiceClient } from "@/utils/supabase/service";
import { getRoles, type AdminRole, type RoleFlags } from "@/lib/adminRoles";

// Search across every admin section at once — the records half of the ⌘K
// palette. Without this, finding "the Faith Hoodie" meant knowing it was a
// product, navigating to Products, then scanning; now the name is enough.
//
// Authorization: middleware only guarantees the caller is a signed-in admin
// (this path is in OPEN_PATHS because a Store Admin must be able to search
// their own orders). Every query below is therefore gated on the caller's own
// roles, so results can never include a section they can't open. Roles are
// re-read here from the service client rather than trusted from the request.
//
// Deliberately excluded: HR. Its records — staff details, leave reasons,
// applicant CVs — are the most sensitive in the admin, and that isn't a
// launch-status thing: they stay out of a fuzzy search box regardless of
// which role is searching. If you're tempted to add HR here, don't.

export const dynamic = "force-dynamic";

/** Per-section cap. Keeps the payload small; the palette shows a few each. */
const PER_SECTION = 6;

export type HitTone = "green" | "orange" | "red" | "grey" | "blue";

export interface AdminSearchHit {
  id: string;
  /** Section label shown as the group heading in the palette. */
  section: string;
  title: string;
  subtitle?: string;
  href: string;
  icon: string;
  /** Optional right-aligned status pill. */
  badge?: { text: string; tone: HitTone };
}

const ORDER_TONES: Record<string, HitTone> = {
  pending: "orange",
  paid: "blue",
  fulfilled: "green",
  cancelled: "red",
  refunded: "grey",
};

function can(roles: RoleFlags, role: AdminRole): boolean {
  return roles.super_admin || roles[role];
}

/**
 * Escape the wildcards PostgREST's `ilike` treats as special so a query
 * containing % or _ matches literally instead of everything.
 */
function likeTerm(query: string): string {
  return `%${query.replace(/[%_\\]/g, (c) => `\\${c}`)}%`;
}

const gbp = new Intl.NumberFormat("en-GB", { style: "currency", currency: "GBP" });

export async function GET(request: Request) {
  const query = new URL(request.url).searchParams.get("q")?.trim() ?? "";
  // Single characters match almost everything and cost a full round trip.
  if (query.length < 2) return NextResponse.json({ hits: [] });

  const cookieStore = await cookies();
  const {
    data: { user },
  } = await createClient(cookieStore).auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const supabase = createServiceClient();
  const roles = await getRoles(supabase, user.id);
  const term = likeTerm(query);

  // Each entry is [allowed, loader]. Everything runs in parallel and any
  // section that errors is simply left out — one bad table must not blank the
  // whole palette.
  const loaders: (() => Promise<AdminSearchHit[]>)[] = [];

  if (can(roles, "site_admin")) {
    loaders.push(async () => {
      const { data } = await supabase
        .from("posts")
        .select("id, title, slug, is_published")
        .or(`title.ilike.${term},slug.ilike.${term}`)
        .order("created_at", { ascending: false })
        .limit(PER_SECTION);
      return (data ?? []).map((p) => ({
        id: `post-${p.id}`,
        section: "Posts",
        title: p.title,
        subtitle: `/${p.slug}`,
        href: `/admin/posts?open=${p.id}`,
        icon: "article",
        badge: p.is_published
          ? ({ text: "Published", tone: "green" } as const)
          : ({ text: "Draft", tone: "grey" } as const),
      }));
    });

    loaders.push(async () => {
      const { data } = await supabase
        .from("redirects")
        .select("id, slug, target_url, label, active")
        .or(`slug.ilike.${term},label.ilike.${term},target_url.ilike.${term}`)
        .order("created_at", { ascending: false })
        .limit(PER_SECTION);
      return (data ?? []).map((r) => ({
        id: `redirect-${r.id}`,
        section: "Redirects",
        title: r.label || `/${r.slug}`,
        subtitle: `/${r.slug} → ${r.target_url}`,
        href: `/admin/redirects?q=${encodeURIComponent(r.slug)}`,
        icon: "alt_route",
        badge: r.active
          ? ({ text: "Active", tone: "green" } as const)
          : ({ text: "Off", tone: "grey" } as const),
      }));
    });
  }

  if (can(roles, "store_admin")) {
    loaders.push(async () => {
      const { data } = await supabase
        .from("products")
        .select("id, name, slug, category, is_published")
        .or(`name.ilike.${term},slug.ilike.${term},category.ilike.${term}`)
        .order("created_at", { ascending: false })
        .limit(PER_SECTION);
      return (data ?? []).map((p) => ({
        id: `product-${p.id}`,
        section: "Products",
        title: p.name,
        subtitle: p.category ?? "Product",
        href: `/admin/store/products/${p.id}`,
        icon: "inventory_2",
        badge: p.is_published
          ? ({ text: "Published", tone: "green" } as const)
          : ({ text: "Draft", tone: "grey" } as const),
      }));
    });

    loaders.push(async () => {
      const { data } = await supabase
        .from("orders")
        .select("id, order_number, customer_name, customer_email, status, total_pennies")
        .or(
          `order_number.ilike.${term},customer_name.ilike.${term},customer_email.ilike.${term}`,
        )
        .order("created_at", { ascending: false })
        .limit(PER_SECTION);
      return (data ?? []).map((o) => ({
        id: `order-${o.id}`,
        section: "Orders",
        title: `${o.order_number} — ${o.customer_name}`,
        subtitle: `${o.customer_email} · ${gbp.format((o.total_pennies ?? 0) / 100)}`,
        href: `/admin/store/orders/${o.id}`,
        icon: "receipt_long",
        badge: { text: o.status, tone: ORDER_TONES[o.status] ?? "grey" },
      }));
    });
  }

  if (can(roles, "training_admin")) {
    loaders.push(async () => {
      const { data } = await supabase
        .from("training_categories")
        .select("id, name, description, is_published")
        .or(`name.ilike.${term},description.ilike.${term}`)
        .limit(PER_SECTION);
      return (data ?? []).map((c) => ({
        id: `training-cat-${c.id}`,
        section: "Training",
        title: c.name,
        subtitle: c.description ?? "Category",
        href: `/admin/training/${c.id}`,
        icon: "school",
        badge: c.is_published
          ? ({ text: "Published", tone: "green" } as const)
          : ({ text: "Hidden", tone: "grey" } as const),
      }));
    });

    loaders.push(async () => {
      const { data } = await supabase
        .from("training_posts")
        .select("id, title, summary, is_published, subgroup_id, training_subgroups(category_id)")
        .or(`title.ilike.${term},summary.ilike.${term}`)
        .limit(PER_SECTION);
      return (data ?? []).map((p) => {
        const subgroup = p.training_subgroups as { category_id?: string } | null;
        const categoryId = subgroup?.category_id;
        return {
          id: `training-post-${p.id}`,
          section: "Training posts",
          title: p.title,
          subtitle: p.summary ?? "Training post",
          href: categoryId
            ? `/admin/training/${categoryId}/${p.subgroup_id}?open=${p.id}`
            : "/admin/training",
          icon: "menu_book",
          badge: p.is_published
            ? ({ text: "Published", tone: "green" } as const)
            : ({ text: "Draft", tone: "grey" } as const),
        };
      });
    });
  }

  if (can(roles, "event_admin")) {
    loaders.push(async () => {
      const { data } = await supabase
        .from("alpha_events")
        .select("id, type, start_date, location, active")
        .or(`location.ilike.${term},type.ilike.${term}`)
        .order("start_date", { ascending: false })
        .limit(PER_SECTION);
      // The admin page for an event is keyed off its course type.
      const PAGE: Record<string, string> = {
        alpha: "/admin/alpha",
        youth_alpha: "/admin/alpha",
        bible_course: "/admin/bible-course",
        cap_money: "/admin/cap-money",
        recovery: "/admin/recovery",
      };
      return (data ?? []).map((e) => ({
        id: `course-${e.id}`,
        section: "Course dates",
        title: `${e.type.replace(/_/g, " ")} — ${new Date(e.start_date).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}`,
        subtitle: e.location ?? "No location set",
        href: PAGE[e.type] ?? "/admin",
        icon: "event",
        badge: e.active
          ? ({ text: "Active", tone: "green" } as const)
          : ({ text: "Off", tone: "grey" } as const),
      }));
    });
  }

  if (roles.super_admin) {
    loaders.push(async () => {
      // admin_roles holds no email — the address lives in auth.users, so match
      // in memory over the (small) admin list rather than adding a view.
      const { data: authData } = await supabase.auth.admin.listUsers({
        page: 1,
        perPage: 200,
      });
      const needle = query.toLowerCase();
      return (authData?.users ?? [])
        .filter((u) => (u.email ?? "").toLowerCase().includes(needle))
        .slice(0, PER_SECTION)
        .map((u) => ({
          id: `user-${u.id}`,
          section: "Users",
          title: u.email ?? "(no email)",
          subtitle: "Admin login",
          href: `/admin/users?q=${encodeURIComponent(u.email ?? "")}`,
          icon: "group",
        }));
    });
  }

  const settled = await Promise.allSettled(loaders.map((load) => load()));
  const hits = settled.flatMap((r) => (r.status === "fulfilled" ? r.value : []));

  return NextResponse.json({ hits });
}
