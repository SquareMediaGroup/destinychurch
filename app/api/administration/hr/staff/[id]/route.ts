import { NextResponse } from "next/server";
import { createServiceClient } from "@/utils/supabase/service";
import { requireUser } from "@/lib/apiAuth";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const denied = await requireUser();
  if (denied) return denied;

  const { id } = await params;
  const supabase = createServiceClient();
  const { data, error } = await supabase
    .from("hr_staff")
    .select("*")
    .eq("id", id)
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 404 });
  return NextResponse.json(data);
}

const EDITABLE = [
  "first_name",
  "last_name",
  "email",
  "phone",
  "job_title",
  "department",
  "employment_type",
  "status",
  "start_date",
  "end_date",
  "annual_leave_entitlement",
  "notes",
] as const;

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const denied = await requireUser();
  if (denied) return denied;

  const { id } = await params;
  const body = await request.json();

  const update: Record<string, unknown> = {};
  for (const key of EDITABLE) {
    if (key in body) update[key] = body[key];
  }

  const supabase = createServiceClient();
  const { data, error } = await supabase
    .from("hr_staff")
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
  const denied = await requireUser();
  if (denied) return denied;

  const { id } = await params;
  const supabase = createServiceClient();
  const { error } = await supabase.from("hr_staff").delete().eq("id", id);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ success: true });
}
