import { createServiceClient } from "@/utils/supabase/service";
import { requireMember } from "@/lib/destinyOne/auth.server";
import { OneError, limit, oneJson, oneRoute, readBody } from "@/lib/destinyOne/http";
import { pushTokenDeleteSchema, pushTokenSchema } from "@/lib/destinyOne/schemas";

// POST   /api/app/v1/one/me/push-tokens  { token, platform }
// DELETE /api/app/v1/one/me/push-tokens  { token }   — on sign-out
//
// A device token belongs to whoever registered it last: if a phone changes
// hands between accounts, the old account stops getting its notifications.

export const dynamic = "force-dynamic";

export const POST = oneRoute(async (request) => {
  const caller = await requireMember(request, { requireConsent: false });
  limit("push-token", caller.member.id, 10);
  const { token, platform } = await readBody(request, pushTokenSchema);

  const { error } = await createServiceClient()
    .from("d1_push_tokens")
    .upsert(
      { token, platform, member_id: caller.member.id, last_seen_at: new Date().toISOString() },
      { onConflict: "token" },
    );
  if (error) throw new OneError("unavailable", "Something went wrong. Please try again.");
  return oneJson({ ok: true as const });
});

export const DELETE = oneRoute(async (request) => {
  const caller = await requireMember(request, { requireConsent: false });
  const { token } = await readBody(request, pushTokenDeleteSchema);
  await createServiceClient()
    .from("d1_push_tokens")
    .delete()
    .eq("token", token)
    .eq("member_id", caller.member.id);
  return oneJson({ ok: true as const });
});
