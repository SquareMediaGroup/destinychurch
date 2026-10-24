// What Destiny One keeps on the phone, for Storage and data > Free up storage.
//
// Media: photos and voice messages loaded in chats, files opened or shared,
// and photos prepared for sending all live in the app's cache folder. Clearing
// it is safe: anything still needed is downloaded again when it's next opened.
// Files written in the last few minutes are left alone, in case a message is
// still being sent from one.
//
// Messages: the recent messages saved so chats open without a connection
// (queryClient.ts). They're small and refreshed from the server, so they're
// shown but not offered for clearing.

import AsyncStorage from "@react-native-async-storage/async-storage";
import { Directory, File, Paths } from "expo-file-system";
import { CACHE_KEY, activeMemberId } from "@/lib/accounts";

/** Leave anything newer than this: it may be a photo that's still uploading. */
const KEEP_RECENT_MS = 10 * 60 * 1000;

export interface StorageUse {
  mediaBytes: number;
  messagesBytes: number;
  /** Free space on the phone, when the system says. */
  freeBytes: number | null;
}

export async function storageUse(): Promise<StorageUse> {
  let mediaBytes = 0;
  try {
    mediaBytes = Paths.cache.size ?? 0;
  } catch {
    // unreadable: show nothing rather than fail the screen
  }
  let messagesBytes = 0;
  const memberId = activeMemberId();
  if (memberId) {
    const saved = await AsyncStorage.getItem(`${CACHE_KEY}:${memberId}`).catch(() => null);
    messagesBytes = saved ? saved.length * 2 : 0; // stored as UTF-16 text
  }
  let freeBytes: number | null = null;
  try {
    freeBytes = Paths.availableDiskSpace;
  } catch {
    freeBytes = null;
  }
  return { mediaBytes, messagesBytes, freeBytes };
}

function clearDirectory(dir: Directory, cutoff: number) {
  for (const entry of dir.list()) {
    try {
      if (entry instanceof Directory) {
        clearDirectory(entry, cutoff);
        if (entry.list().length === 0) entry.delete();
      } else if (entry instanceof File) {
        const modified = entry.modificationTime;
        if (modified == null || modified < cutoff) entry.delete();
      }
    } catch {
      // in use or already gone: skip it
    }
  }
}

/** Deletes the media and files in the app's cache folder. Returns how much was freed. */
export function clearMedia(): number {
  const before = Paths.cache.size ?? 0;
  clearDirectory(Paths.cache, Date.now() - KEEP_RECENT_MS);
  const after = Paths.cache.size ?? 0;
  return Math.max(0, before - after);
}
