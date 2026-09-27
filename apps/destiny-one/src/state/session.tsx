// The signed-in member and the data every tab shares.
//
//   session      Supabase auth session (null = signed out)
//   me           D1Me from the BFF; drives routing via routeFor()
//   communities  api.communities(), refreshed on focus, on foreground, and on
//                d1-member:<id> events (added to / removed from a group)
//
// Screens read from here rather than each fetching the chat list, so the
// Chats, Groups, Notifications and Search screens always agree.

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { AppState } from "react-native";
import type { Session } from "@supabase/supabase-js";
import type { D1CommunitySummary, D1Me } from "@destiny/shared";
import { canCreateGroup } from "@destiny/shared";
import { api, D1ApiError } from "@/lib/api";
import { signOut as authSignOut } from "@/lib/auth";
import { subscribeToMe } from "@/lib/realtime";
import { supabase } from "@/lib/supabase";

type Href = "/welcome" | "/request" | "/waiting" | "/notices" | "/chats";

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
  refreshCommunities: () => Promise<void>;
  signOut: () => Promise<void>;
}

const Ctx = createContext<SessionValue | null>(null);

export function SessionProvider({ children }: { children: ReactNode }) {
  const [ready, setReady] = useState(false);
  const [session, setSession] = useState<Session | null>(null);
  const [me, setMe] = useState<D1Me | null>(null);
  const [communities, setCommunities] = useState<D1CommunitySummary[] | null>(null);
  const [communitiesError, setCommunitiesError] = useState<string | null>(null);
  const meRef = useRef<D1Me | null>(null);
  meRef.current = me;

  const refreshMe = useCallback(async () => {
    try {
      const next = await api.me();
      setMe(next);
      return next;
    } catch (err) {
      if (err instanceof D1ApiError && err.code === "unauthenticated") {
        await supabase.auth.signOut();
        setMe(null);
      }
      return null;
    }
  }, []);

  const refreshCommunities = useCallback(async () => {
    try {
      setCommunities(await api.communities());
      setCommunitiesError(null);
    } catch (err) {
      setCommunitiesError(err instanceof Error ? err.message : "Couldn't load your chats.");
    }
  }, []);

  // Auth session: restore on launch, follow sign-in / sign-out.
  useEffect(() => {
    let cancelled = false;
    supabase.auth
      .getSession()
      .then(async ({ data }) => {
        if (cancelled) return;
        setSession(data.session);
        if (data.session) await refreshMe();
      })
      .catch(() => undefined) // unreadable keychain: treat as signed out
      .finally(() => !cancelled && setReady(true));
    const { data: sub } = supabase.auth.onAuthStateChange((_event, next) => {
      setSession(next);
      if (!next) {
        setMe(null);
        setCommunities(null);
      }
    });
    return () => {
      cancelled = true;
      sub.subscription.unsubscribe();
    };
  }, [refreshMe]);

  const active = me?.onboarding === "active" && me.outstandingConsents.length === 0;

  // Chat list + "you were added / removed" events, once fully onboarded.
  useEffect(() => {
    if (!active || !me) return;
    void refreshCommunities();
    let unsubscribe: (() => void) | undefined;
    let stopped = false;
    subscribeToMe(me.id, () => void refreshCommunities()).then((fn) => {
      if (stopped) fn();
      else unsubscribe = fn;
    });
    return () => {
      stopped = true;
      unsubscribe?.();
    };
  }, [active, me?.id, refreshCommunities]); // eslint-disable-line react-hooks/exhaustive-deps

  // Coming back to the app: waiting members re-check approval (A6), active
  // members refresh the chat list.
  useEffect(() => {
    const sub = AppState.addEventListener("change", (state) => {
      if (state !== "active" || !meRef.current) return;
      if (meRef.current.onboarding !== "active") void refreshMe();
      else void refreshCommunities();
    });
    return () => sub.remove();
  }, [refreshMe, refreshCommunities]);

  const signOut = useCallback(async () => {
    await authSignOut();
    setMe(null);
    setCommunities(null);
  }, []);

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
    [ready, session, me, refreshMe, communities, communitiesError, refreshCommunities, signOut],
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
