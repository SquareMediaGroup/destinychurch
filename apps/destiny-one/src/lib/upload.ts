// Attachments: ask the BFF for a signed upload URL, PUT the file to Supabase
// Storage, then the message is sent with the returned attachmentId.

import type { PickedFile } from "@/components/Composer";
import { api } from "@/lib/api";

export async function uploadAttachment(groupId: string, file: PickedFile): Promise<string> {
  const blob = await (await fetch(file.uri)).blob();
  const ticket = await api.requestUpload(groupId, { mimeType: file.mimeType, sizeBytes: file.size ?? blob.size });
  const res = await fetch(ticket.uploadUrl, { method: "PUT", headers: { "Content-Type": file.mimeType }, body: blob });
  if (!res.ok) throw new Error("Couldn't upload the file. Try again.");
  return ticket.attachmentId;
}
