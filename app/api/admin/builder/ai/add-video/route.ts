import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { validateVideoUrl } from "@/lib/ai/media-types";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as {
      url: string;
      purpose?: string;
      description?: string;
    };

    if (!body.url) {
      return NextResponse.json(
        { error: "Video URL is required" },
        { status: 400 }
      );
    }

    // Validate URL
    const validation = validateVideoUrl(body.url);
    if (!validation.valid) {
      return NextResponse.json(
        { error: validation.error },
        { status: 400 }
      );
    }

    // Save to database
    const { data: mediaRecord, error: dbError } = await supabase
      .from("builder_media")
      .insert({
        external_url: body.url,
        thumbnail_url: validation.thumbnailUrl || null,
        media_type: "video",
        source_type: validation.source,
        purpose: body.purpose || null,
        description: body.description || null,
      })
      .select()
      .single();

    if (dbError) {
      console.error("Database error:", dbError);
      return NextResponse.json(
        { error: "Failed to save video metadata" },
        { status: 500 }
      );
    }

    return NextResponse.json({
      id: mediaRecord.id,
      externalUrl: body.url,
      sourceType: validation.source,
      thumbnailUrl: validation.thumbnailUrl,
      videoId: validation.videoId,
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to add video";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
