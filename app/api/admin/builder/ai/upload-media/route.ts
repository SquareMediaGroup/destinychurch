import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import sharp from "sharp";
import {
  MAX_UPLOAD_SIZE_BYTES,
  ALLOWED_IMAGE_TYPES,
  IMAGE_VARIANTS,
} from "@/lib/ai/media-types";
import { requireUser } from "@/lib/apiAuth";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const BUCKET_NAME = "builder-media";

export const maxDuration = 60; // Allow longer for image processing

export async function POST(req: NextRequest) {
  const denied = await requireUser();
  if (denied) return denied;

  try {
    const formData = await req.formData();
    const file = formData.get("file") as File | null;

    if (!file) {
      return NextResponse.json(
        { error: "No file provided" },
        { status: 400 }
      );
    }

    // Validate file size
    if (file.size > MAX_UPLOAD_SIZE_BYTES) {
      return NextResponse.json(
        {
          error: `File too large. Maximum size is ${MAX_UPLOAD_SIZE_BYTES / 1024 / 1024}MB`,
        },
        { status: 400 }
      );
    }

    // Validate file type
    if (!ALLOWED_IMAGE_TYPES.includes(file.type)) {
      return NextResponse.json(
        {
          error: `Invalid file type. Allowed: ${ALLOWED_IMAGE_TYPES.join(", ")}`,
        },
        { status: 400 }
      );
    }

    // Convert File to Buffer for sharp
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // Get image metadata
    const metadata = await sharp(buffer).metadata();
    const originalWidth = metadata.width || 0;
    const originalHeight = metadata.height || 0;

    // Generate unique filename base (timestamp + random)
    const timestamp = Date.now();
    const random = Math.random().toString(36).substring(2, 10);
    const baseName = `${timestamp}-${random}`;

    // Generate variants
    const variants = await Promise.all([
      generateVariant(buffer, "hero", baseName),
      generateVariant(buffer, "general", baseName),
      generateVariant(buffer, "thumbnail", baseName),
      uploadOriginal(buffer, file, baseName),
    ]);

    const [heroResult, generalResult, thumbnailResult, originalResult] = variants;

    // Save metadata to database
    const { data: mediaRecord, error: dbError } = await supabase
      .from("builder_media")
      .insert({
        original_url: originalResult.url,
        hero_url: heroResult.url,
        general_url: generalResult.url,
        thumbnail_url: thumbnailResult.url,
        media_type: "image",
        source_type: "upload",
        width: originalWidth,
        height: originalHeight,
        size_bytes: file.size,
      })
      .select()
      .single();

    if (dbError) {
      console.error("Database error:", dbError);
      return NextResponse.json(
        { error: "Failed to save media metadata" },
        { status: 500 }
      );
    }

    return NextResponse.json({
      id: mediaRecord.id,
      originalUrl: originalResult.url,
      heroUrl: heroResult.url,
      generalUrl: generalResult.url,
      thumbnailUrl: thumbnailResult.url,
      width: originalWidth,
      height: originalHeight,
      sizeBytes: file.size,
    });
  } catch (error) {
    console.error("Upload error:", error);
    const message =
      error instanceof Error ? error.message : "Upload failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

async function generateVariant(
  buffer: Buffer,
  variant: keyof typeof IMAGE_VARIANTS,
  baseName: string
): Promise<{ url: string; path: string }> {
  const config = IMAGE_VARIANTS[variant];

  // Convert to webp with the specified dimensions
  const webpBuffer = await sharp(buffer)
    .resize(config.width, config.height, {
      fit: "cover",
      position: "center",
    })
    .webp({ quality: config.quality })
    .toBuffer();

  const path = `${variant}/${baseName}.webp`;

  const { error } = await supabase.storage
    .from(BUCKET_NAME)
    .upload(path, webpBuffer, {
      contentType: "image/webp",
      upsert: false,
    });

  if (error) {
    throw new Error(`Failed to upload ${variant} variant: ${error.message}`);
  }

  const { data: urlData } = supabase.storage
    .from(BUCKET_NAME)
    .getPublicUrl(path);

  return { url: urlData.publicUrl, path };
}

async function uploadOriginal(
  buffer: Buffer,
  file: File,
  baseName: string
): Promise<{ url: string; path: string }> {
  const ext = file.name.split(".").pop() || "jpg";
  const path = `original/${baseName}.${ext}`;

  const { error } = await supabase.storage
    .from(BUCKET_NAME)
    .upload(path, buffer, {
      contentType: file.type,
      upsert: false,
    });

  if (error) {
    throw new Error(`Failed to upload original: ${error.message}`);
  }

  const { data: urlData } = supabase.storage
    .from(BUCKET_NAME)
    .getPublicUrl(path);

  return { url: urlData.publicUrl, path };
}

// Update media metadata (purpose, description, alt text)
export async function PATCH(req: NextRequest) {
  const denied = await requireUser();
  if (denied) return denied;

  try {
    const body = (await req.json()) as {
      id: string;
      purpose?: string;
      description?: string;
      altText?: string;
    };

    if (!body.id) {
      return NextResponse.json(
        { error: "Media ID is required" },
        { status: 400 }
      );
    }

    const updates: Record<string, string> = {};
    if (body.purpose) updates.purpose = body.purpose;
    if (body.description) updates.description = body.description;
    if (body.altText) updates.alt_text = body.altText;

    const { data, error } = await supabase
      .from("builder_media")
      .update(updates)
      .eq("id", body.id)
      .select()
      .single();

    if (error) {
      return NextResponse.json(
        { error: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json({ media: data });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Update failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
