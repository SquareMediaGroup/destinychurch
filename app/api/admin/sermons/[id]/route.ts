import { NextResponse } from "next/server";
import { createServiceClient } from "@/utils/supabase/service";
import { requireUser } from "@/lib/apiAuth";

export async function POST(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const denied = await requireUser();
  if (denied) return denied;

  const { id } = await params;
  if (!id) return NextResponse.json({ error: "Missing video id" }, { status: 400 });

  const supabase = createServiceClient();
  const { error } = await supabase
    .from("hidden_videos")
    .insert({ video_id: id });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
