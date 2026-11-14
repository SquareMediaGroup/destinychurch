// Welcome checklist progress: the four first-steps card at the top of Chats.
//
// Kept on the phone only, per member id, so each account on a shared phone has
// its own card and nothing needs a server or database. Two steps are worked out
// from live state (a profile picture, notifications), so only the two that
// can't be are stored: having opened a group chat, and having read "How your
// chats are kept safe". The card also remembers when it was first shown, since
// it only lasts 14 days, and whether it was swiped away.
//
// Unreadable storage counts as "nothing to show", so a storage fault can never
// leave a card stuck on screen. Signing an account out forgets its progress.

import { useEffect, useState } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { activeMemberId } from "@/lib/accounts";

/** The card disappears this long after it was first shown. */
export const WELCOME_WINDOW_MS = 14 * 24 * 60 * 60 * 1000;

export interface WelcomeProgress {
  firstSeen: number;
  openedGroup: boolean;
  readSafety: boolean;
  hidden: boolean;
}

const key = (memberId: string) => `d1.welcome.v1.${memberId}`;
const fresh = (): WelcomeProgress => ({ firstSeen: Date.now(), openedGroup: false, readSafety: false, hidden: false });

// undefined = not loaded yet, null = storage couldn't be read.
const cache = new Map<string, WelcomeProgress | null>();
const loading = new Map<string, Promise<WelcomeProgress | null>>();
const listeners = new Set<() => void>();
const notify = () => {
  for (const l of listeners) l();
};

/** Reads this member's progress, starting the 14 days the first time it is asked for. */
function load(memberId: string): Promise<WelcomeProgress | null> {
  const hit = cache.get(memberId);
  if (hit !== undefined) return Promise.resolve(hit);
  const pending = loading.get(memberId);
  if (pending) return pending;
  const p = (async () => {
    try {
      const raw = await AsyncStorage.getItem(key(memberId));
      let value: WelcomeProgress;
      if (raw) {
        value = { ...fresh(), ...(JSON.parse(raw) as Partial<WelcomeProgress>) };
      } else {
        value = fresh();
        await AsyncStorage.setItem(key(memberId), JSON.stringify(value));
      }
      cache.set(memberId, value);
      return value;
    } catch {
      cache.set(memberId, null);
      return null;
    } finally {
      loading.delete(memberId);
    }
  })();
  loading.set(memberId, p);
  return p;
}

async function update(memberId: string, patch: Partial<WelcomeProgress>): Promise<void> {
  await load(memberId);
  const current = cache.get(memberId);
  if (!current) return;
  const next = { ...current, ...patch };
  cache.set(memberId, next);
  notify();
  try {
    await AsyncStorage.setItem(key(memberId), JSON.stringify(next));
  } catch {
    // worst case the step ticks again next time
  }
}

/** Progress as the card reads it, with whether its 14 days are up (worked out when it changes, not on every render). */
export interface WelcomeView extends WelcomeProgress {
  expired: boolean;
}

/** This member's progress: undefined while loading, null when it can't be read. */
export function useWelcomeProgress(memberId: string | undefined): WelcomeView | null | undefined {
  const [state, setState] = useState<{ id: string; view: WelcomeView | null } | undefined>(undefined);
  useEffect(() => {
    if (!memberId) return;
    let live = true;
    const sync = () => {
      const hit = cache.get(memberId);
      if (!live || hit === undefined) return;
      setState({ id: memberId, view: hit ? { ...hit, expired: Date.now() - hit.firstSeen >= WELCOME_WINDOW_MS } : null });
    };
    listeners.add(sync);
    void load(memberId).then(sync);
    return () => {
      live = false;
      listeners.delete(sync);
    };
  }, [memberId]);
  return memberId && state?.id === memberId ? state.view : undefined;
}

/** A group chat was opened (a peek from the chat list doesn't count). */
export function markGroupOpened(): void {
  const id = activeMemberId();
  if (id && !cache.get(id)?.openedGroup) void update(id, { openedGroup: true });
}

/** "How your chats are kept safe" was opened. */
export function markSafetyRead(): void {
  const id = activeMemberId();
  if (id && !cache.get(id)?.readSafety) void update(id, { readSafety: true });
}

/** Swiped away: it never comes back. */
export function hideWelcome(memberId: string): void {
  void update(memberId, { hidden: true });
}

/** Signing an account out: its progress goes with it. */
export function forgetWelcome(memberId: string): void {
  cache.delete(memberId);
  void AsyncStorage.removeItem(key(memberId)).catch(() => undefined);
  notify();
}
