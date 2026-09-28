// The app's one data cache (TanStack Query), saved to the device.
//
// Nothing here goes stale on a timer (staleTime: Infinity). A screen that has
// data shows it straight away and does not ask the server again. Data is only
// re-fetched when:
//   - the database says it changed (a Realtime event, see src/lib/queries.ts),
//   - the app may have missed events: cold start, coming back after a while in
//     the background, or the Realtime socket reconnecting (session.tsx),
//   - someone pulls to refresh.
// Every re-fetch happens behind the data already on screen, so none of them
// shows a spinner.

import AsyncStorage from "@react-native-async-storage/async-storage";
import { QueryClient } from "@tanstack/react-query";
import { createAsyncStoragePersister } from "@tanstack/query-async-storage-persister";
import { persistQueryClientRestore, persistQueryClientSave, type PersistedClient } from "@tanstack/react-query-persist-client";
import { CACHE_KEY, LEGACY_CACHE_KEY, activeMemberId, isFirstSlot, loadAccounts } from "@/lib/accounts";
import type { MessagesData } from "@/lib/queries";

const MONTH = 30 * 24 * 60 * 60 * 1000;
/** Per group, only the newest messages are saved to the device. The rest stay in memory. */
const MAX_SAVED_MESSAGES = 60;

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: Infinity,
      // Never drop unused entries from memory: a chat you left a minute ago
      // should still open instantly. (A finite 30 days would also overflow
      // setTimeout's 24.8-day limit and fire at once.) The saved copy on disk
      // is what expires, after maxAge below.
      gcTime: Infinity,
      refetchOnWindowFocus: false,
      refetchOnReconnect: false,
      retry: 1,
    },
  },
});

/** Keep the saved copy small: newest messages only, and never unsent local ones. */
function trimForDisk(client: PersistedClient): PersistedClient {
  const queries = client.clientState.queries.map((q) => {
    if (q.queryKey[0] !== "messages" || !q.state.data) return q;
    const data = q.state.data as MessagesData;
    const sent = data.messages.filter((m) => m.id > 0 && !m.status);
    const kept = sent.slice(-MAX_SAVED_MESSAGES);
    const trimmed: MessagesData = { messages: kept, nextBefore: kept.length < sent.length ? kept[0].id : data.nextBefore };
    return { ...q, state: { ...q.state, data: trimmed } };
  });
  return { ...client, clientState: { ...client.clientState, queries } };
}

/** Whose data this is: the `me` entry's member id. */
function ownerOf(client: PersistedClient): string | null {
  const me = client.clientState.queries.find((q) => q.queryKey[0] === "me");
  return (me?.state.data as { id?: string } | null | undefined)?.id ?? null;
}

// One saved cache per account (src/lib/accounts.ts), under `d1.cache.v2:<member id>`.
//
// A write goes under the member id found IN the data being written, never
// "whoever is active now": the persister throttles writes, so one queued just
// before a switch can land after it. Keying by the data's owner means it
// still lands in its own account's file. Data with no `me` is not saved.
const storage = {
  async getItem(): Promise<string | null> {
    await loadAccounts();
    const memberId = activeMemberId();
    if (memberId) return AsyncStorage.getItem(`${CACHE_KEY}:${memberId}`);
    // First launch after the multi-account update: the old single cache
    // belongs to whoever is in the first slot. Hand it over once.
    if (!isFirstSlot()) return null;
    const legacy = await AsyncStorage.getItem(LEGACY_CACHE_KEY);
    if (legacy) await AsyncStorage.removeItem(LEGACY_CACHE_KEY);
    return legacy;
  },
  async setItem(_key: string, value: string): Promise<void> {
    const newline = value.indexOf("\n");
    const owner = value.slice(0, newline);
    if (owner) await AsyncStorage.setItem(`${CACHE_KEY}:${owner}`, value.slice(newline + 1));
  },
  async removeItem(): Promise<void> {
    const memberId = activeMemberId();
    if (memberId) await AsyncStorage.removeItem(`${CACHE_KEY}:${memberId}`);
  },
};

export const persister = createAsyncStoragePersister({
  storage,
  key: CACHE_KEY,
  throttleTime: 1000,
  serialize: (client) => `${ownerOf(client) ?? ""}\n${JSON.stringify(trimForDisk(client))}`,
});

/** Saved to disk. Anything else (e.g. directory searches) is memory-only. */
const SAVED = new Set(["me", "communities", "community", "group", "messages", "appConfig"]);

export const persistOptions = {
  persister,
  maxAge: MONTH,
  dehydrateOptions: {
    shouldDehydrateQuery: (q: { queryKey: readonly unknown[]; state: { status: string } }) => q.state.status === "success" && SAVED.has(q.queryKey[0] as string),
  },
  // Bump to throw away every saved cache after a breaking change to the data shapes.
  buster: "1",
};

/** Forget everything for the active account (sign-out, account deleted, a different person signed in). */
export async function clearCache(): Promise<void> {
  await queryClient.cancelQueries();
  queryClient.clear();
  await persister.removeClient();
}

/** Switching accounts, step 1: save what's in memory to its owner's file, right now. */
export async function saveCacheNow(): Promise<void> {
  await queryClient.cancelQueries();
  await persistQueryClientSave({ queryClient, persister, buster: persistOptions.buster, dehydrateOptions: persistOptions.dehydrateOptions }).catch(() => undefined);
}

/**
 * Switching accounts, step 2 (once the other account is active): drop the old
 * account's data from memory, leaving its file alone, and load the active
 * account's saved cache in its place.
 */
export async function swapInActiveCache(): Promise<void> {
  await queryClient.cancelQueries();
  queryClient.clear();
  await persistQueryClientRestore({ queryClient, persister, maxAge: persistOptions.maxAge, buster: persistOptions.buster }).catch(() => undefined);
}
