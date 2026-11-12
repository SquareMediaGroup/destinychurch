import { createServiceClient } from "@/utils/supabase/service";
import { requireMember } from "@/lib/destinyOne/auth.server";
import { removeVerseCard } from "@/lib/destinyOne/bible.server";
import { OneError, fromDbError, limit, oneJson, oneRoute, requireMessageId, type IdParams } from "@/lib/destinyOne/http";

// DELETE /api/app/v1/one/messages/[id]/verse
//        Take the verse card off my own message (the text stays as it is). Editing
//        the message later looks for a reference again.

export const dynamic = "force-dynamic";

export const DELETE = oneRoute<IdParams>(async (request, { params }) => {
  const caller = await requireMember(request);
  const id = requireMessageId((await params).id);
  await limit("verse-remove", caller.member.id, 30);
  const { data, error } = await createServiceClient().from("d1_messages").select("group_id, sender_id").eq("id", id).is("deleted_at", null).maybeSingle();
  if (error) throw fromDbError(error);
  if (!data || data.sender_id !== caller.member.id) throw new OneError("not_found", "That message doesn't exist, or isn't yours.");
  await removeVerseCard(id, data.group_id as string);
  return oneJson({ ok: true as const });
});
