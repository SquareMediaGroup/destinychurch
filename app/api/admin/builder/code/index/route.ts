import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createClient } from "@/utils/supabase/server";
import { createServiceClient } from "@/utils/supabase/service";
import { listCodePages } from "@/lib/ai/code-page-source";

export const runtime = "nodejs";

/**
 * POST /api/admin/builder/code/index
 *
 * Walk app/<slug>/page.tsx and insert a builder_pages row for every page
 * that doesn't already have one. Used to backfill AI-generated pages that
 * existed before the dashboard registration step was added (or any hand-written
 * page the volunteer wants to manage from the builder).
 */
export async function POST(_req: NextRequest) {
  const supabaseAuth = createClient(await cookies());
  const {
    data: { user },
  } = await supabaseAuth.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const pages = await listCodePages();

  const supabase = createServiceClient();
  // Single lookup — which slugs already exist?
  const { data: existing, error: lookupError } = await supabase
    .from("builder_pages")
    .select("slug, source_type")
    .in(
      "slug",
      pages.map((p) => p.slug)
    );
  if (lookupError) {
    return NextResponse.json(
      { error: `Lookup failed: ${lookupError.message}` },
      { status: 500 }
    );
  }
  const existingBySlug = new Map(
    (existing ?? []).map((r) => [r.slug, r.source_type])
  );

  const toInsert: Array<{
    slug: string;
    title: string;
    source_type: "code";
    source_path: string;
    editable_texts: never[];
    layout_json: never[];
    status: "published";
    published_at: string;
  }> = [];
  const toUpdate: Array<{ slug: string; title: string; source_path: string }> = [];
  const skipped: string[] = [];

  for (const p of pages) {
    const present = existingBySlug.get(p.slug);
    if (!present) {
      toInsert.push({
        slug: p.slug,
        title: p.title,
        source_type: "code",
        source_path: p.sourcePath,
        editable_texts: [],
        layout_json: [],
        status: "published",
        published_at: new Date().toISOString(),
      });
    } else if (present === "json") {
      // A JSON-builder row already owns this slug; leave it alone.
      skipped.push(`${p.slug} (JSON builder owns this slug)`);
    } else {
      // Already registered as code — patch title/source_path in case they drifted.
      toUpdate.push({
        slug: p.slug,
        title: p.title,
        source_path: p.sourcePath,
      });
    }
  }

  let inserted = 0;
  let updated = 0;

  if (toInsert.length > 0) {
    const { error: insertError, count } = await supabase
      .from("builder_pages")
      .insert(toInsert, { count: "exact" });
    if (insertError) {
      return NextResponse.json(
        { error: `Insert failed: ${insertError.message}` },
        { status: 500 }
      );
    }
    inserted = count ?? toInsert.length;
  }

  for (const u of toUpdate) {
    const { error: upError } = await supabase
      .from("builder_pages")
      .update({ title: u.title, source_path: u.source_path })
      .eq("slug", u.slug)
      .eq("source_type", "code");
    if (!upError) updated++;
  }

  return NextResponse.json({
    ok: true,
    scanned: pages.length,
    inserted,
    updated,
    skipped,
  });
}
