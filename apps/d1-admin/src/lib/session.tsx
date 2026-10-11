// Who is signed in, and whether they may use D1 Admin.
//
// D1 Admin is for leaders and admins. After sign-in the app asks two things:
//   GET /api/app/v1/one/me              — the Destiny One member (leader roles)
//   GET /api/admin/destiny-one/whoami   — the admin roles (sidebar sections)
// Anyone who is neither a leader nor an admin is shown "use the phone app".
// Every API route still checks for itself; this only decides what to show.
//
// Touch ID: with "Require Touch ID" on (the default) a saved session opens
// on the lock screen, not straight into reports.

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { D1ApiError, isLeaderRole, type AdminWhoami, type D1Me } from "@destiny/shared";
import { admin, api } from "@/lib/api";
import { authenticate } from "@/lib/native";
import { getPrefs } from "@/lib/prefs";
import { queryClient } from "@/lib/queryClient";
import { supabase } from "@/lib/supabase";

const NO_ADMIN: AdminWhoami = { destinyOneAdmin: false, safeguardingAdmin: false, transcriptReader: false, superAdmin: false };

export type SessionState =
  | { status: "loading" }
  | { status: "signedOut" }
  | { status: "locked" }
  | { status: "notAllowed"; me: D1Me | null; message: string }
  | { status: "ready"; me: D1Me; roles: AdminWhoami; leader: boolean };

interface SessionApi {
  state: SessionState;
  requestCode: (email: string) => Promise<void>;
  verifyCode: (email: string, code: string) => Promise<void>;
  signInWithPassword: (email: string, password: string) => Promise<void>;
  unlock: () => Promise<void>;
  signOut: () => Promise<void>;
  refreshMe: () => Promise<void>;
}

const Ctx = createContext<SessionApi | null>(null);

const SIGN_IN_FAILED = "That email and password don't match an account that can sign in here.";

export function SessionProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<SessionState>({ status: "loading" });
  const loading = useRef(false);

  const load = useCallback(async () => {
    if (loading.current) return;
    loading.current = true;
    try {
      const me = await api.me();
      const roles = await admin.whoami().catch(() => NO_ADMIN);
      const anyAdmin = roles.destinyOneAdmin || roles.safeguardingAdmin;
      const leader = isLeaderRole(me.roles);
      if (me.onboarding !== "active") {
        setState({ status: "notAllowed", me, message: me.onboardingMessage ?? "Your Destiny One account isn't active yet." });
      } else if (!leader && !anyAdmin) {
        setState({
          status: "notAllowed",
          me,
          message: "D1 Admin is for leaders and admins. Please use the Destiny One app on your phone.",
        });
      } else {
        setState({ status: "ready", me, roles, leader });
      }
    } catch (err) {
      if (err instanceof D1ApiError && err.code === "unauthenticated") {
        await supabase.auth.signOut().catch(() => undefined);
        setState({ status: "signedOut" });
      } else if (err instanceof D1ApiError && (err.code === "not_verified" || err.code === "access_request_needed")) {
        setState({ status: "notAllowed", me: null, message: err.message });
      } else {
        setState({ status: "notAllowed", me: null, message: err instanceof Error ? err.message : "Couldn't reach Destiny One." });
      }
    } finally {
      loading.current = false;
    }
  }, []);

  useEffect(() => {
    void supabase.auth.getSession().then(({ data }) => {
      if (!data.session) setState({ status: "signedOut" });
      else if (getPrefs().touchId) setState({ status: "locked" });
      else void load();
    });
    const { data: sub } = supabase.auth.onAuthStateChange((event) => {
      if (event === "SIGNED_OUT") {
        queryClient.clear();
        setState({ status: "signedOut" });
      }
    });
    return () => sub.subscription.unsubscribe();
  }, [load]);

  const value = useMemo<SessionApi>(
    () => ({
      state,
      requestCode: async (email) => {
        await api.requestCode(email.trim().toLowerCase());
      },
      verifyCode: async (email, code) => {
        const { error } = await supabase.auth.verifyOtp({ email: email.trim().toLowerCase(), token: code.trim(), type: "email" });
        if (error) throw new Error("That code didn't work. Check it, or ask for a new one.");
        await api.link();
        await load();
      },
      signInWithPassword: async (email, password) => {
        const { error } = await supabase.auth.signInWithPassword({ email: email.trim().toLowerCase(), password });
        if (error) throw new Error(SIGN_IN_FAILED);
        await api.link();
        await load();
      },
      unlock: async () => {
        const ok = await authenticate("open D1 Admin");
        if (ok) await load();
      },
      signOut: async () => {
        await supabase.auth.signOut().catch(() => undefined);
        queryClient.clear();
        setState({ status: "signedOut" });
      },
      refreshMe: load,
    }),
    [state, load],
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useSession(): SessionApi {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useSession outside SessionProvider");
  return ctx;
}

/** The signed-in, allowed session. Only for components under the app shell. */
export function useReady(): Extract<SessionState, { status: "ready" }> {
  const { state } = useSession();
  if (state.status !== "ready") throw new Error("useReady before the session is ready");
  return state;
}
