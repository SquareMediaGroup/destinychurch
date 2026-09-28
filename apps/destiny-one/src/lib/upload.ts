// Attachments: ask the BFF for a signed upload URL, PUT the file to Supabase
// Storage, then the message is sent with the returned attachmentId.
//
// The file goes up as a multipart form part pointing at its local uri, which
// React Native streams natively. Reading it into a Blob first and PUTting that
// was rejected by Storage with a 400 on real phones.

import type { PickedFile } from "@/components/Composer";
import { api } from "@/lib/api";

function reason(err: unknown): string {
  return err instanceof Error ? err.message : String(err);
}

export async function uploadAttachment(groupId: string, file: PickedFile): Promise<string> {
  // The size is only used to check limits; when the picker didn't report one, read it from the file.
  let sizeBytes = file.size;
  if (sizeBytes == null) {
    try {
      sizeBytes = (await (await fetch(file.uri)).blob()).size;
    } catch (err) {
      throw new Error(`Couldn't read the photo (${reason(err)}).`);
    }
  }
  const ticket = await api.requestUpload(groupId, { mimeType: file.mimeType, sizeBytes });
  const form = new FormData();
  // React Native's FormData takes { uri, name, type } as a file part.
  form.append("file", { uri: file.uri, name: file.name, type: file.mimeType } as unknown as Blob);
  let res: Response;
  try {
    res = await fetch(ticket.uploadUrl, { method: "PUT", body: form });
  } catch (err) {
    console.warn("upload PUT failed", file.uri, err);
    throw new Error(`Couldn't send the photo (${reason(err)}).`);
  }
  if (!res.ok) {
    const detail = await res.text().catch(() => "");
    console.warn("upload PUT rejected", res.status, detail);
    throw new Error(`Couldn't upload the photo (${res.status}${detail ? `: ${detail.slice(0, 120)}` : ""}).`);
  }
  return ticket.attachmentId;
}
