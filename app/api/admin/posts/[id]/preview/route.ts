import { NextResponse } from "next/server";
import { createServiceClient } from "@/utils/supabase/service";
import { createPreviewToken } from "@/lib/postPreview.server";

/** A signed, hour-long URL that shows this post even while it's a draft. */
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const supabase = createServiceClient();
  const { data, error } = await supabase.from("posts").select("id, slug").eq("id", id).maybeSingle();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  if (!data) return NextResponse.json({ error: "Post not found" }, { status: 404 });

  const token = createPreviewToken(data.id);
  return NextResponse.json({ url: `/${data.slug}?preview=${encodeURIComponent(token)}` });
}
