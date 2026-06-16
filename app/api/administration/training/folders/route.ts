import { NextResponse } from "next/server";
import { createServiceClient } from "@/utils/supabase/service";

export async function GET(request: Request) {
  const subgroupId = new URL(request.url).searchParams.get("subgroup_id");
  const supabase = createServiceClient();
  let query = supabase
    .from("training_folders")
    .select("*")
    .order("sort_order", { ascending: true })
    .order("created_at", { ascending: true });
  if (subgroupId) query = query.eq("subgroup_id", subgroupId);

  const { data, error } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}

export async function POST(request: Request) {
  const body = await request.json();
  const name = body.name?.trim();
  const subgroupId = body.subgroup_id;

  if (!name) {
    return NextResponse.json({ error: "A folder name is required" }, { status: 400 });
  }
  if (!subgroupId) {
    return NextResponse.json({ error: "A sub-group is required" }, { status: 400 });
  }

  const supabase = createServiceClient();

  const { data: folders } = await supabase
    .from("training_folders")
    .select("sort_order")
    .eq("subgroup_id", subgroupId)
    .order("sort_order", { ascending: false })
    .limit(1);
  const nextOrder = folders && folders.length > 0 ? folders[0].sort_order + 1 : 0;

  const { data, error } = await supabase
    .from("training_folders")
    .insert({
      subgroup_id: subgroupId,
      name,
      sort_order: body.sort_order ?? nextOrder,
    })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data, { status: 201 });
}
