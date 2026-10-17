// Photos and files out of a chat: a local copy to share or save.
//
// Attachment links are short-lived signed URLs to a private bucket, so
// nothing is handed to another app as a link. The file is downloaded into the
// app's cache folder first, then shared or saved from there. The cache folder
// is the system's to clear, so these copies don't pile up.
//
// "Save to Photos" asks for add-only access on iOS (it never sees the
// library). Android shares to the system sheet instead, where Google Photos
// or Files can save it: asking for photo-library access there falls under
// Google Play's photo permission policy, which a chat app doesn't need.

import { Platform, Share } from "react-native";
import { File, Paths } from "expo-file-system";
import * as MediaLibrary from "expo-media-library";
import * as Sharing from "expo-sharing";
import type { LocalMessage } from "@/lib/queries";

export type Photo = LocalMessage & { attachment: NonNullable<LocalMessage["attachment"]> };

/** A sent, undeleted message whose attachment is a picture: what the viewer pages through. */
export function isPhoto(m: LocalMessage): m is Photo {
  return !m.deleted && m.id > 0 && !!m.attachment && m.attachment.mimeType.startsWith("image/");
}

const EXTENSION: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "image/heic": "heic",
  "application/pdf": "pdf",
  "audio/mp4": "m4a",
  "audio/m4a": "m4a",
  "audio/aac": "aac",
};

/** A local copy of an attachment, named by its id so a second share reuses it. */
export async function downloadAttachment(url: string, attachmentId: string, mimeType: string): Promise<File> {
  const file = new File(Paths.cache, `d1-${attachmentId}.${EXTENSION[mimeType] ?? "bin"}`);
  if (file.exists && file.size > 0) return file;
  return File.downloadFileAsync(url, file, { idempotent: true });
}

export class SaveRefusedError extends Error {
  constructor() {
    super("Destiny One isn't allowed to add photos. You can change this in Settings, Destiny One, Photos.");
    this.name = "SaveRefusedError";
  }
}

/** iOS: adds the photo to the library. Android: opens the share sheet (see the note at the top). */
export async function savePhoto(file: File, mimeType: string): Promise<"saved" | "shared"> {
  if (Platform.OS !== "ios") {
    await shareFile(file, mimeType);
    return "shared";
  }
  const { granted } = await MediaLibrary.requestPermissionsAsync(true);
  if (!granted) throw new SaveRefusedError();
  await MediaLibrary.Asset.create(file.uri);
  return "saved";
}

/** The system share sheet on a local file. */
export async function shareFile(file: File, mimeType: string): Promise<void> {
  if (await Sharing.isAvailableAsync()) {
    await Sharing.shareAsync(file.uri, { mimeType, UTI: mimeType === "application/pdf" ? "com.adobe.pdf" : undefined });
    return;
  }
  await Share.share({ url: file.uri });
}
