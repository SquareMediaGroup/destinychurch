import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createClient } from "@/utils/supabase/server";
import { createServiceClient } from "@/utils/supabase/service";
import { getRoles } from "@/lib/adminRoles";

// Lets the sidebar (and any other client component) know which sections the
// signed-in admin can see. Not itself an authorization boundary — that's
// enforced by middleware.ts on every request.
export async function GET() {
  const cookieStore = await cookies();
  const supabase = createClient(cookieStore);
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const roles = await getRoles(createServiceClient(), user.id);
  return NextResponse.json(roles);
}
