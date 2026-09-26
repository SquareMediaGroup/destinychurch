import { REQUIRED_CONSENTS } from "@destiny/shared";
import { createServiceClient } from "@/utils/supabase/service";
import { authenticate, loadMemberByAuthUser, toMe } from "@/lib/destinyOne/auth.server";
import { OneError, limit, oneJson, oneRoute, readBody } from "@/lib/destinyOne/http";
import { consentsSchema } from "@/lib/destinyOne/schemas";

// POST /api/app/v1/one/me/consents  { consents: [{ document, version }] }
//
// Records that the member accepted a notice. Only the CURRENT version of each
// required notice can be accepted — accepting a stale one would record
// agreement to words the app no longer shows.

export const dynamic = "force-dynamic";

export const POST = oneRoute(async (request) => {
  const user = await authenticate(request);
  limit("consents", user.id, 10);
  const member = await loadMemberByAuthUser(user.id);
  if (!member) throw new OneError("not_verified", "Finish signing in first.");

  const { consents } = await readBody(request, consentsSchema);
  for (const c of consents) {
    if (!REQUIRED_CONSENTS.some((r) => r.document === c.document && r.version === c.version)) {
      throw new OneError("invalid", `"${c.document}" version ${c.version} isn't the current version.`);
    }
  }

  const { error } = await createServiceClient()
    .from("d1_consents")
    .upsert(
      consents.map((c) => ({ member_id: member.id, document: c.document, version: c.version })),
      { onConflict: "member_id,document,version", ignoreDuplicates: true },
    );
  if (error) throw new OneError("unavailable", "Something went wrong. Please try again.");

  return oneJson(await toMe(member));
});
