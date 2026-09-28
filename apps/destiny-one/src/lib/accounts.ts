// The accounts signed in on this device, for quick switching.
//
// Each account lives in its own "slot": its own Supabase client, with its own
// session under its own Keychain key. Switching only changes which slot is
// active. Nothing is signed out, no tokens move between clients, and the
// account you left keeps a valid session for when you come back.
//
// Only the active account refreshes its token and holds Realtime channels.
// An inactive account's refresh token just waits; getSession() refreshes it
// on the way back in.
//
// Each account's saved app cache is keyed by member id (see queryClient.ts),
// so switching back opens straight onto that account's last chat list.
//
// Push notifications follow the active account only: a device token belongs
// to whoever registered it last (me/push-tokens on the server).

import AsyncStorage from "@react-native-async-storage/async-storage";
import { AppState } from "react-native";
import * as Crypto from "expo-crypto";
import * as LocalAuthentication from "expo-local-authentication";
import type { SupabaseClient } from "@supabase/supabase-js";
import { createDestinyOneClient, needsOwnerCheck, nextSlot, switchedNoticeText, type AccountKind } from "@destiny/shared";
import { config } from "@/lib/config";
import { makeClient } from "@/lib/supabase";
import { secureStorage } from "@/lib/secureStorage";

export interface Account {
  slot: string;
  /** Supabase auth user id — the same person signing in twice replaces their old slot. */
  userId: string;
  /** Destiny One member id — keys the saved cache. */
  memberId: string;
  email: string | null;
  displayName: string;
  avatarUrl: string | null;
  /** A label for the switcher, never a permission. */
  kind: AccountKind;
  /** When this account was last the active one (epoch ms). */
  lastUsedAt: number;
  /** From the server at sign-in. Saved so "send as" can refuse child accounts without a network call. Unknown (old saves) counts as not adult. */
  isAdult: boolean;
}

interface Saved {
  active: string;
  accounts: Account[];
}

export const MAX_ACCOUNTS = 5;

const KEY = "d1.accounts.v1";
/** The slot single-account builds used: Supabase's default session key. */
const FIRST_SLOT = "0";

/** Where each member's app cache is saved (queryClient.ts). */
export const CACHE_KEY = "d1.cache.v2";
/** Single-account builds saved one cache here. */
export const LEGACY_CACHE_KEY = "d1.cache.v1";

let saved: Saved = { active: FIRST_SLOT, accounts: [] };
/** A slot being signed into from "Add account". Not active until the code checks out. */
let pending: string | null = null;
const clients = new Map<string, SupabaseClient>();
const listeners = new Set<() => void>();

const storageKeyFor = (slot: string) => (slot === FIRST_SLOT ? undefined : `d1.auth.${slot}`);

function clientFor(slot: string): SupabaseClient {
  let client = clients.get(slot);
  if (!client) {
    client = makeClient(storageKeyFor(slot));
    clients.set(slot, client);
  }
  return client;
}

function emit() {
  for (const l of listeners) l();
}

async function persist() {
  await AsyncStorage.setItem(KEY, JSON.stringify(saved)).catch(() => undefined);
}

let loading: Promise<void> | null = null;

/** Read the saved accounts once, at launch. Everything else here assumes it's done. */
export function loadAccounts(): Promise<void> {
  return (loading ??= (async () => {
    const raw = await AsyncStorage.getItem(KEY).catch(() => null);
    if (raw) {
      try {
        const parsed = JSON.parse(raw) as Saved;
        // Accounts saved before kinds existed load as plain members, last used "never".
        saved = { ...parsed, accounts: (parsed.accounts as Partial<Account>[]).map((a) => ({ ...a, kind: a.kind ?? "member", lastUsedAt: a.lastUsedAt ?? 0, isAdult: a.isAdult ?? false }) as Account) };
      } catch {
        // Unreadable: start again from the first slot, which is where a
        // single-account build kept its session anyway.
      }
    }
    if (AppState.currentState === "active") void client().auth.startAutoRefresh();
    emit();
  })());
}

// Refresh the active session only while the app is in the foreground.
AppState.addEventListener("change", (state) => {
  if (state === "active") void client().auth.startAutoRefresh();
  else void client().auth.stopAutoRefresh();
});

// ── Switch notice ("Switched to X profile") ─────────────────────────────────

export interface SwitchNotice {
  id: number;
  text: string;
  avatarUrl: string | null;
  name: string;
}
let notice: SwitchNotice | null = null;
let noticeId = 0;

export function switchNotice(): SwitchNotice | null {
  return notice;
}

export function clearSwitchNotice() {
  if (!notice) return;
  notice = null;
  emit();
}

// ── Reading ─────────────────────────────────────────────────────────────────

/** The active account's Supabase client (auth + Realtime). */
export function client(): SupabaseClient {
  return clientFor(saved.active);
}

/** The client the sign-in screens use: the one being added, else the active one. */
export function signInClient(): SupabaseClient {
  return clientFor(pending ?? saved.active);
}

export function activeSlot(): string {
  return saved.active;
}

export function isAdding(): boolean {
  return pending !== null;
}

export function accounts(): Account[] {
  return saved.accounts;
}

export function activeMemberId(): string | null {
  return saved.accounts.find((a) => a.slot === saved.active)?.memberId ?? null;
}

/** True for the slot single-account builds used (its cache may be under LEGACY_CACHE_KEY). */
export function isFirstSlot(): boolean {
  return saved.active === FIRST_SLOT;
}

export function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

const slotApis = new Map<string, ReturnType<typeof createDestinyOneClient>>();

/** The API as another signed-in account, without switching to it (used to send as them). */
export function apiFor(slot: string) {
  let api = slotApis.get(slot);
  if (!api) {
    api = createDestinyOneClient({
      baseUrl: config.apiBaseUrl,
      // getSession() refreshes an expired token on the way out, even when this slot isn't active.
      getAccessToken: async () => (await clientFor(slot).auth.getSession()).data.session?.access_token ?? null,
    });
    slotApis.set(slot, api);
  }
  return api;
}

/** Where a double press on Profile goes: the most recently used other account. */
export function nextAccountSlot(): string | null {
  return nextSlot(saved.accounts, saved.active);
}

export async function accessToken(): Promise<string | null> {
  const { data } = await client().auth.getSession();
  return data.session?.access_token ?? null;
}

// ── Adding ──────────────────────────────────────────────────────────────────

/** Start signing into another account. The current one stays active until it succeeds. */
export async function beginAdd(): Promise<void> {
  await cancelAdd();
  pending = Crypto.randomUUID();
}

/** Abandon an unfinished "Add account" (leaves the active account as it was). */
export async function cancelAdd(): Promise<void> {
  if (!pending) return;
  await dropSlot(pending);
  pending = null;
}

/** The new account signed in: returns its slot, ready for switchTo. */
export function finishAdd(): string | null {
  const slot = pending;
  pending = null;
  return slot;
}

// ── Recording, switching, removing ──────────────────────────────────────────

/** Remember (or refresh) who's signed into a slot. */
export async function recordAccount(slot: string, account: Omit<Account, "slot" | "lastUsedAt" | "kind"> & { kind?: AccountKind }): Promise<void> {
  // The same person signed in again in a new slot: the new session wins, and
  // the old slot is dropped locally (a server sign-out would end both).
  const duplicate = saved.accounts.find((a) => a.userId === account.userId && a.slot !== slot);
  if (duplicate) await dropSlot(duplicate.slot);

  const existing = saved.accounts.find((a) => a.slot === slot);
  const next: Account = {
    slot,
    ...account,
    kind: account.kind ?? existing?.kind ?? duplicate?.kind ?? "member",
    lastUsedAt: existing?.lastUsedAt ?? duplicate?.lastUsedAt ?? Date.now(),
  };
  const list = saved.accounts.filter((a) => a !== duplicate);
  const index = list.findIndex((a) => a.slot === slot);
  if (index >= 0) {
    if (!duplicate && JSON.stringify(list[index]) === JSON.stringify(next)) return;
    list[index] = next;
  } else {
    list.push(next);
  }
  saved = { ...saved, accounts: list };
  await persist();
  emit();
}

/** Make another slot the active one. The caller (SessionProvider) swaps the cache around this. */
export async function activate(slot: string, { announce = false }: { announce?: boolean } = {}): Promise<void> {
  if (slot === saved.active) return;
  const previousSlot = saved.active;
  const previous = client();
  void previous.auth.stopAutoRefresh();
  await previous.removeAllChannels();
  const now = Date.now();
  saved = {
    ...saved,
    active: slot,
    // The account we're leaving was in use until now; the one we're entering is in use from now.
    accounts: saved.accounts.map((a) => (a.slot === previousSlot || a.slot === slot ? { ...a, lastUsedAt: now } : a)),
  };
  // Left an empty slot behind (signed out, nobody in it): close it.
  if (!saved.accounts.some((a) => a.slot === previousSlot)) clients.delete(previousSlot);
  await persist();
  if (AppState.currentState === "active") void client().auth.startAutoRefresh();
  const entered = saved.accounts.find((a) => a.slot === slot);
  if (announce && entered) notice = { id: ++noticeId, text: switchedNoticeText(entered.displayName), avatarUrl: entered.avatarUrl, name: entered.displayName };
  emit();
}

/**
 * Forget an account on this device. Pass `signOut` to also end its session
 * on the server (everywhere, as the Sign out button always has).
 */
export async function removeAccount(slot: string, { signOut }: { signOut: boolean }): Promise<void> {
  const account = saved.accounts.find((a) => a.slot === slot);
  if (signOut) await clientFor(slot).auth.signOut().catch(() => undefined);
  // The active slot keeps its client (the session listener is attached to
  // it) and simply stands empty until the next sign-in.
  if (slot === saved.active) await clearSavedSession(slot);
  else await dropSlot(slot);
  if (account) await AsyncStorage.removeItem(`${CACHE_KEY}:${account.memberId}`).catch(() => undefined);
  saved = { ...saved, accounts: saved.accounts.filter((a) => a.slot !== slot) };
  await persist();
  emit();
}

/** Close a slot's client and delete its saved session, without telling the server. */
async function dropSlot(slot: string) {
  slotApis.delete(slot);
  const c = clients.get(slot);
  if (c) {
    void c.auth.stopAutoRefresh();
    await c.removeAllChannels();
  }
  await clearSavedSession(slot);
  clients.delete(slot);
}

async function clearSavedSession(slot: string) {
  const key = storageKeyFor(slot) ?? defaultStorageKey();
  await secureStorage.removeItem(key).catch(() => undefined);
  await secureStorage.removeItem(`${key}-user`).catch(() => undefined);
  await secureStorage.removeItem(`${key}-code-verifier`).catch(() => undefined);
}

function defaultStorageKey(): string {
  return (clientFor(FIRST_SLOT) as unknown as { storageKey: string }).storageKey;
}

// ── Device check before switching ───────────────────────────────────────────

/**
 * Face ID / Touch ID / passcode before opening another account, so someone
 * handed an unlocked phone (a child on a parent's phone, say) can't hop into
 * another person's chats. Devices with no passcode set skip it: there's
 * nothing to check against.
 */
export async function confirmOwner(name: string, slot?: string): Promise<boolean> {
  try {
    const level = await LocalAuthentication.getEnrolledLevelAsync();
    const lastUsedAt = slot ? saved.accounts.find((a) => a.slot === slot)?.lastUsedAt : undefined;
    if (!needsOwnerCheck({ enrolled: level !== LocalAuthentication.SecurityLevel.NONE, lastUsedAt, now: Date.now() })) return true;
    const result = await LocalAuthentication.authenticateAsync({ promptMessage: `Switch to ${name}`, disableDeviceFallback: false });
    return result.success;
  } catch {
    // Not supported on this device: don't lock people out of their own accounts.
    return true;
  }
}
