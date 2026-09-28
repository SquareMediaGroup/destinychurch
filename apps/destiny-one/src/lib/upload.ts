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

/**
 * PUT a form with XMLHttpRequest, not fetch: Expo's fetch only takes real
 * File/Blob parts in a form and refuses React Native's { uri, name, type }
 * ("unsupported form data per implementation"). XMLHttpRequest streams the
 * file from disk natively.
 */
function putForm(url: string, form: FormData): Promise<void> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open("PUT", url);
    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) return resolve();
      const detail = String(xhr.responseText ?? "").slice(0, 120);
      console.warn("upload PUT rejected", xhr.status, detail);
      reject(new Error(`Couldn't upload the photo (${xhr.status}${detail ? `: ${detail}` : ""}).`));
    };
    xhr.onerror = () => reject(new Error("Couldn't send the photo (network error)."));
    xhr.ontimeout = () => reject(new Error("Couldn't send the photo (timed out)."));
    xhr.timeout = 60_000;
    xhr.send(form);
  });
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
  await putForm(ticket.uploadUrl, form);
  return ticket.attachmentId;
}
