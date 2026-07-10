import { NextResponse } from "next/server";
import sharp from "sharp";
import { createServiceClient } from "@/utils/supabase/service";

export const runtime = "nodejs";
export const maxDuration = 60;

const MAX_BYTES = 10 * 1024 * 1024; // 10 MB
const ALLOWED = new Set([
  "image/png",
  "image/jpeg",
  "image/webp",
  "image/gif",
  "image/svg+xml",
]);

// POST — upload a hero background image. Converts raster images to a wide WebP
// (SVGs pass through untouched) and stores them in the public shop-hero-images
// bucket. Mirrors app/api/admin/store/products/[id]/images/route.ts.
export async function POST(request: Request) {
  const form = await request.formData();
  const file = form.get("file");

  if (!file || !(file instanceof File)) {
    return NextResponse.json({ error: "No file provided" }, { status: 400 });
  }
  if (file.size > MAX_BYTES) {
    return NextResponse.json({ error: "File exceeds 10 MB limit" }, { status: 413 });
  }
  if (!ALLOWED.has(file.type)) {
    return NextResponse.json({ error: "Unsupported file type" }, { status: 400 });
  }

  const supabase = createServiceClient();
  const rand = Math.random().toString(36).slice(2, 8);

  let buffer: Buffer = Buffer.from(await file.arrayBuffer());
  let contentType = file.type;
  let ext = "webp";

  if (file.type === "image/svg+xml") {
    contentType = "image/svg+xml";
    ext = "svg";
  } else {
    // Wide landscape crop-friendly WebP for a full-width hero.
    buffer = await sharp(buffer)
      .rotate()
      .resize(2400, 1600, { fit: "inside", withoutEnlargement: true })
      .webp({ quality: 82 })
      .toBuffer();
    contentType = "image/webp";
  }

  const path = `slides/${Date.now()}-${rand}.${ext}`;

  const { error } = await supabase.storage
    .from("shop-hero-images")
    .upload(path, buffer, { contentType, upsert: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const { data } = supabase.storage.from("shop-hero-images").getPublicUrl(path);
  return NextResponse.json({ url: data.publicUrl, path });
}
