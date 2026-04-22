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

export async function POST(req: Request) {
  try {
    const { type, start_date, signup_url, location, active } = await req.json();

    if (!type || !start_date || !signup_url) {
      return Response.json(
        { error: "Missing required fields: type, start_date, signup_url" },
        { status: 400 }
      );
    }

    const { data, error } = await supabase
      .from("alpha_events")
      .insert({
        type,
        start_date,
        signup_url,
        location: location || null,
        active: active ?? true,
      })
      .select()
      .single();

    if (error) throw error;
    return Response.json(data, { status: 201 });
  } catch (error) {
    return Response.json(
      { error: error instanceof Error ? error.message : "Failed to create event" },
      { status: 500 }
    );
  }
}
