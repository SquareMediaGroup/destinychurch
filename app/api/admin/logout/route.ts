import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/utils/supabase/server";
import { createServiceClient } from "@/utils/supabase/service";
import { cookies } from "next/headers";
import { ADMIN_ROLES, getRoles } from "@/lib/adminRoles";
import { recordAudit } from "@/lib/audit.server";

export async function POST(request: NextRequest) {
  const cookieStore = await cookies();
  const supabase = createClient(cookieStore);

  // middleware.ts lets this path through *before* it resolves anyone (so
  // signing out always works, even with a broken session), which means the
  // usual actor headers aren't set here — read the user and pass them in.
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (user) {
    const roles = await getRoles(createServiceClient(), user.id);
    await recordAudit({
      actor: {
        id: user.id,
        email: user.email ?? null,
        roles: ADMIN_ROLES.filter((role) => roles[role]),
      },
      action: "logout",
      section: "account",
      entity: "sign-out",
      entityId: user.id,
      entityLabel: user.email ?? user.id,
      summary: `${user.email ?? "An admin"} signed out`,
      changes: null,
    });
  }

  await supabase.auth.signOut();
  return NextResponse.redirect(new URL("/", request.url));
}
