// The list of links pages: read with 30-day numbers, create (blank from a
// preset, or a copy of an existing page), delete.
//
// Auth comes free: middleware.ts matches /api/admin/:path* and ROUTE_RULES
// gives this to event_admin. Service client for every read and write, per the
// repo's no-write-policies RLS convention.

import { NextResponse } from "next/server";
import { createServiceClient } from "@/utils/supabase/service";
import { readForAudit, recordAudit } from "@/lib/audit.server";
import { rangeStart } from "@/lib/audit";
import { THEME_PRESETS, DEFAULT_THEME } from "@/lib/linkPages/theme";
import { LINK_BLOCK_COLUMNS, LINK_PAGE_COLUMNS } from "@/lib/linkPages/linkPages.server";
import { MAIN_SLUG, SLUG_RE } from "@/lib/linkPages/types";

export const dynamic = "force-dynamic";

export async function GET() {
  const supabase = createServiceClient();
  const { data: pages, error } = await supabase
    .from("link_pages")
    .select(`${LINK_PAGE_COLUMNS}, updated_at`)
    .order("created_at", { ascending: true });

  if (error) {
    const missing = /link_pages/.test(error.message) && /does not exist|schema cache/i.test(error.message);
    return NextResponse.json(
      {
        error: missing
          ? "The links pages tables aren't there yet — run supabase/migrations/20260922_01_link_pages.sql."
          : error.message,
      },
      { status: missing ? 503 : 500 },
    );
  }

  const { data: blocks } = await supabase.from("link_blocks").select("id, page_id");
  const since = rangeStart("month")!;

  // Two counts per page. There are a handful of pages, and head-only counts
  // are cheap, so this stays simpler than a bespoke rollup function.
  const rows = await Promise.all(
    (pages ?? []).map(async (page) => {
      const blockIds = (blocks ?? []).filter((b) => b.page_id === page.id).map((b) => b.id as string);
      const [views, clicks] = await Promise.all([
        supabase
          .from("engagement_events")
          .select("id", { count: "exact", head: true })
          .eq("source", "links_view")
          .eq("target_key", page.id)
          .eq("is_bot", false)
          .gte("created_at", since),
        blockIds.length
          ? supabase
              .from("engagement_events")
              .select("id", { count: "exact", head: true })
              .eq("source", "links")
              .in("target_key", blockIds)
              .eq("is_bot", false)
              .gte("created_at", since)
          : Promise.resolve({ count: 0 }),
      ]);
      return {
        id: page.id,
        slug: page.slug,
        title: page.title,
        published: page.published,
        noindex: page.noindex,
        theme: page.theme,
        avatar_url: page.avatar_url,
        updated_at: page.updated_at,
        blockCount: blockIds.length,
        views30: views.count ?? 0,
        clicks30: clicks.count ?? 0,
      };
    }),
  );

  return NextResponse.json({ pages: rows });
}

export async function POST(request: Request) {
  const input = (await request.json().catch(() => ({}))) as {
    slug?: string;
    title?: string;
    preset?: string;
    duplicateFrom?: string;
  };

  const slug = String(input.slug ?? "").trim().toLowerCase();
  const title = String(input.title ?? "").trim().slice(0, 80);
  if (!SLUG_RE.test(slug))
    return NextResponse.json(
      { error: "The address can use lowercase letters, numbers and dashes (up to 48)." },
      { status: 400 },
    );
  if (slug === MAIN_SLUG)
    return NextResponse.json({ error: "“main” is reserved for /links itself." }, { status: 400 });

  const supabase = createServiceClient();

  let pageRow: Record<string, unknown> = {
    slug,
    title,
    theme: (THEME_PRESETS.find((p) => p.key === input.preset) ?? THEME_PRESETS[0]).theme ?? DEFAULT_THEME,
    published: false,
  };
  let sourceBlocks: Record<string, unknown>[] = [];

  if (input.duplicateFrom) {
    const { data: source } = await supabase
      .from("link_pages")
      .select(LINK_PAGE_COLUMNS)
      .eq("id", input.duplicateFrom)
      .maybeSingle();
    if (!source) return NextResponse.json({ error: "The page to copy wasn't found." }, { status: 404 });

    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { id: _id, slug: _slug, ...rest } = source as Record<string, unknown>;
    pageRow = { ...rest, slug, title: title || String(rest.title ?? ""), published: false };

    const { data } = await supabase
      .from("link_blocks")
      .select(LINK_BLOCK_COLUMNS)
      .eq("page_id", input.duplicateFrom)
      .order("sort_order", { ascending: true });
    sourceBlocks = (data ?? []) as Record<string, unknown>[];
  }

  const { data: created, error } = await supabase.from("link_pages").insert(pageRow).select("id, slug, title").single();

  if (error) {
    const taken = error.code === "23505";
    return NextResponse.json(
      { error: taken ? `/links/${slug} is already taken — pick another address.` : error.message },
      { status: taken ? 409 : 500 },
    );
  }

  if (sourceBlocks.length) {
    const { error: blocksError } = await supabase.from("link_blocks").insert(
      sourceBlocks.map((b) => ({
        page_id: created.id,
        sort_order: b.sort_order,
        type: b.type,
        data: b.data,
        active: b.active,
        starts_at: b.starts_at,
        ends_at: b.ends_at,
      })),
    );
    if (blocksError) return NextResponse.json({ error: blocksError.message }, { status: 500 });
  }

  await recordAudit({
    action: "create",
    section: "announcements",
    entity: "links page",
    entityId: created.id,
    entityLabel: created.title || `/links/${created.slug}`,
    summary: input.duplicateFrom
      ? `Created the links page /links/${created.slug} as a copy of another page`
      : `Created the links page /links/${created.slug}`,
    after: created,
  });

  return NextResponse.json(created, { status: 201 });
}

export async function DELETE(request: Request) {
  const id = new URL(request.url).searchParams.get("id");
  if (!id) return NextResponse.json({ error: "Missing id" }, { status: 400 });

  const existing = await readForAudit("link_pages", id);
  if (!existing) return NextResponse.json({ error: "Page not found" }, { status: 404 });
  if (existing.slug === MAIN_SLUG)
    return NextResponse.json({ error: "The main /links page can't be deleted." }, { status: 400 });

  // Blocks and form submissions cascade with the page.
  const { error } = await createServiceClient().from("link_pages").delete().eq("id", id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  await recordAudit({
    action: "delete",
    section: "announcements",
    entity: "links page",
    entityId: id,
    entityLabel: (existing.title as string) || `/links/${existing.slug}`,
    summary: `Deleted the links page /links/${existing.slug} and its form submissions`,
    before: existing,
  });

  return NextResponse.json({ ok: true });
}
