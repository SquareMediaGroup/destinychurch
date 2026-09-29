import { createServiceClient } from "@/utils/supabase/service";
import { requireMember } from "@/lib/destinyOne/auth.server";
import { fromDbError, limit, oneJson, oneRoute, readBody } from "@/lib/destinyOne/http";
import { feedbackSchema } from "@/lib/destinyOne/schemas";

// POST /api/app/v1/one/feedback  { kind, body, appVersion?, platform?, osVersion?, device?, errorId? }
//
// "Report a problem" and "Send feedback" from the app's Profile tab. Saved to
// d1_feedback (never GitHub issues: the repo is public), where Destiny One
// Admins read it at /admin/destiny-one/feedback; the insert rings their bell.
// Like reporting a message, it doesn't need the consent gate: someone stuck on
// a broken notices screen must still be able to say so.

export const dynamic = "force-dynamic";

export const POST = oneRoute(async (request) => {
  const caller = await requireMember(request, { requireConsent: false });
  await limit("feedback", caller.member.id, 5);
  const input = await readBody(request, feedbackSchema);

  const { error } = await createServiceClient()
    .from("d1_feedback")
    .insert({
      member_id: caller.member.id,
      kind: input.kind,
      body: input.body,
      app_version: input.appVersion ?? null,
      platform: input.platform ?? null,
      os_version: input.osVersion ?? null,
      device: input.device ?? null,
      error_id: input.errorId ?? null,
    });
  if (error) throw fromDbError(error);
  return oneJson({ ok: true as const }, 201);
});
