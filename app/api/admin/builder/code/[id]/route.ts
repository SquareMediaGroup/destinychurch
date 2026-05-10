import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/utils/supabase/service";

export const runtime = "nodejs";

// GET /api/admin/builder/code/[id] — load an AI-generated page row including
// its editable_texts catalog so the visual editor can render the form.
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const supabase = createServiceClient();
  const { data, error } = await supabase
    .from("builder_pages")
    .select(
      "id, slug, title, status, source_type, source_path, repo_commit, editable_texts, updated_at"
    )
    .eq("id", id)
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 404 });
  if (data.source_type !== "code") {
    return NextResponse.json(
      { error: "This page was not AI-generated; use the JSON builder instead." },
      { status: 400 }
    );
  }
  return NextResponse.json({ page: data });
}
