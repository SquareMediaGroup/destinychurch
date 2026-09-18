import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createClient } from "@/utils/supabase/server";
import { readPortalUser } from "@/lib/staffPortalAuth";
import { MIN_PASSWORD_LENGTH } from "@/lib/staffLogins";

// Self-service password change, mirroring app/admin/reset-password/actions.ts,
// plus a re-auth step: auth.updateUser alone would let anyone who walks up to
// an unlocked, signed-in tab set a new password without knowing the old one.
// signInWithPassword against the caller's own session re-proves it's them —
// it re-authenticates the same user (a no-op on the session if the password
// checks out) rather than granting anything new.
export async function POST(request: Request) {
  const identity = await readPortalUser();
  if (!identity) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const body = await request.json().catch(() => null);
  const currentPassword = body?.currentPassword?.toString() ?? "";
  const password = body?.password?.toString() ?? "";
  const confirmPassword = body?.confirmPassword?.toString() ?? "";

  if (!currentPassword) {
    return NextResponse.json({ error: "Enter your current password." }, { status: 400 });
  }
  if (!password || !confirmPassword) {
    return NextResponse.json({ error: "Both password fields are required." }, { status: 400 });
  }
  if (password !== confirmPassword) {
    return NextResponse.json({ error: "Passwords do not match." }, { status: 400 });
  }
  if (password.length < MIN_PASSWORD_LENGTH) {
    return NextResponse.json(
      { error: `Password must be at least ${MIN_PASSWORD_LENGTH} characters.` },
      { status: 400 },
    );
  }

  const jar = await cookies();
  const supabase = createClient(jar);

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user?.email) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { error: reauthError } = await supabase.auth.signInWithPassword({
    email: user.email,
    password: currentPassword,
  });
  if (reauthError) {
    return NextResponse.json({ error: "That current password isn't right." }, { status: 400 });
  }

  const { error } = await supabase.auth.updateUser({ password });
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });

  return NextResponse.json({ success: true });
}
