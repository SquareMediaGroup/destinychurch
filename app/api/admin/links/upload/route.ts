// Image uploads for the links page editor — avatars, thumbnails, image
// blocks, cover and background images.
//
// Its own route rather than /api/admin/posts/upload because that one is
// site_admin-only and links pages belong to event_admin. Same pipeline, though:
// EXIF-rotate, downscale, re-encode to WebP, into the public `post-media`
// bucket under a `links-` prefix. 2000px rather than 1600px because a page
// background is shown full-bleed on desktop.

import { NextRequest, NextResponse } from "next/server";
import sharp from "sharp";
import { createServiceClient } from "@/utils/supabase/service";
import { ALLOWED_IMAGE_TYPES, MAX_UPLOAD_SIZE_BYTES, MAX_UPLOAD_SIZE_MB } from "@/lib/ai/media-types";
import { recordAudit } from "@/lib/audit.server";

const BUCKET = "post-media";
const MAX_WIDTH = 2000;

export const runtime = "nodejs";
export const maxDuration = 60;

export async function POST(req: NextRequest) {
  try {
    const form = await req.formData();
    const file = form.get("file");
    if (!(file instanceof File)) return NextResponse.json({ error: "No file provided" }, { status: 400 });
    if (file.size > MAX_UPLOAD_SIZE_BYTES)
      return NextResponse.json({ error: `File too large. Maximum size is ${MAX_UPLOAD_SIZE_MB}MB` }, { status: 400 });
    if (!ALLOWED_IMAGE_TYPES.includes(file.type))
      return NextResponse.json({ error: `Invalid file type. Allowed: ${ALLOWED_IMAGE_TYPES.join(", ")}` }, { status: 400 });

    const webp = await sharp(Buffer.from(await file.arrayBuffer()))
      .rotate()
      .resize({ width: MAX_WIDTH, withoutEnlargement: true })
      .webp({ quality: 82 })
      .toBuffer();

    const path = `links-${Date.now()}-${Math.random().toString(36).slice(2, 10)}.webp`;
    const supabase = createServiceClient();
    const { error } = await supabase.storage
      .from(BUCKET)
      .upload(path, webp, { contentType: "image/webp", upsert: false });
    if (error) {
      console.error("⚠️ Links image upload failed:", error.message);
      return NextResponse.json({ error: "Failed to upload image" }, { status: 500 });
    }

    const { data } = supabase.storage.from(BUCKET).getPublicUrl(path);

    await recordAudit({
      action: "upload",
      section: "announcements",
      entity: "image",
      entityId: path,
      entityLabel: file.name,
      summary: `Uploaded the image “${file.name}” for a links page`,
      metadata: { path, url: data.publicUrl, bytes: file.size },
    });

    return NextResponse.json({ url: data.publicUrl });
  } catch (err) {
    console.error("⚠️ Links image upload threw:", err);
    return NextResponse.json({ error: err instanceof Error ? err.message : "Upload failed" }, { status: 500 });
  }
}
