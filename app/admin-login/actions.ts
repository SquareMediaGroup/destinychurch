"use server";

import { Resend } from "resend";
import { cookies, headers } from "next/headers";
import { createClient } from "@/utils/supabase/server";
import { createServiceClient } from "@/utils/supabase/service";
import { checkRateLimit, resetRateLimit } from "@/lib/loginRateLimit";
import { ADMIN_ROLES, getRoles, ROLE_LABELS, type AdminRole } from "@/lib/roles";
import { buildAccessRequestEmailHtml } from "@/lib/accessRequestEmail";

const resend = new Resend(process.env.RESEND_API_KEY);

export async function adminSignIn(
  _prev: unknown,
  formData: FormData,
): Promise<{ success: boolean; error?: string; email?: string; roles?: AdminRole[] }> {
  // Resolve client IP (works on Vercel and most reverse proxies)
  const headersList = await headers();
  const ip =
    headersList.get("x-forwarded-for")?.split(",")[0].trim() ??
    headersList.get("x-real-ip") ??
    "unknown";

  const { allowed, retryAfterSeconds } = checkRateLimit(ip);
  if (!allowed) {
    const mins = Math.ceil(retryAfterSeconds / 60);
    return {
      success: false,
      error: `Too many login attempts. Please try again in ${mins} minute${mins !== 1 ? "s" : ""}.`,
    };
  }

  const email = formData.get("email")?.toString().trim() ?? "";
  const password = formData.get("password")?.toString() ?? "";

  if (!email || !password) {
    return { success: false, error: "Email and password are required." };
  }

  const cookieStore = await cookies();
  const supabase = createClient(cookieStore);
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });

  if (error) {
    return { success: false, error: "Invalid email or password." };
  }

  resetRateLimit(ip);
  return { success: true, email, roles: getRoles(data.user) };
}

export async function adminSignOut(): Promise<void> {
  const cookieStore = await cookies();
  const supabase = createClient(cookieStore);
  await supabase.auth.signOut();
}

// Light in-memory throttle so a user can't spam the tech team's inbox by
// repeatedly clicking "Send Request". Keyed by `${userId}:${role}`.
const accessRequestSeen = new Map<string, number>();
const ACCESS_REQUEST_COOLDOWN_MS = 5 * 60 * 1000;

export async function requestSystemAccess(
  role: AdminRole,
): Promise<{ success: boolean; error?: string }> {
  if (!ADMIN_ROLES.includes(role)) {
    return { success: false, error: "Unknown system." };
  }

  const cookieStore = await cookies();
  const supabase = createClient(cookieStore);
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user?.email) {
    return { success: false, error: "You need to be signed in to request access." };
  }

  // Already has it — nothing to request. Treat as success so the UI confirms.
  if (getRoles(user).includes(role)) {
    return { success: true };
  }

  // Throttled — treat as already-sent so the UI stays graceful.
  const key = `${user.id}:${role}`;
  const last = accessRequestSeen.get(key);
  if (last && Date.now() - last < ACCESS_REQUEST_COOLDOWN_MS) {
    return { success: true };
  }

  if (!process.env.RESEND_API_KEY) {
    console.error("⚠️ RESEND_API_KEY not set — cannot send access request email");
    return { success: false, error: "Email service is not configured." };
  }

  // Deep link straight to the requester's staff record (with the edit modal
  // open) so the team can grant access in one click. Falls back to the
  // directory if no record is linked to this login.
  const { data: staffRow } = await createServiceClient()
    .from("hr_staff")
    .select("id")
    .eq("auth_user_id", user.id)
    .maybeSingle();

  const hdrs = await headers();
  const forwardedHost = hdrs.get("x-forwarded-host") ?? hdrs.get("host");
  const forwardedProto = hdrs.get("x-forwarded-proto") ?? "https";
  const origin =
    hdrs.get("origin") ??
    (forwardedHost ? `${forwardedProto}://${forwardedHost}` : null) ??
    process.env.NEXT_PUBLIC_APP_URL ??
    "http://localhost:3000";

  const hasRecord = Boolean(staffRow?.id);
  const portalUrl = hasRecord
    ? `${origin}/administration/hr/staff/${staffRow!.id}?edit=1`
    : `${origin}/administration/hr/staff`;

  const { error } = await resend.emails.send({
    from: "Destiny Church <noreply@support.squaremediagroup.org>",
    to: process.env.ACCESS_REQUEST_RECIPIENT || "techteam@destinytees.uk",
    replyTo: user.email,
    subject: `[Access request] ${ROLE_LABELS[role]} — ${user.email}`,
    html: buildAccessRequestEmailHtml({
      requesterEmail: user.email,
      systemLabel: ROLE_LABELS[role],
      requestedAt: new Date(),
      portalUrl,
      hasRecord,
    }),
  });

  if (error) {
    console.error("Access request email send error:", error);
    return { success: false, error: "Couldn't send your request. Please try again." };
  }

  accessRequestSeen.set(key, Date.now());
  console.log(`📧 Access request sent: ${user.email} → ${ROLE_LABELS[role]}`);
  return { success: true };
}
