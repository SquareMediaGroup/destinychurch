import { requireMember } from "@/lib/destinyOne/auth.server";
import { limit, oneJson, oneRoute, readBody } from "@/lib/destinyOne/http";
import { changePassword, hasPassword } from "@/lib/destinyOne/password.server";
import { passwordChangeSchema } from "@/lib/destinyOne/schemas";

// GET  /api/app/v1/one/me/password  -> { hasPassword }
// POST /api/app/v1/one/me/password  { password, current? }
//
// Sets or changes my password. If I already have one, `current` must be right.
// See lib/destinyOne/password.server.ts. The limit makes guessing the current
// password hopeless.

export const dynamic = "force-dynamic";

export const GET = oneRoute(async (request) => {
  const { user } = await requireMember(request, { requireConsent: false });
  return oneJson({ hasPassword: await hasPassword(user.id) });
});

export const POST = oneRoute(async (request) => {
  const { user } = await requireMember(request, { requireConsent: false });
  await limit("password-change", user.id, 5);
  const { password, current } = await readBody(request, passwordChangeSchema);
  await changePassword(user, password, current);
  return oneJson({ ok: true as const });
});
