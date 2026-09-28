// Attachments: ask the BFF for a signed upload URL, PUT the file to Supabase
// Storage, then the message is sent with the returned attachmentId.
//
// The file goes up as a multipart form part pointing at its local uri, which
// React Native streams natively. Reading it into a Blob first and PUTting that
// was rejected by Storage with a 400 on real phones.

import type { PickedFile } from "@/components/Composer";
import { api } from "@/lib/api";

export async function uploadAttachment(groupId: string, file: PickedFile): Promise<string> {
  // The size is only used to check limits; when the picker didn't report one, read it from the file.
  const sizeBytes = file.size ?? (await (await fetch(file.uri)).blob()).size;
  const ticket = await api.requestUpload(groupId, { mimeType: file.mimeType, sizeBytes });
  const form = new FormData();
  // React Native's FormData takes { uri, name, type } as a file part.
  form.append("file", { uri: file.uri, name: file.name, type: file.mimeType } as unknown as Blob);
  const res = await fetch(ticket.uploadUrl, { method: "PUT", body: form });
  if (!res.ok) throw new Error("Couldn't upload the file. Try again.");
  return ticket.attachmentId;
}
