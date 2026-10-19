// Destiny One — typed client for the admin API (/api/admin/destiny-one/*),
// for the D1 Admin desktop app (apps/d1-admin).
//
// The website's admin pages call the same routes with their cookie session
// (lib/destinyOne/adminClient.ts). The desktop app has no cookies, so this
// client sends the Supabase access token as `Authorization: Bearer …`, which
// middleware.ts and lib/destinyOne/admin.server.ts accept for these routes
// only. Every route still checks the caller's role for itself.
//
// Unlike /api/app/v1, these routes answer plain JSON (no envelope) and errors
// as `{ error: "message" }`.

import type {
  AdminAuditPage,
  AdminChurchSuiteMatch,
  AdminCommunity,
  AdminCommunityDetail,
  AdminFeedback,
  AdminGroupDetail,
  AdminInvite,
  AdminMember,
  AdminMemberDetail,
  AdminOverview,
  AdminReport,
  AdminReportStatus,
  AdminSafeguardingGroup,
  AdminSettings,
  AdminTranscript,
  AdminWhoami,
  LeaderRole,
} from "./adminTypes";

export class D1AdminApiError extends Error {
  constructor(
    message: string,
    readonly httpStatus: number,
  ) {
    super(message);
    this.name = "D1AdminApiError";
  }
}

export interface DestinyOneAdminClientOptions {
  /** Site origin, e.g. https://destinytees.uk — no trailing slash needed. */
  baseUrl: string;
  /** The current Supabase access token, or null when signed out. */
  getAccessToken: () => Promise<string | null> | string | null;
  fetchImpl?: typeof fetch;
}

export interface AdminAgeDecision {
  adult: boolean;
  dateOfBirth?: string | null;
}

export interface AdminNewInvite {
  email: string;
  name: string;
  adult: boolean;
  dateOfBirth?: string | null;
  roles?: LeaderRole[];
  communityIds?: string[];
}

export type AdminMembershipRole = "admin" | "member";

export function createDestinyOneAdminClient({ baseUrl, getAccessToken, fetchImpl }: DestinyOneAdminClientOptions) {
  const root = `${baseUrl.replace(/\/$/, "")}/api/admin/destiny-one`;
  const doFetch = fetchImpl ?? fetch;

  async function call<T>(method: string, path: string, body?: unknown): Promise<T> {
    const token = await getAccessToken();
    let res: Response;
    try {
      res = await doFetch(`${root}${path}`, {
        method,
        headers: {
          Accept: "application/json",
          ...(body !== undefined ? { "Content-Type": "application/json" } : {}),
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: body !== undefined ? JSON.stringify(body) : undefined,
      });
    } catch (err) {
      throw new D1AdminApiError(err instanceof Error ? err.message : "Network error", 0);
    }
    const json = (await res.json().catch(() => null)) as (T & { error?: unknown }) | null;
    if (!res.ok) {
      const message = json && typeof json.error === "string" ? json.error : "Something went wrong. Please try again.";
      throw new D1AdminApiError(message, res.status);
    }
    return json as T;
  }

  const q = (params: Record<string, string | number | undefined | null>) => {
    const entries = Object.entries(params).filter(([, v]) => v !== undefined && v !== null) as [string, string | number][];
    return entries.length ? `?${new URLSearchParams(entries.map(([k, v]) => [k, String(v)]))}` : "";
  };

  return {
    whoami: () => call<AdminWhoami>("GET", "/whoami"),
    overview: () => call<AdminOverview>("GET", "/overview"),

    // ── People and access requests (Destiny One Admin) ──
    members: (status?: "pending" | "active" | "suspended") => call<AdminMember[]>("GET", `/members${q({ status })}`),
    member: (id: string) => call<AdminMemberDetail>("GET", `/members/${id}`),
    updateMember: (id: string, input: { displayName?: string; roles?: LeaderRole[]; status?: "active" | "suspended"; age?: AdminAgeDecision }) =>
      call<{ member: AdminMember }>("PATCH", `/members/${id}`, input),
    approve: (id: string, input: AdminAgeDecision & { displayName?: string; communityIds?: string[] }) =>
      call<{ member: AdminMember }>("POST", `/members/${id}/approve`, input),
    decline: (id: string) => call<{ ok: true }>("POST", `/members/${id}/decline`),
    churchSuite: (query: string) => call<AdminChurchSuiteMatch[]>("GET", `/churchsuite${q({ q: query })}`),

    // ── Invites ──
    invites: () => call<AdminInvite[]>("GET", "/invites"),
    createInvites: (invites: AdminNewInvite[]) =>
      call<{ created: number; failed: { email: string; error: string }[] }>("POST", "/invites", { invites }),
    resendInvite: (id: string) => call<{ ok: true }>("PATCH", `/invites/${id}`, { action: "resend" }),
    revokeInvite: (id: string) => call<{ ok: true }>("PATCH", `/invites/${id}`, { action: "revoke" }),

    // ── Communities and groups ──
    communities: () => call<AdminCommunity[]>("GET", "/communities"),
    community: (id: string) => call<AdminCommunityDetail>("GET", `/communities/${id}`),
    createCommunity: (input: { name: string; description?: string; adminIds?: string[] }) =>
      call<{ id: string }>("POST", "/communities", input),
    updateCommunity: (id: string, input: { name?: string; description?: string; archived?: boolean }) =>
      call<{ ok: true }>("PATCH", `/communities/${id}`, input),
    addCommunityMembers: (id: string, memberIds: string[], role: AdminMembershipRole = "member") =>
      call<{ ok: true }>("POST", `/communities/${id}/members`, { memberIds, role }),
    setCommunityRole: (id: string, memberId: string, role: AdminMembershipRole) =>
      call<{ ok: true }>("PATCH", `/communities/${id}/members`, { memberId, role }),
    removeCommunityMember: (id: string, memberId: string) =>
      call<{ ok: true }>("DELETE", `/communities/${id}/members`, { memberId }),
    createGroup: (communityId: string, input: { name: string; department?: string; description?: string; memberIds?: string[]; adminIds?: string[] }) =>
      call<{ id: string }>("POST", `/communities/${communityId}/groups`, input),
    group: (id: string) => call<AdminGroupDetail>("GET", `/groups/${id}`),
    updateGroup: (id: string, input: { name?: string; department?: string; description?: string; archived?: boolean }) =>
      call<{ ok: true }>("PATCH", `/groups/${id}`, input),
    addGroupMembers: (id: string, memberIds: string[], role: AdminMembershipRole = "member") =>
      call<{ ok: true }>("POST", `/groups/${id}/members`, { memberIds, role }),
    setGroupRole: (id: string, memberId: string, role: AdminMembershipRole) =>
      call<{ ok: true }>("PATCH", `/groups/${id}/members`, { memberId, role }),
    removeGroupMember: (id: string, memberId: string) => call<{ ok: true }>("DELETE", `/groups/${id}/members`, { memberId }),

    // ── Feedback and settings ──
    feedback: () => call<AdminFeedback[]>("GET", "/feedback"),
    setFeedbackStatus: (id: string, status: "new" | "done") => call<AdminFeedback>("PATCH", `/feedback/${id}`, { status }),
    settings: () => call<AdminSettings>("GET", "/settings"),
    updateSettings: (input: Partial<Pick<AdminSettings, "allowAccessRequests" | "inviteExpiryDays" | "maintenanceMessage" | "forceUpdateMessage">>) =>
      call<AdminSettings>("PATCH", "/settings", input),

    // ── Safeguarding (Safeguarding Admin) ──
    reports: (status: AdminReportStatus = "open") =>
      call<{ reports: AdminReport[] }>("GET", `/safeguarding/reports${q({ status })}`).then((r) => r.reports),
    resolveReport: (id: number, status: "reviewing" | "closed", resolution?: string) =>
      call<{ ok: true }>("PATCH", `/safeguarding/reports/${id}`, { status, resolution }),
    escalateReport: (id: number) => call<{ ok: true; escalatedAt: string }>("POST", `/safeguarding/reports/${id}/escalate`),
    removeMessage: (messageId: number, reason: string) =>
      call<{ ok: true }>("POST", `/safeguarding/messages/${messageId}/remove`, { reason }),
    restrict: (memberId: string, days: 1 | 7 | 30, reason: string) =>
      call<{ ok: true; restrictedUntil: string }>("POST", `/safeguarding/members/${memberId}/restrict`, { days, reason }),
    liftRestriction: (memberId: string) => call<{ ok: true }>("DELETE", `/safeguarding/members/${memberId}/restrict`),
    suspend: (memberId: string, suspended: boolean, reason: string) =>
      call<{ ok: true }>("POST", `/safeguarding/members/${memberId}/suspend`, { suspended, reason }),
    safeguardingGroups: () => call<AdminSafeguardingGroup[]>("GET", "/safeguarding/groups"),
    freezeGroup: (id: string, frozen: boolean, reason = "") =>
      call<{ ok: true; state: string }>("POST", `/safeguarding/groups/${id}/freeze`, { frozen, reason }),
    /** Audited: the reason is recorded with who opened it. Needs the Safeguarding Admin role itself. */
    transcript: (groupId: string, input: { reason: string; from?: string; to?: string }) =>
      call<AdminTranscript>("GET", `/safeguarding/groups/${groupId}/transcript${q(input)}`),
    audit: (before?: number | null) => call<AdminAuditPage>("GET", `/safeguarding/audit${q({ before })}`),
  };
}

export type DestinyOneAdminClient = ReturnType<typeof createDestinyOneAdminClient>;
