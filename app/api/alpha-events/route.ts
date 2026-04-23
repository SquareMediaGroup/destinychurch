import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function GET() {
  try {
    const { data, error } = await supabase
      .from("alpha_events")
      .select("*")
      .eq("active", true)
      .order("start_date", { ascending: true });

    if (error) throw error;
    return Response.json(data || []);
  } catch (error) {
    return Response.json(
      { error: error instanceof Error ? error.message : "Failed to fetch events" },
      { status: 500 }
    );
  }
}
