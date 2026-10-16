// Attachments: ask the API for a signed upload URL, PUT the file straight to
// Supabase Storage, then send the message with the attachment id. Same flow
// as the phone app (apps/destiny-one/src/lib/upload.ts); on the Mac the file
// is a real File, so a plain fetch with FormData works.

import { ATTACHMENT_MIME_TYPES, MAX_ATTACHMENT_BYTES } from "@destiny/shared";
import { api } from "@/lib/api";

export const ACCEPT = ATTACHMENT_MIME_TYPES.join(",");

export function checkFile(file: File): string | null {
  if (!(ATTACHMENT_MIME_TYPES as readonly string[]).includes(file.type)) return "You can send photos (JPEG, PNG, WebP, HEIC) and PDFs.";
  if (file.size > MAX_ATTACHMENT_BYTES) return "Files can be up to 20 MB.";
  return null;
}

export async function uploadAttachment(groupId: string, file: File): Promise<string> {
  const ticket = await api.requestUpload(groupId, { mimeType: file.type, sizeBytes: file.size });
  const form = new FormData();
  form.append("file", file, file.name);
  const res = await fetch(ticket.uploadUrl, { method: "PUT", body: form });
  if (!res.ok) throw new Error(`Couldn't upload ${file.name} (${res.status}).`);
  return ticket.attachmentId;
}
