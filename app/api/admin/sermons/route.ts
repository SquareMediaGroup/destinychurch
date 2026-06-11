import { NextResponse } from "next/server";
import { createServiceClient } from "@/utils/supabase/service";
import { requireUser } from "@/lib/apiAuth";

export async function GET() {
  const denied = await requireUser();
  if (denied) return denied;

  const supabase = createServiceClient();
  const { data, error } = await supabase
    .from("hidden_videos")
    .select("video_id, hidden_at")
    .order("hidden_at", { ascending: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}
