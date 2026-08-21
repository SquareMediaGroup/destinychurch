import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createClient } from "@/utils/supabase/server";
import { createServiceClient } from "@/utils/supabase/service";

// The signed-in admin's own onboarding progress.
//
// Not an authorization boundary and not role-gated: middleware has already
// decided this is a signed-in admin, and the only row this route will ever
// touch is the caller's own (auth_user_id comes from their cookie session, never
// from the body). That's why /api/admin/onboarding sits in OPEN_PATHS — a Store
// Admin needs their progress just as much as a Site Admin does.
//
// PATCH is a merge, not a replace: completed_steps unions with what's already
// stored so two tabs finishing different sections can't clobber each other.

export const dynamic = "force-dynamic";

interface OnboardingRow {
  completed_steps: string[];
  gate_seen: boolean;
  dismissed: boolean;
}

const DEFAULTS: OnboardingRow = {
  completed_steps: [],
  gate_seen: false,
  dismissed: false,
};

async function currentUserId(): Promise<string | null> {
  const cookieStore = await cookies();
  const {
    data: { user },
  } = await createClient(cookieStore).auth.getUser();
  return user?.id ?? null;
}

export async function GET() {
  const userId = await currentUserId();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data, error } = await createServiceClient()
    .from("admin_onboarding")
    .select("completed_steps, gate_seen, dismissed")
    .eq("auth_user_id", userId)
    .maybeSingle();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({
    completed_steps: data?.completed_steps ?? DEFAULTS.completed_steps,
    gate_seen: Boolean(data?.gate_seen),
    dismissed: Boolean(data?.dismissed),
  });
}

export async function PATCH(request: Request) {
  const userId = await currentUserId();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = (await request.json().catch(() => ({}))) as Record<string, unknown>;
  const supabase = createServiceClient();

  const { data: existing } = await supabase
    .from("admin_onboarding")
    .select("completed_steps, gate_seen, dismissed")
    .eq("auth_user_id", userId)
    .maybeSingle();

  const incoming = Array.isArray(body.completed_steps)
    ? (body.completed_steps as unknown[]).filter((s): s is string => typeof s === "string")
    : [];

  // `reset` is how "Run this again" clears a tour; everything else only ever
  // adds, so a slow PATCH can't undo a section finished in another tab.
  const merged =
    body.reset === true
      ? incoming
      : Array.from(new Set([...(existing?.completed_steps ?? []), ...incoming]));

  const row = {
    auth_user_id: userId,
    completed_steps: merged,
    gate_seen:
      typeof body.gate_seen === "boolean"
        ? body.gate_seen
        : Boolean(existing?.gate_seen),
    dismissed:
      typeof body.dismissed === "boolean"
        ? body.dismissed
        : Boolean(existing?.dismissed),
    updated_at: new Date().toISOString(),
  };

  const { data, error } = await supabase
    .from("admin_onboarding")
    .upsert(row, { onConflict: "auth_user_id" })
    .select("completed_steps, gate_seen, dismissed")
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}
