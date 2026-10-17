// Destiny One — shapes returned by /api/admin/destiny-one/* to the website's
// admin pages and the D1 Admin desktop app (applications/d1-admin). Client-safe (no
// server imports). The Destiny One Admin routes never return message content;
// only the safeguarding routes do.
//
// Lives in the shared package so the website and the desktop app read one set
// of types; lib/destinyOne/adminTypes.ts re-exports it for the website.

export type MemberStatus = "pending" | "active" | "suspended";
export type LeaderRole = "admin" | "cg_leader" | "senior_leader";

export interface AdminMember {
  id: string;
  displayName: string;
  email: string | null;
  status: MemberStatus;
  roles: LeaderRole[];
  isAdult: boolean;
  /** YYYY-MM-DD the member counts as an adult from (18th birthday or verification date). */
  adultOn: string | null;
  /** What they said about their age in the access request. Never used by any rule. */
  declaredAdult: boolean | null;
  requestNote: string | null;
  requestSubmittedAt: string | null;
  verifiedAt: string | null;
  verificationSource: "invite" | "admin" | "churchsuite" | null;
  churchsuiteLinked: boolean;
  createdAt: string;
  communityCount: number;
  groupCount: number;
  /** Set while a timed posting restriction is in force: can read, can't post or react. */
  postingRestrictedUntil: string | null;
}

export interface AdminInvite {
  id: string;
  email: string;
  displayName: string;
  isAdult: boolean;
  roles: LeaderRole[];
  communityIds: string[];
  status: "pending" | "accepted" | "revoked" | "expired";
  expiresAt: string;
  lastSentAt: string | null;
  acceptedAt: string | null;
  createdAt: string;
}

export interface AdminGroup {
  id: string;
  communityId: string;
  kind: "announcements" | "group";
  name: string;
  department: string | null;
  description: string | null;
  state: "active" | "frozen" | "archived";
  freezeKind: "auto" | "manual" | null;
  frozenReason: string | null;
  memberCount: number;
  adultCount: number;
  createdAt: string;
}

export interface AdminCommunity {
  id: string;
  name: string;
  description: string | null;
  archived: boolean;
  memberCount: number;
  groupCount: number;
  pausedGroupCount: number;
  createdAt: string;
}

export interface AdminPerson {
  id: string;
  displayName: string;
  isAdult: boolean;
  role: "admin" | "member";
  joinedAt: string;
}

export interface AdminCommunityDetail {
  community: AdminCommunity;
  groups: AdminGroup[];
  members: AdminPerson[];
}

export interface AdminGroupDetail {
  group: AdminGroup;
  communityName: string;
  members: AdminPerson[];
}

export interface AdminOverview {
  activeMembers: number;
  pendingRequests: number;
  unsubmittedSignIns: number;
  openInvites: number;
  communities: number;
  groups: number;
  pausedGroups: number;
  suspended: number;
}

export interface AdminSettings {
  allowAccessRequests: boolean;
  inviteExpiryDays: number;
  minBuildIos: number;
  minBuildAndroid: number;
  forceUpdateMessage: string | null;
  maintenanceMessage: string | null;
  retentionDays: number;
  churchSuiteConfigured: boolean;
}

export const LEADER_ROLE_LABELS: Record<LeaderRole, string> = {
  admin: "Admin",
  senior_leader: "Senior Leader",
  cg_leader: "CG Leader",
};

export const ADMIN_API = "/api/admin/destiny-one";

/** "Report a problem" / "Send feedback" from the app (d1_feedback). */
export interface AdminFeedback {
  id: string;
  kind: "problem" | "idea";
  body: string;
  status: "new" | "done";
  memberId: string;
  memberName: string;
  appVersion: string | null;
  platform: string | null;
  osVersion: string | null;
  device: string | null;
  /** The matching crash-reporting (Sentry) event, if the app had one. */
  errorId: string | null;
  createdAt: string;
  doneAt: string | null;
}

// ── Used by the D1 Admin desktop app ────────────────────────────────────────

/** GET /whoami — which admin areas the caller can open. All false for a leader. */
export interface AdminWhoami {
  destinyOneAdmin: boolean;
  safeguardingAdmin: boolean;
  /** Can open a conversation (transcript). Needs the Safeguarding Admin role itself. */
  transcriptReader: boolean;
  superAdmin: boolean;
}

/** GET /members/[id] */
export interface AdminMemberDetail {
  member: AdminMember;
  communities: { id: string; name: string; role: "admin" | "member" }[];
  groups: { id: string; name: string; kind: string; state: string; communityId: string; role: "admin" | "member" }[];
}

/** GET /churchsuite?q= — an optional "is this person in ChurchSuite?" lookup. */
export interface AdminChurchSuiteMatch {
  kind: "contact" | "child";
  id: number;
  displayName: string;
  isAdult: boolean;
  emailMatches: boolean;
  status: string | null;
}

export type AdminReportStatus = "open" | "reviewing" | "closed";

/** GET /safeguarding/reports?status= — one reported message, opened for the reviewer. */
export interface AdminReport {
  id: number;
  group_id: string;
  reason: string;
  status: AdminReportStatus;
  resolution: string | null;
  resolved_at: string | null;
  escalated_at: string | null;
  created_at: string;
  reporter: { id: string; display_name: string } | null;
  group: { id: string; name: string } | null;
  message: {
    id: number;
    body: string | null;
    content: unknown;
    created_at: string;
    deleted_at: string | null;
    deleted_by_admin: boolean | null;
    sender: { id: string; display_name: string } | null;
  } | null;
}

/** GET /safeguarding/groups — every group, with its community's name. */
export interface AdminSafeguardingGroup extends AdminGroup {
  communityName: string;
}

/** GET /safeguarding/groups/[id]/transcript — an audited read of one conversation. */
export interface AdminTranscript {
  group: { id: string; name: string; kind: string; department: string | null; state: string; frozen_reason: string | null };
  window: { from: string; to: string };
  members: { id: string; displayName: string; isAdult: boolean; status: string; role: "admin" | "member"; joinedAt: string; leftAt: string | null }[];
  messages: {
    id: number;
    body: string | null;
    reply_to: number | null;
    created_at: string;
    edited_at: string | null;
    deleted_at: string | null;
    sender: { id: string; display_name: string } | null;
    attachment: { id: string; mime_type: string; size_bytes: number; url: string | null } | null;
  }[];
}

/** GET /safeguarding/audit — the Destiny One slice of the audit log. */
export interface AdminAuditEntry {
  id: number;
  created_at: string;
  actor_email: string | null;
  section: string;
  action: string;
  entity: string;
  entity_label: string | null;
  summary: string;
}

export interface AdminAuditPage {
  entries: AdminAuditEntry[];
  nextBefore: number | null;
}
