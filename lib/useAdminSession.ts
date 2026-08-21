"use client";

// Who's signed in and what they can see, fetched once per page load.
//
// Three separate components need this (sidebar, header, palette) and the
// sidebar was already fetching /api/admin/me/roles on its own. Without sharing,
// mounting the palette would have added a second and third identical request on
// every navigation. The promise is cached at module scope, so the first
// component to ask triggers the fetch and the rest await the same one.
//
// Role preview: a super admin can ask to see the admin as one of the other
// access levels, so they can check what a new Store Admin will actually be
// handed. The override is applied here rather than in each consumer, so the
// sidebar, the header, the dashboard grid and the ⌘K palette all narrow with no
// changes of their own.
//
// It is presentation only and says so in the UI. Middleware still sees a real
// super admin and will still let them open anything — this is a preview, not an
// impersonation, and it must never be treated as a security boundary.

import { useCallback, useEffect, useState, useSyncExternalStore } from "react";
import { NO_ROLES, type RoleFlags } from "@/lib/adminRoles";
import type { OnboardedRole } from "@/lib/adminOnboarding";

// Preview is offered only for roles that have a tour to preview — see
// lib/adminOnboarding.ts.
export type PreviewRole = OnboardedRole;

export interface AdminSession {
  email: string | null;
  id: string | null;
  /** What the UI should act on — the preview role's flags while previewing. */
  roles: RoleFlags;
  /** What the user really is. Always the truth. */
  actualRoles: RoleFlags;
  previewRole: PreviewRole | null;
  /** False until the real answer lands; NO_ROLES is the safe placeholder. */
  loaded: boolean;
}

const PREVIEW_KEY = "dc-admin-role-preview";

const EMPTY: AdminSession = {
  email: null,
  id: null,
  roles: NO_ROLES,
  actualRoles: NO_ROLES,
  previewRole: null,
  loaded: false,
};

interface Fetched {
  email: string | null;
  id: string | null;
  roles: RoleFlags;
}

let cached: Promise<Fetched> | null = null;

function readStoredPreview(): PreviewRole | null {
  if (typeof window === "undefined") return null;
  const value = window.sessionStorage.getItem(PREVIEW_KEY);
  return value ? (value as PreviewRole) : null;
}

// Survives navigation within the tab but not a new tab or a restart, which is
// the right lifetime for "show me what someone else sees". Read once when this
// client chunk loads; useSyncExternalStore's server snapshot is what keeps
// hydration honest.
let preview: PreviewRole | null = readStoredPreview();
const previewListeners = new Set<() => void>();

function subscribePreview(listener: () => void) {
  previewListeners.add(listener);
  return () => previewListeners.delete(listener);
}

const readPreview = () => preview;
const noPreviewOnServer = () => null;

export function setRolePreview(role: PreviewRole | null) {
  preview = role;
  if (typeof window !== "undefined") {
    if (role) window.sessionStorage.setItem(PREVIEW_KEY, role);
    else window.sessionStorage.removeItem(PREVIEW_KEY);
  }
  for (const listener of previewListeners) listener();
}

export function getRolePreview(): PreviewRole | null {
  return preview;
}

function fetchSession(): Promise<Fetched> {
  cached ??= fetch("/api/admin/me")
    .then((r) => (r.ok ? r.json() : null))
    .then((data) =>
      data
        ? {
            email: data.email ?? null,
            id: data.id ?? null,
            roles: { ...NO_ROLES, ...(data.roles ?? {}) } as RoleFlags,
          }
        : { email: null, id: null, roles: NO_ROLES },
    )
    .catch(() => {
      // Let the next mount retry rather than caching a network blip forever.
      cached = null;
      return { email: null, id: null, roles: NO_ROLES };
    });
  return cached;
}

/** A preview role grants exactly that one flag — and never super_admin. */
export function rolesForPreview(role: PreviewRole): RoleFlags {
  return { ...NO_ROLES, [role]: true };
}

export function useAdminSession(): AdminSession {
  const [fetched, setFetched] = useState<Fetched | null>(null);
  const previewRole = useSyncExternalStore(
    subscribePreview,
    readPreview,
    noPreviewOnServer,
  );

  useEffect(() => {
    let active = true;
    void fetchSession().then((s) => {
      if (active) setFetched(s);
    });
    return () => {
      active = false;
    };
  }, []);

  if (!fetched) return { ...EMPTY, previewRole };

  // Only a real super admin may preview; anyone else's stored value is ignored.
  const previewing = previewRole && fetched.roles.super_admin ? previewRole : null;

  return {
    email: fetched.email,
    id: fetched.id,
    roles: previewing ? rolesForPreview(previewing) : fetched.roles,
    actualRoles: fetched.roles,
    previewRole: previewing,
    loaded: true,
  };
}

/** Call after anything that could change the signed-in user's roles. */
export function clearAdminSessionCache() {
  cached = null;
}

/** Exit preview from anywhere (the preview bar, leaving /admin/onboarding). */
export function useExitRolePreview() {
  return useCallback(() => setRolePreview(null), []);
}
