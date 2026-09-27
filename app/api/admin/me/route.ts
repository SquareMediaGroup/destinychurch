import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createClient } from "@/utils/supabase/server";
import { createServiceClient } from "@/utils/supabase/service";
import { getRoles } from "@/lib/adminRoles";
import { recordAudit } from "@/lib/audit.server";

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

  const service = createServiceClient();
  const roles = await getRoles(service, user.id);
  const { data: profile } = await service
    .from("admin_roles")
    .select("name, avatar_url")
    .eq("auth_user_id", user.id)
    .maybeSingle();

  return NextResponse.json({
    email: user.email ?? null,
    id: user.id,
    roles,
    name: profile?.name ?? null,
    avatar_url: profile?.avatar_url ?? null,
  });
}

// Self-service name change. No auth-side counterpart, so it's a plain
// admin_roles update scoped to the caller's own auth_user_id.
export async function PATCH(request: Request) {
  const cookieStore = await cookies();
  const {
    data: { user },
  } = await createClient(cookieStore).auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await request.json().catch(() => null);
  const name = body?.name?.toString().trim();
  if (!name) {
    return NextResponse.json({ error: "Please enter your name." }, { status: 400 });
  }

  const service = createServiceClient();
  const { data: before } = await service
    .from("admin_roles")
    .select("name")
    .eq("auth_user_id", user.id)
    .maybeSingle();
  await service.from("admin_roles").update({ name }).eq("auth_user_id", user.id);

  await recordAudit({
    action: "update",
    section: "account",
    entity: "profile",
    entityId: user.id,
    entityLabel: name,
    summary: `${user.email ?? "An admin"} updated their name`,
    before: before ?? null,
    after: { name },
  });

  return NextResponse.json({ success: true });
}
