import { NextRequest, NextResponse } from "next/server";
import sharp from "sharp";
import { createServiceClient } from "@/utils/supabase/service";
import { MAX_UPLOAD_SIZE_BYTES, ALLOWED_IMAGE_TYPES } from "@/lib/ai/media-types";

const BUCKET_NAME = "post-media";
const MAX_WIDTH = 1600; // plenty for full-width content; keeps files small

export const maxDuration = 60; // allow longer for image processing

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get("file") as File | null;

    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }
    if (file.size > MAX_UPLOAD_SIZE_BYTES) {
      return NextResponse.json(
        { error: `File too large. Maximum size is ${MAX_UPLOAD_SIZE_BYTES / 1024 / 1024}MB` },
        { status: 400 },
      );
    }
    if (!ALLOWED_IMAGE_TYPES.includes(file.type)) {
      return NextResponse.json(
        { error: `Invalid file type. Allowed: ${ALLOWED_IMAGE_TYPES.join(", ")}` },
        { status: 400 },
      );
    }

    const buffer = Buffer.from(await file.arrayBuffer());

    // Convert to WebP, downscaling only if wider than MAX_WIDTH.
    const webp = await sharp(buffer)
      .rotate() // respect EXIF orientation
      .resize({ width: MAX_WIDTH, withoutEnlargement: true })
      .webp({ quality: 82 })
      .toBuffer();

    const baseName = `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
    const path = `${baseName}.webp`;

    const supabase = createServiceClient();
    const { error: uploadError } = await supabase.storage
      .from(BUCKET_NAME)
      .upload(path, webp, { contentType: "image/webp", upsert: false });

    if (uploadError) {
      console.error("Post image upload error:", uploadError.message);
      return NextResponse.json({ error: "Failed to upload image" }, { status: 500 });
    }

    const { data: urlData } = supabase.storage.from(BUCKET_NAME).getPublicUrl(path);
    return NextResponse.json({ url: urlData.publicUrl });
  } catch (error) {
    console.error("Post image upload error:", error);
    const message = error instanceof Error ? error.message : "Upload failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
