// Destiny One — shapes returned by /api/admin/destiny-one/* to the admin pages.
// Client-safe (no server imports). The Destiny One Admin pages never receive
// message content; only the safeguarding routes do.

export type MemberStatus = "pending" | "active" | "suspended";
export type LeaderRole = "group_leader" | "senior_leadership";

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
  retentionDays: number;
  churchSuiteConfigured: boolean;
}

export const LEADER_ROLE_LABELS: Record<LeaderRole, string> = {
  group_leader: "Group leader",
  senior_leadership: "Senior leadership",
};

export const ADMIN_API = "/api/admin/destiny-one";
