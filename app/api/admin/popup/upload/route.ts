import { NextResponse } from "next/server";
import { createServiceClient } from "@/utils/supabase/service";
import { requireUser } from "@/lib/apiAuth";

export const runtime = "nodejs";
export const maxDuration = 60;

const MAX_BYTES = 50 * 1024 * 1024; // 50 MB
const ALLOWED = new Set([
  "image/png",
  "image/jpeg",
  "image/webp",
  "image/gif",
  "image/svg+xml",
]);

export async function POST(request: Request) {
  const denied = await requireUser();
  if (denied) return denied;

  const form = await request.formData();
  const file = form.get("file");

  if (!file || !(file instanceof File)) {
    return NextResponse.json({ error: "No file provided" }, { status: 400 });
  }

  if (file.size > MAX_BYTES) {
    return NextResponse.json(
      { error: "File exceeds 50 MB limit" },
      { status: 413 }
    );
  }

  if (!ALLOWED.has(file.type)) {
    return NextResponse.json(
      { error: "Unsupported file type" },
      { status: 400 }
    );
  }

  const ext = file.name.includes(".")
    ? file.name.split(".").pop()!.toLowerCase()
    : "bin";
  const path = `popup-${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;

  const supabase = createServiceClient();
  const buffer = Buffer.from(await file.arrayBuffer());

  const { error } = await supabase.storage
    .from("popup-images")
    .upload(path, buffer, {
      contentType: file.type,
      upsert: false,
    });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const { data } = supabase.storage.from("popup-images").getPublicUrl(path);

  return NextResponse.json({ url: data.publicUrl, path });
}
