// One links page for the editor: read it (every block, live or not), and save
// it — page and whole block stack together, through link_page_save(), so a
// save either lands completely or not at all.

import { NextResponse } from "next/server";
import { createServiceClient } from "@/utils/supabase/service";
import { readForAudit, recordAudit } from "@/lib/audit.server";
import { LINK_BLOCK_COLUMNS, LINK_PAGE_COLUMNS, toPage } from "@/lib/linkPages/linkPages.server";
import { validateSave } from "@/lib/linkPages/save.server";

export const dynamic = "force-dynamic";

type Params = { params: Promise<{ id: string }> };

export async function GET(_request: Request, { params }: Params) {
  const { id } = await params;
  const supabase = createServiceClient();

  const { data: row, error } = await supabase
    .from("link_pages")
    .select(`${LINK_PAGE_COLUMNS}, updated_at`)
    .eq("id", id)
    .maybeSingle();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  if (!row) return NextResponse.json({ error: "Page not found" }, { status: 404 });

  const { data: blocks } = await supabase
    .from("link_blocks")
    .select(LINK_BLOCK_COLUMNS)
    .eq("page_id", id)
    .order("sort_order", { ascending: true });

  // Blocks go back raw rather than parsed: one that no longer validates still
  // has to show up in the editor so someone can fix it.
  return NextResponse.json({
    page: toPage(row as Record<string, unknown>),
    updatedAt: row.updated_at,
    blocks: (blocks ?? []).map((b) => ({
      id: b.id,
      type: b.type,
      data: b.data ?? {},
      active: b.active,
      starts_at: b.starts_at,
      ends_at: b.ends_at,
    })),
  });
}

export async function PUT(request: Request, { params }: Params) {
  const { id } = await params;
  const input = (await request.json().catch(() => ({}))) as {
    page?: unknown;
    blocks?: unknown;
    /** The updated_at the editor loaded — the save is refused if it has moved. */
    updatedAt?: string | null;
  };

  const existing = await readForAudit("link_pages", id);
  if (!existing) return NextResponse.json({ error: "Page not found" }, { status: 404 });

  // Two people editing one page would otherwise silently overwrite each other,
  // since a save replaces the whole block stack. Refuse the stale one instead.
  if (
    input.updatedAt &&
    existing.updated_at &&
    Date.parse(String(existing.updated_at)) !== Date.parse(input.updatedAt)
  ) {
    return NextResponse.json(
      {
        error:
          "Someone else saved this page since you opened it. Reload to see their changes — your edits here haven't been saved.",
        conflict: true,
      },
      { status: 409 },
    );
  }

  const validated = await validateSave(input, { slug: String(existing.slug) });
  if ("error" in validated) return NextResponse.json({ error: validated.error }, { status: 400 });

  const { page, blocks } = validated;
  const supabase = createServiceClient();
  const { error } = await supabase.rpc("link_page_save", {
    p_page_id: id,
    p_page: page,
    p_blocks: blocks,
  });

  if (error) {
    const taken = error.code === "23505";
    return NextResponse.json(
      { error: taken ? `/links/${page.slug} is already taken — pick another address.` : error.message },
      { status: taken ? 409 : 500 },
    );
  }

  const path = page.slug === "main" ? "/links" : `/links/${page.slug}`;
  await recordAudit({
    action: "update",
    section: "announcements",
    entity: "links page",
    entityId: id,
    entityLabel: page.title || path,
    summary: `Edited the links page ${path} (${blocks.length} block${blocks.length === 1 ? "" : "s"})`,
    before: existing,
    after: { ...page, blocks: blocks.length },
  });

  const { data: saved } = await supabase.from("link_pages").select("updated_at").eq("id", id).maybeSingle();
  return NextResponse.json({ ok: true, blocks, updatedAt: saved?.updated_at ?? null });
}
