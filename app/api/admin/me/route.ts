import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createClient } from "@/utils/supabase/server";
import { createServiceClient } from "@/utils/supabase/service";
import { getRoles } from "@/lib/adminRoles";

// Who is signed in, plus their roles, in one request.
//
// The admin chrome previously showed no identity at all — on a shared office
// machine there was no way to tell whose session you were about to publish
// with. The header now shows the signed-in address, and the sidebar/palette
// reuse the roles from the same call instead of a second round trip to
// /api/admin/me/roles (which stays for existing callers).
//
// Not an authorization boundary: middleware.ts already decided this request is
// from a signed-in admin. Returning the caller's own email and role flags tells
// them nothing they don't already have.

export const dynamic = "force-dynamic";

export async function GET() {
  const cookieStore = await cookies();
  const {
    data: { user },
  } = await createClient(cookieStore).auth.getUser();

  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const roles = await getRoles(createServiceClient(), user.id);

  return NextResponse.json({
    email: user.email ?? null,
    id: user.id,
    roles,
  });
}
