// On-device cache of each group's latest page, so reopening a chat shows the
// last known messages immediately instead of a spinner. The network fetch
// still runs underneath and reconciles once it lands.

import AsyncStorage from "@react-native-async-storage/async-storage";
import type { D1GroupDetail, D1Message } from "@destiny/shared";

const PREFIX = "d1.cache.group.";
const MAX_CACHED_MESSAGES = 60;

interface CachedConversation {
  group: D1GroupDetail;
  messages: D1Message[];
  nextBefore: number | null;
}

export async function readCachedConversation(groupId: string): Promise<CachedConversation | null> {
  try {
    const raw = await AsyncStorage.getItem(PREFIX + groupId);
    return raw ? (JSON.parse(raw) as CachedConversation) : null;
  } catch {
    return null;
  }
}

export function writeCachedConversation(groupId: string, data: CachedConversation): void {
  const trimmed = { ...data, messages: data.messages.slice(-MAX_CACHED_MESSAGES) };
  void AsyncStorage.setItem(PREFIX + groupId, JSON.stringify(trimmed)).catch(() => {});
}
