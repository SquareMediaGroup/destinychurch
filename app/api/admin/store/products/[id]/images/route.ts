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

// POST — upload a product image. Converts raster images to WebP (SVGs pass
// through untouched) and stores them in the public product-images bucket.
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
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
    // Keep vectors as-is.
    contentType = "image/svg+xml";
    ext = "svg";
  } else {
    // Normalise to a reasonably-sized WebP for the storefront.
    buffer = await sharp(buffer)
      .rotate()
      .resize(1600, 1600, { fit: "inside", withoutEnlargement: true })
      .webp({ quality: 82 })
      .toBuffer();
    contentType = "image/webp";
  }

  const path = `products/${id}/${Date.now()}-${rand}.${ext}`;

  const { error } = await supabase.storage
    .from("product-images")
    .upload(path, buffer, { contentType, upsert: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const { data } = supabase.storage.from("product-images").getPublicUrl(path);
  return NextResponse.json({ url: data.publicUrl, path, alt: "" });
}

// DELETE — remove an uploaded image file by its storage path (?path=...).
export async function DELETE(request: Request) {
  const { searchParams } = new URL(request.url);
  const path = searchParams.get("path");
  if (!path) {
    return NextResponse.json({ error: "Missing path" }, { status: 400 });
  }

  const supabase = createServiceClient();
  const { error } = await supabase.storage.from("product-images").remove([path]);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ success: true });
}
