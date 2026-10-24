import { NextResponse } from "next/server";
import { createServiceClient } from "@/utils/supabase/service";

/**
 * The image library: everything already uploaded to `post-media`, newest
 * first, so an image can be reused instead of uploaded again. Files are named
 * `<timestamp>-<random>.webp` by the upload route; the original file name is
 * only in the audit log, so the picker shows thumbnails rather than names.
 */
const PAGE = 60;

export async function GET(request: Request) {
  const offset = Math.max(0, Number(new URL(request.url).searchParams.get("offset")) || 0);
  const storage = createServiceClient().storage.from("post-media");
  const { data, error } = await storage.list("", {
    limit: PAGE + 1,
    offset,
    sortBy: { column: "created_at", order: "desc" },
  });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  const files = (data ?? []).filter((f) => f.id && /\.(webp|png|jpe?g|gif)$/i.test(f.name));
  return NextResponse.json({
    items: files.slice(0, PAGE).map((f) => ({
      name: f.name,
      url: storage.getPublicUrl(f.name).data.publicUrl,
      created_at: f.created_at,
    })),
    nextOffset: (data ?? []).length > PAGE ? offset + PAGE : null,
  });
}
