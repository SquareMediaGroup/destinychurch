import { NextResponse } from "next/server";
import { createServiceClient } from "@/utils/supabase/service";
import { readPortalUser } from "@/lib/staffPortalAuth";

// A staff member's own design requests.
//
// Scoped two ways deliberately: the staff link covers requests filed while
// signed in, and the email match covers ones filed from the public form while
// signed out — which is the common case, and without it the portal list would
// be quietly missing exactly the requests people most expect to find.
//
// Both scopes come from the session's own hr_staff row. Nothing here reads an
// id from the request.
export async function GET() {
  const identity = await readPortalUser();
  if (!identity) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const supabase = createServiceClient();

  const filters = [`requester_staff_id.eq.${identity.staff.id}`];
  if (identity.staff.email) {
    filters.push(`requester_email.ilike.${identity.staff.email}`);
  }

  const { data, error } = await supabase
    .from("design_tickets")
    .select(
      "id, ref, title, category, status, revision, priority, needed_by, share_token, assignee_name, created_at, delivered_at",
    )
    .or(filters.join(","))
    .order("created_at", { ascending: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}
