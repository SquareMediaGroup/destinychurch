import { NextResponse } from "next/server";
import { createServiceClient } from "@/utils/supabase/service";

// GET /api/admin/builder/pages — list all builder pages
export async function GET() {
  const supabase = createServiceClient();
  const { data, error } = await supabase
    .from("builder_pages")
    .select(
      "id, slug, title, status, source_type, source_path, repo_commit, created_at, updated_at, published_at"
    )
    .order("updated_at", { ascending: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ pages: data ?? [] });
}
