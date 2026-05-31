import { NextResponse } from "next/server";
import { createServiceClient } from "@/utils/supabase/service";

export async function GET() {
  const supabase = createServiceClient();
  const { data, error } = await supabase
    .from("hr_staff")
    .select("*")
    .order("last_name", { ascending: true });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}

export async function POST(request: Request) {
  const body = await request.json();
  const first_name = body.first_name?.trim();
  const last_name = body.last_name?.trim();

  if (!first_name || !last_name) {
    return NextResponse.json(
      { error: "First and last name are required" },
      { status: 400 },
    );
  }

  const supabase = createServiceClient();
  const { data, error } = await supabase
    .from("hr_staff")
    .insert({
      first_name,
      last_name,
      email: body.email?.trim() || null,
      phone: body.phone?.trim() || null,
      job_title: body.job_title?.trim() || null,
      department: body.department?.trim() || null,
      employment_type: body.employment_type || "full_time",
      status: body.status || "active",
      start_date: body.start_date || null,
      end_date: body.end_date || null,
      annual_leave_entitlement: body.annual_leave_entitlement ?? 0,
      notes: body.notes?.trim() || null,
    })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data, { status: 201 });
}
