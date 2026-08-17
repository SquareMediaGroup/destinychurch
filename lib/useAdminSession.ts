"use client";

// Who's signed in and what they can see, fetched once per page load.
//
// Three separate components need this (sidebar, header, palette) and the
// sidebar was already fetching /api/admin/me/roles on its own. Without sharing,
// mounting the palette would have added a second and third identical request on
// every navigation. The promise is cached at module scope, so the first
// component to ask triggers the fetch and the rest await the same one.

import { useEffect, useState } from "react";
import { NO_ROLES, type RoleFlags } from "@/lib/adminRoles";

export interface AdminSession {
  email: string | null;
  id: string | null;
  roles: RoleFlags;
  /** False until the real answer lands; NO_ROLES is the safe placeholder. */
  loaded: boolean;
}

const EMPTY: AdminSession = { email: null, id: null, roles: NO_ROLES, loaded: false };

let cached: Promise<AdminSession> | null = null;

function fetchSession(): Promise<AdminSession> {
  cached ??= fetch("/api/admin/me")
    .then((r) => (r.ok ? r.json() : null))
    .then((data) =>
      data
        ? {
            email: data.email ?? null,
            id: data.id ?? null,
            roles: { ...NO_ROLES, ...(data.roles ?? {}) } as RoleFlags,
            loaded: true,
          }
        : { ...EMPTY, loaded: true },
    )
    .catch(() => {
      // Let the next mount retry rather than caching a network blip forever.
      cached = null;
      return { ...EMPTY, loaded: true };
    });
  return cached;
}

export function useAdminSession(): AdminSession {
  const [session, setSession] = useState<AdminSession>(EMPTY);

  useEffect(() => {
    let active = true;
    fetchSession().then((s) => {
      if (active) setSession(s);
    });
    return () => {
      active = false;
    };
  }, []);

  return session;
}

/** Call after anything that could change the signed-in user's roles. */
export function clearAdminSessionCache() {
  cached = null;
}
