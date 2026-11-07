import { NextResponse } from "next/server";
import { createServiceClient } from "@/utils/supabase/service";

/**
 * A post's saved versions, newest first, without their content (a page body
 * times thirty is a lot to send for a list). The editor fetches one with
 * ./[revisionId] when it's picked.
 */
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const { data, error } = await createServiceClient()
    .from("post_revisions")
    .select("id, kind, created_by, created_at, title:snapshot->>title")
    .eq("post_id", id)
    .order("created_at", { ascending: false });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data ?? []);
}
