// The signed-in member and the data every tab shares.
//
//   session      Supabase auth session (null = signed out)
//   me           D1Me from the BFF; drives routing via routeFor()
//   communities  the chat list
//
// `me` and `communities` live in the app cache (src/lib/queryClient.ts), which
// is saved on the device: after the first launch the app opens straight onto
// the last known chat list, with no spinner and no skeleton. It then stays
// current through Realtime (src/lib/realtime.ts → applyEvent), and only goes
// back to the server to catch up on events it may have missed:
//   - once per cold start (see RootLayout),
//   - coming back to the app after more than CATCH_UP_AFTER_MS away,
//   - the Realtime socket re-joining after a drop.
// Switching tabs or opening a screen never re-fetches on its own.
//
// Several accounts can be signed in at once (src/lib/accounts.ts). Switching
// saves this account's cache to its own file, makes the other account active,
// and loads that one's saved cache, so it opens as instantly as a cold start.

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, useSyncExternalStore, type ReactNode } from "react";
import { AppState } from "react-native";
import { useIsRestoring, useQuery } from "@tanstack/react-query";
import type { Session } from "@supabase/supabase-js";
import type { D1CommunitySummary, D1Me } from "@destiny/shared";
import { canCreateGroup, checkAddedAccount } from "@destiny/shared";
import { router, useSegments } from "expo-router";
import * as accounts from "@/lib/accounts";
import type { Account } from "@/lib/accounts";
import { api, D1ApiError, setAccessChangedHandler } from "@/lib/api";
import { signOut as authSignOut } from "@/lib/auth";
import { movePushToActiveAccount } from "@/lib/push";
import { applyEvent, keys } from "@/lib/queries";
import { clearCache, queryClient, saveCacheNow, swapInActiveCache } from "@/lib/queryClient";
import { startHub, type Hub } from "@/lib/realtime";
import { typing } from "@/state/typing";
import { setReportingMember } from "@/lib/sentry";
import { chatDrafts } from "@/state/drafts";
import { hasSeenSetup } from "@/state/setupSeen";

type Href = "/welcome" | "/request" | "/waiting" | "/notices" | "/chats";

/** Away for longer than this and the app quietly checks for anything it missed. */
const CATCH_UP_AFTER_MS = 30_000;

/** Where someone belongs, from the server's view of them. */
export function routeFor(me: D1Me | null): Href {
  if (!me) return "/welcome";
  switch (me.onboarding) {
    case "request_needed":
      return "/request";
    case "request_submitted":
    case "invite_only":
    case "suspended":
      return "/waiting";
    default:
      return me.outstandingConsents.length ? "/notices" : "/chats";
  }
}

interface SessionValue {
  ready: boolean;
  session: Session | null;
  email: string | null;
  me: D1Me | null;
  setMe: (me: D1Me) => void;
  refreshMe: () => Promise<D1Me | null>;
  isLeader: boolean;
  communities: D1CommunitySummary[] | null;
  communitiesError: string | null;
  /** Pull-to-refresh and "Try again". Everything else updates by itself. */
  refreshCommunities: () => Promise<void>;
  /** Signs the active account out. If another account is signed in, switches to it. */
  signOut: () => Promise<void>;
  /** Every account signed in on this device, the active one included. */
  accounts: Account[];
  activeSlot: string;
  switching: boolean;
  switchTo: (slot: string, opts?: { announce?: boolean }) => Promise<void>;
  /** After "Add account" signs in: make the new account the active one. */
  finishAdding: (me: D1Me) => Promise<{ ok: true } | { ok: false; message: string }>;
  /** Sign another (not the active) account out and forget it on this device. */
  removeAccount: (slot: string) => Promise<void>;
}

const Ctx = createContext<SessionValue | null>(null);

async function fetchMe(): Promise<D1Me | null> {
  try {
    return await api.me();
  } catch (err) {
    if (err instanceof D1ApiError && err.code === "unauthenticated") {
      // The listener in SessionProvider forgets the account.
      await accounts.client().auth.signOut();
      return null;
    }
    throw err;
  }
}

/** Screens you can be on without an active, consented account. Everything else is "in the app". */
const OUTSIDE_APP = new Set(["", "index", "welcome", "email", "code", "request", "waiting", "notices", "setup"]);

/** Whether the first route segment is one of the app's own screens (not launch or sign-in). */
export function isInApp(segment: string | undefined): boolean {
  return !OUTSIDE_APP.has(segment ?? "");
}

/** Chats, groups and messages: dropped from the device when someone loses access. */
function forgetChats() {
  for (const key of ["communities", "community", "group", "messages"]) queryClient.removeQueries({ queryKey: [key] });
}

/** Every cached entry goes stale; whatever is on screen re-fetches in the background. */
function catchUp() {
  void queryClient.invalidateQueries();
}

export function SessionProvider({ children }: { children: ReactNode }) {
  const restoring = useIsRestoring();
  const [accountsLoaded, setAccountsLoaded] = useState(false);
  const [authChecked, setAuthChecked] = useState(false);
  const [session, setSession] = useState<Session | null>(null);
  const [switching, setSwitching] = useState(false);
  /** Set while switchTo / signOut run, so the auth listener leaves the tidying to them. */
  const busy = useRef(false);

  const activeSlot = useSyncExternalStore(accounts.subscribe, accounts.activeSlot);
  const accountList = useSyncExternalStore(accounts.subscribe, accounts.accounts);

  useEffect(() => {
    void accounts.loadAccounts().then(() => setAccountsLoaded(true));
  }, []);

  const meQuery = useQuery({ queryKey: keys.me, queryFn: fetchMe, enabled: !!session && !restoring && !switching });
  const me = session ? (meQuery.data ?? null) : null;
  const meRef = useRef<D1Me | null>(null);
  useEffect(() => {
    meRef.current = me;
  }, [me]);
  // Crash reports carry the member's internal id only.
  useEffect(() => setReportingMember(me?.id ?? null), [me?.id]);

  const active = me?.onboarding === "active" && me.outstandingConsents.length === 0;

  const communitiesQuery = useQuery({ queryKey: keys.communities, queryFn: () => api.communities(), enabled: active && !restoring && !switching });
  const communities = active ? (communitiesQuery.data ?? null) : null;
  const communitiesError = communitiesQuery.error ? errorMessage(communitiesQuery.error, "Couldn't load your chats.") : null;

  const setMe = useCallback((next: D1Me) => {
    const previous = queryClient.getQueryData<D1Me | null>(keys.me);
    // Someone else signed in on this device: nothing of theirs may show.
    if (previous && previous.id !== next.id) void clearCache();
    queryClient.setQueryData(keys.me, next);
  }, []);

  const refreshMe = useCallback(
    () => queryClient.fetchQuery({ queryKey: keys.me, queryFn: fetchMe, staleTime: 0 }).catch(() => null),
    [],
  );

  const refreshCommunities = useCallback(async () => {
    await queryClient.refetchQueries({ queryKey: keys.communities });
  }, []);

  // Auth session of the active account: restore on launch and on every
  // switch, follow sign-in / sign-out.
  useEffect(() => {
    if (!accountsLoaded) return;
    let cancelled = false;
    const client = accounts.client();
    client.auth
      .getSession()
      .then(({ data }) => !cancelled && setSession(data.session))
      .catch(() => undefined) // unreadable keychain: treat as signed out
      .finally(() => !cancelled && setAuthChecked(true));
    const { data: sub } = client.auth.onAuthStateChange((event, next) => {
      if (cancelled) return;
      setSession(next);
      // Signed out from elsewhere (session revoked, account deleted): forget
      // this account here too. Our own sign-out and switching tidy up themselves.
      if (event === "SIGNED_OUT" && !busy.current) {
        if (meRef.current) chatDrafts.forget(meRef.current.id);
        void clearCache().then(() => accounts.removeAccount(activeSlot, { signOut: false }));
      }
    });
    return () => {
      cancelled = true;
      sub.subscription.unsubscribe();
    };
  }, [accountsLoaded, activeSlot]);

  // Keep the account list's name, picture and email current.
  const userId = session?.user.id;
  const userEmail = session?.user.email ?? null;
  useEffect(() => {
    if (switching || !me || !userId) return;
    void accounts.recordAccount(activeSlot, { userId, memberId: me.id, email: userEmail, displayName: me.displayName, avatarUrl: me.avatarUrl, isAdult: me.isAdult });
  }, [switching, me, userId, userEmail, activeSlot]);

  // Realtime: one hub for the member topic and every group in the chat list.
  const hub = useRef<Hub | null>(null);
  const meId = me?.id;
  useEffect(() => {
    if (!active || !meId) return;
    const h = startHub(accounts.client(), meId, (e) => applyEvent(e, meId), catchUp);
    hub.current = h;
    return () => {
      h.stop();
      hub.current = null;
      typing.clear(); // another account's "typing…" mustn't linger
    };
  }, [active, meId]);

  // Once per signed-in session: if notifications are already allowed, (re)register
  // this phone's token. Covers a first registration that failed offline, a token
  // the system has rotated, and keeps the server's last-seen date fresh. Never asks.
  useEffect(() => {
    if (active && meId) void movePushToActiveAccount().catch(() => undefined);
  }, [active, meId]);

  const groupIds = useMemo(() => (communities ?? []).flatMap((c) => c.groups.map((g) => g.id)).sort().join(","), [communities]);
  useEffect(() => {
    hub.current?.setGroups(groupIds ? groupIds.split(",") : []);
  }, [groupIds, active, meId]);

  // Mid-session account changes (suspended, un-verified, new notices): any API
  // call that comes back with one of those errors re-checks `me` once.
  useEffect(() => {
    let pending = false;
    setAccessChangedHandler(() => {
      if (pending || !meRef.current) return;
      pending = true;
      void refreshMe().finally(() => {
        pending = false;
      });
    });
    return () => setAccessChangedHandler(null);
  }, [refreshMe]);

  // Lost access (suspended, or waiting on staff again): nothing of the
  // chats may stay readable on the device.
  const onboarding = me?.onboarding;
  useEffect(() => {
    if (onboarding && onboarding !== "active") forgetChats();
  }, [onboarding]);

  // Coming back to the app: waiting members re-check approval (A6); active
  // members catch up on anything missed while the socket was asleep.
  useEffect(() => {
    let awaySince: number | null = null;
    const sub = AppState.addEventListener("change", (state) => {
      if (state !== "active") {
        awaySince ??= Date.now();
        return;
      }
      const away = awaySince === null ? 0 : Date.now() - awaySince;
      awaySince = null;
      if (!meRef.current) return;
      if (meRef.current.onboarding !== "active") void refreshMe();
      else if (away > CATCH_UP_AFTER_MS) catchUp();
    });
    return () => sub.remove();
  }, [refreshMe]);

  // The order matters. The old account's cache is saved (to its own file)
  // before anything changes; the other account is made active before the
  // in-memory cache is emptied, so anything fetched from here on is fetched
  // as the new account; and in-flight requests from the old one are
  // cancelled rather than landing in the new account's cache.
  const runSwitch = useCallback(async (slot: string, knownMe?: D1Me, announce = false) => {
    setSwitching(true);
    try {
      await saveCacheNow();
      await accounts.activate(slot, { announce });
      await swapInActiveCache();
      if (knownMe) queryClient.setQueryData(keys.me, knownMe);
      const { data } = await accounts.client().auth.getSession().catch(() => ({ data: { session: null } }));
      setSession(data.session);
      // Its session ended while it was inactive (signed out elsewhere, say).
      if (!data.session) await accounts.removeAccount(slot, { signOut: false });
    } finally {
      setSwitching(false);
    }
    // Behind the saved data: catch up on what happened while it was inactive.
    catchUp();
    void movePushToActiveAccount().catch(() => undefined);
  }, []);

  const switchTo = useCallback(
    async (slot: string, opts?: { announce?: boolean }) => {
      if (slot === accounts.activeSlot() || busy.current) return;
      busy.current = true;
      try {
        await runSwitch(slot, undefined, opts?.announce ?? false);
      } finally {
        busy.current = false;
      }
    },
    [runSwitch],
  );

  const finishAdding = useCallback(
    async (next: D1Me): Promise<{ ok: true } | { ok: false; message: string }> => {
      const { data } = await accounts.signInClient().auth.getSession();
      const user = data.session?.user;
      const kind = accounts.pendingKind();
      const slot = accounts.finishAdd();
      if (!slot || !user) return { ok: true };
      const check = checkAddedAccount(kind, next);
      if (!check.ok) {
        // Wrong kind of account: forget the new sign-in on this phone, leave the current account exactly as it was.
        // Local only: a global sign-out would also end that person's own sessions on their other devices.
        await accounts.removeAccount(slot, { signOut: false });
        // Still adding: if they go back and try another account, it must not replace the one they're on.
        await accounts.beginAdd(kind);
        return check;
      }
      // Signed into the account they're already on: nothing to add.
      if (next.id === meRef.current?.id) {
        await accounts.removeAccount(slot, { signOut: false });
        return { ok: true };
      }
      busy.current = true;
      try {
        await accounts.recordAccount(slot, { userId: user.id, memberId: next.id, email: user.email ?? null, displayName: next.displayName, avatarUrl: next.avatarUrl, isAdult: next.isAdult, kind });
        await runSwitch(slot, next, true);
      } finally {
        busy.current = false;
      }
      return { ok: true };
    },
    [runSwitch],
  );

  const signOut = useCallback(async () => {
    busy.current = true;
    try {
      const slot = accounts.activeSlot();
      const memberId = meRef.current?.id;
      // Ending the session on the server can fail (offline, say). This phone
      // forgets the account whatever happens: chats, drafts and the saved session.
      await authSignOut().catch(() => undefined);
      await clearCache();
      if (memberId) chatDrafts.forget(memberId);
      await accounts.removeAccount(slot, { signOut: false });
      const next = accounts.accounts()[0];
      if (next) await runSwitch(next.slot);
      else setSession(null);
    } finally {
      busy.current = false;
    }
  }, [runSwitch]);

  const removeAccount = useCallback(async (slot: string) => {
    if (slot === accounts.activeSlot()) return;
    await accounts.removeAccount(slot, { signOut: true });
  }, []);

  // Ready once the cache is back from disk and we know who's signed in. With
  // a saved `me` that's immediate; the first ever launch waits for the server.
  const ready = authChecked && !restoring && (!session || meQuery.data !== undefined || meQuery.isFetched);

  const value = useMemo<SessionValue>(
    () => ({
      ready,
      session,
      email: session?.user.email ?? null,
      me,
      setMe,
      refreshMe,
      isLeader: me ? canCreateGroup(me) : false,
      communities,
      communitiesError,
      refreshCommunities,
      signOut,
      accounts: accountList,
      activeSlot,
      switching,
      switchTo,
      finishAdding,
      removeAccount,
    }),
    [ready, session, me, setMe, refreshMe, communities, communitiesError, refreshCommunities, signOut, accountList, activeSlot, switching, switchTo, finishAdding, removeAccount],
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

/**
 * Moves someone out of the app screens as soon as the server says they no
 * longer belong there (suspended, new notices to accept, …). Mounted once,
 * inside the navigator.
 */
export function AccessGuard() {
  const { ready, session, me } = useSession();
  const segments = useSegments();
  const inApp = isInApp(segments[0] as string | undefined);
  const target = session && me ? routeFor(me) : null;

  useEffect(() => {
    if (!ready || !inApp || !target || target === "/chats") return;
    router.replace(target);
  }, [ready, inApp, target]);

  // Everyone sees Setup once, existing members included, the first time they reach the app.
  const memberId = me?.id;
  useEffect(() => {
    if (!ready || !inApp || target !== "/chats" || !memberId) return;
    let live = true;
    void hasSeenSetup(memberId).then((seen) => {
      if (live && !seen) router.replace("/setup");
    });
    return () => {
      live = false;
    };
  }, [ready, inApp, target, memberId]);

  return null;
}

export function useSession(): SessionValue {
  const v = useContext(Ctx);
  if (!v) throw new Error("useSession outside SessionProvider");
  return v;
}

/** Look up a group summary (and its community) from the cached chat list. */
export function useGroupSummary(groupId: string | undefined) {
  const { communities } = useSession();
  return useMemo(() => findGroupSummary(communities, groupId), [communities, groupId]);
}

function findGroupSummary(communities: D1CommunitySummary[] | null, groupId: string | undefined) {
  for (const c of communities ?? []) for (const g of c.groups) if (g.id === groupId) return { group: g, community: c };
  return null;
}

export function errorMessage(err: unknown, fallback = "Something went wrong. Please try again."): string {
  if (err instanceof D1ApiError) {
    if (err.code === "rate_limited") return "You're doing that a lot. Try again in a few minutes.";
    if (err.code === "network") return "You're offline. Check your connection and try again.";
    return err.message || fallback;
  }
  if (err instanceof Error && err.message) return err.message;
  return fallback;
}
