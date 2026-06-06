import { NextResponse } from "next/server";
import { createServiceClient } from "@/utils/supabase/service";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const jobId = searchParams.get("job_id");

  const supabase = createServiceClient();
  let query = supabase
    .from("job_applications")
    .select("*")
    .order("created_at", { ascending: false });

  if (jobId) query = query.eq("job_id", jobId);

  const { data, error } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}
