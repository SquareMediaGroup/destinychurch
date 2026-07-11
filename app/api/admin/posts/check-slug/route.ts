import { NextResponse } from "next/server";
import { createServiceClient } from "@/utils/supabase/service";
import { checkSlug } from "@/lib/posts-slug";

// Live slug availability check for the editor. Returns 200 in all cases with
// `{ available, slug, reason? }` so the client can show inline feedback.
export async function GET(request: Request) {
  const url = new URL(request.url);
  const raw = url.searchParams.get("slug") ?? "";
  const excludeId = url.searchParams.get("excludeId") ?? undefined;

  const supabase = createServiceClient();
  const result = await checkSlug(supabase, raw, excludeId);

  if (result.ok) {
    return NextResponse.json({ available: true, slug: result.slug });
  }
  return NextResponse.json({ available: false, slug: result.slug, reason: result.reason });
}
