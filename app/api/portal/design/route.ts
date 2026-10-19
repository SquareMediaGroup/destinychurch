import { NextResponse } from "next/server";
import { createServiceClient } from "@/utils/supabase/service";
import { readPortalUser } from "@/lib/staffPortalAuth";

const COLUMNS =
  "id, ref, title, category, status, revision, priority, needed_by, share_token, assignee_name, created_at, delivered_at, requester_email";

// A staff member's own design requests.
//
// Scoped two ways deliberately: the staff link covers requests filed while
// signed in, and the email match covers ones filed from the public form while
// signed out — which is the common case, and without it the portal list would
// be quietly missing exactly the requests people most expect to find.
//
// Both scopes come from the session's own hr_staff row. Nothing here reads an
// id from the request.
//
// The email is never interpolated into an `.or()` filter string or used as a
// LIKE pattern: hr_staff.email is self-editable and isValidEmail accepts `,`,
// `%`, `_` and `*`, so `%@%.%` (or a `,`-smuggled extra filter) would have
// listed every ticket and its share token. The email query runs on its own
// and the match is then made exact (case-insensitive) here.
export async function GET() {
  const identity = await readPortalUser();
  if (!identity) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const supabase = createServiceClient();

  const byStaff = supabase
    .from("design_tickets")
    .select(COLUMNS)
    .eq("requester_staff_id", identity.staff.id);

  const email = identity.staff.email?.trim().toLowerCase();
  const byEmail = email
    ? supabase.from("design_tickets").select(COLUMNS).ilike("requester_email", email)
    : null;

  const [staffRes, emailRes] = await Promise.all([byStaff, byEmail]);
  const error = staffRes.error ?? emailRes?.error;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const seen = new Set<string>();
  const rows = [
    ...(staffRes.data ?? []),
    ...(emailRes?.data ?? []).filter((t) => t.requester_email?.toLowerCase() === email),
  ]
    .filter((t) => (seen.has(t.id) ? false : (seen.add(t.id), true)))
    .sort((a, b) => (a.created_at < b.created_at ? 1 : a.created_at > b.created_at ? -1 : 0))
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    .map(({ requester_email, ...rest }) => rest);

  return NextResponse.json(rows);
}
