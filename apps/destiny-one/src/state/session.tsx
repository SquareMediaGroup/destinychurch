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

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { AppState } from "react-native";
import { useIsRestoring, useQuery } from "@tanstack/react-query";
import type { Session } from "@supabase/supabase-js";
import type { D1CommunitySummary, D1Me } from "@destiny/shared";
import { canCreateGroup } from "@destiny/shared";
import { api, D1ApiError } from "@/lib/api";
import { signOut as authSignOut } from "@/lib/auth";
import { applyEvent, keys } from "@/lib/queries";
import { clearCache, queryClient } from "@/lib/queryClient";
import { startHub, type Hub } from "@/lib/realtime";
import { supabase } from "@/lib/supabase";

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
  signOut: () => Promise<void>;
}

const Ctx = createContext<SessionValue | null>(null);

async function fetchMe(): Promise<D1Me | null> {
  try {
    return await api.me();
  } catch (err) {
    if (err instanceof D1ApiError && err.code === "unauthenticated") {
      await supabase.auth.signOut();
      return null;
    }
    throw err;
  }
}

/** Every cached entry goes stale; whatever is on screen re-fetches in the background. */
function catchUp() {
  void queryClient.invalidateQueries();
}

export function SessionProvider({ children }: { children: ReactNode }) {
  const restoring = useIsRestoring();
  const [authChecked, setAuthChecked] = useState(false);
  const [session, setSession] = useState<Session | null>(null);

  const meQuery = useQuery({ queryKey: keys.me, queryFn: fetchMe, enabled: !!session && !restoring });
  const me = session ? (meQuery.data ?? null) : null;
  const meRef = useRef<D1Me | null>(null);
  meRef.current = me;

  const active = me?.onboarding === "active" && me.outstandingConsents.length === 0;

  const communitiesQuery = useQuery({ queryKey: keys.communities, queryFn: () => api.communities(), enabled: active && !restoring });
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

  // Auth session: restore on launch, follow sign-in / sign-out.
  useEffect(() => {
    let cancelled = false;
    supabase.auth
      .getSession()
      .then(({ data }) => !cancelled && setSession(data.session))
      .catch(() => undefined) // unreadable keychain: treat as signed out
      .finally(() => !cancelled && setAuthChecked(true));
    const { data: sub } = supabase.auth.onAuthStateChange((_event, next) => {
      setSession(next);
      if (!next) void clearCache();
    });
    return () => {
      cancelled = true;
      sub.subscription.unsubscribe();
    };
  }, []);

  // Realtime: one hub for the member topic and every group in the chat list.
  const hub = useRef<Hub | null>(null);
  const meId = me?.id;
  useEffect(() => {
    if (!active || !meId) return;
    const h = startHub(meId, (e) => applyEvent(e, meId), catchUp);
    hub.current = h;
    return () => {
      h.stop();
      hub.current = null;
    };
  }, [active, meId]);

  const groupIds = useMemo(() => (communities ?? []).flatMap((c) => c.groups.map((g) => g.id)).sort().join(","), [communities]);
  useEffect(() => {
    hub.current?.setGroups(groupIds ? groupIds.split(",") : []);
  }, [groupIds, active, meId]);

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

  const signOut = useCallback(async () => {
    await authSignOut();
    await clearCache();
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
    }),
    [ready, session, me, setMe, refreshMe, communities, communitiesError, refreshCommunities, signOut],
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useSession(): SessionValue {
  const v = useContext(Ctx);
  if (!v) throw new Error("useSession outside SessionProvider");
  return v;
}

/** Look up a group summary (and its community) from the cached chat list. */
export function useGroupSummary(groupId: string | undefined) {
  const { communities } = useSession();
  return useMemo(() => {
    for (const c of communities ?? []) for (const g of c.groups) if (g.id === groupId) return { group: g, community: c };
    return null;
  }, [communities, groupId]);
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
