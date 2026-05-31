import { NextResponse } from "next/server";
import { createServiceClient } from "@/utils/supabase/service";

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const body = await request.json();

  const update: Record<string, unknown> = {};
  for (const key of [
    "review_date",
    "type",
    "reviewer",
    "summary",
    "next_review_date",
  ]) {
    if (key in body) update[key] = body[key];
  }

  const supabase = createServiceClient();
  const { data, error } = await supabase
    .from("hr_reviews")
    .update(update)
    .eq("id", id)
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const supabase = createServiceClient();
  const { error } = await supabase.from("hr_reviews").delete().eq("id", id);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ success: true });
}
