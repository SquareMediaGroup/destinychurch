import { NextResponse } from "next/server";
import { createServiceClient } from "@/utils/supabase/service";

/**
 * One saved version's content. Restoring is done in the editor — it loads the
 * snapshot into the form, unsaved — so nothing changes until the admin saves
 * or publishes, which is the normal, audited path.
 */
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string; revisionId: string }> },
) {
  const { id, revisionId } = await params;
  const { data, error } = await createServiceClient()
    .from("post_revisions")
    .select("id, kind, created_by, created_at, snapshot")
    .eq("post_id", id)
    .eq("id", revisionId)
    .maybeSingle();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  if (!data) return NextResponse.json({ error: "That version no longer exists." }, { status: 404 });
  return NextResponse.json(data);
}
