import { createServiceClient } from "@/utils/supabase/service";
import { requireMember, toMe } from "@/lib/destinyOne/auth.server";
import { OneError, limit, oneJson, oneRoute, readBody } from "@/lib/destinyOne/http";
import { settingsSchema } from "@/lib/destinyOne/schemas";

// PATCH /api/app/v1/one/me/settings  { readReceipts? }
//
// Account settings that live on the server because they change what other
// people see. Read receipts: off means nobody sees whether you've read their
// messages, and you don't see anyone else's (d1_read_receipts enforces both).

export const dynamic = "force-dynamic";

export const PATCH = oneRoute(async (request) => {
  const { member } = await requireMember(request, { requireConsent: false });
  await limit("settings", member.id, 20);
  const input = await readBody(request, settingsSchema);

  if (input.readReceipts !== undefined) {
    const { error } = await createServiceClient().from("d1_members").update({ read_receipts: input.readReceipts }).eq("id", member.id);
    if (error) {
      console.error("⚠️ Destiny One settings update failed:", error.message);
      throw new OneError("unavailable", "Couldn't save that setting. Please try again.");
    }
  }
  return oneJson(await toMe(member));
});
