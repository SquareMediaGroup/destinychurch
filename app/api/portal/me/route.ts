import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createClient } from "@/utils/supabase/server";
import { createServiceClient } from "@/utils/supabase/service";
import { readPortalUser } from "@/lib/staffPortalAuth";
import { isValidEmail } from "@/lib/formEmail";

// middleware.ts already confirms the caller is a linked staff member before
// this runs, but readPortalUser() is called again here (not trusted from
// middleware) so this route never depends on request state it can't verify
// itself.
export async function GET() {
  const identity = await readPortalUser();
  if (!identity) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  return NextResponse.json(identity.staff);
}

// Self-service email and name change. Email changes go through
// auth.updateUser against the caller's own session — never the service
// client — so this can only ever change the email of whoever is signed in,
// the same way the password route can only ever change their own password.
// Name has no auth-side counterpart, so it's a plain hr_staff update scoped
// to identity.staff.id.
export async function PATCH(request: Request) {
  const identity = await readPortalUser();
  if (!identity) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const body = await request.json().catch(() => null);
  const service = createServiceClient();

  if (body?.first_name !== undefined || body?.last_name !== undefined) {
    const first_name = body.first_name?.toString().trim();
    const last_name = body.last_name?.toString().trim();
    if (!first_name || !last_name) {
      return NextResponse.json({ error: "Please enter your first and last name." }, { status: 400 });
    }
    await service.from("hr_staff").update({ first_name, last_name }).eq("id", identity.staff.id);
    return NextResponse.json({ success: true });
  }

  const email = body?.email?.toString().trim();
  if (!email || !isValidEmail(email)) {
    return NextResponse.json({ error: "Please enter a valid email address." }, { status: 400 });
  }

  const jar = await cookies();
  const supabase = createClient(jar);
  const { error } = await supabase.auth.updateUser({ email });
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });

  // hr_staff.email is the contact address shown across the HR module and
  // matched against public form submissions — update it now rather than
  // waiting on Supabase's confirmation email, since this is what the staff
  // member intends even before they click the confirmation link.
  await service.from("hr_staff").update({ email }).eq("id", identity.staff.id);

  return NextResponse.json({ success: true });
}
