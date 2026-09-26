// Destiny One — the wire types for /api/app/v1/one/*.
//
// Shared by the BFF (which produces them) and the Expo app (which consumes them
// through createDestinyOneClient), so a field rename breaks the type-check on
// both sides at once instead of silently at runtime on one.
//
// Deliberately absent from every type here: phone numbers, email addresses,
// dates of birth. The app never receives another person's contact details.

export type D1MemberStatus = "pending" | "active" | "suspended" | "deleted";
export type D1LeaderRole = "group_leader" | "senior_leadership";
export type D1MembershipRole = "admin" | "member";
export type D1GroupKind = "announcements" | "group";
export type D1GroupState = "active" | "frozen" | "archived";
export type D1ConsentDocument = "privacy" | "terms" | "chat_review_notice";

/** Every response body. Mirrors lib/appApi.ts's AppEnvelope. */
export interface D1Envelope<T> {
  status: "ok" | "degraded";
  generatedAt: string;
  data: T;
  notice: string | null;
}

/** Body of every non-2xx response. `code` is stable; `message` is display copy. */
export interface D1ErrorBody {
  error: { code: D1ErrorCode; message: string };
}

export type D1ErrorCode =
  | "unauthenticated"
  | "not_verified"
  | "consent_required"
  | "forbidden"
  | "not_found"
  | "invalid"
  | "rule_violation"
  | "rate_limited"
  | "unavailable";

export interface D1Consent {
  document: D1ConsentDocument;
  version: string;
}

export interface D1Me {
  id: string;
  displayName: string;
  status: D1MemberStatus;
  roles: D1LeaderRole[];
  isAdult: boolean;
  /** Notices accepted so far. */
  consents: (D1Consent & { acceptedAt: string })[];
  /** Notices still to accept before chat unlocks. Empty when all done. */
  outstandingConsents: D1Consent[];
  /** Linked to a ChurchSuite record. Unlinked accounts stay `pending`. */
  verified: boolean;
}

export interface D1LastMessage {
  id: number;
  senderName: string | null;
  /** First line of the body, or null for an attachment-only / deleted message. */
  preview: string | null;
  hasAttachment: boolean;
  deleted: boolean;
  createdAt: string;
}

export interface D1GroupSummary {
  id: string;
  communityId: string;
  kind: D1GroupKind;
  name: string;
  department: string | null;
  state: D1GroupState;
  /** Why it's frozen, in plain words. Null unless state is "frozen". */
  frozenReason: string | null;
  myRole: D1MembershipRole;
  unreadCount: number;
  muted: boolean;
  lastMessage: D1LastMessage | null;
}

export interface D1CommunitySummary {
  id: string;
  name: string;
  description: string | null;
  myRole: D1MembershipRole;
  canManage: boolean;
  announcementsGroupId: string | null;
  /** Only the groups the caller is in. */
  groups: D1GroupSummary[];
}

export interface D1GroupMember {
  id: string;
  displayName: string;
  role: D1MembershipRole;
  joinedAt: string;
  /** Only sent to people who can manage the group, who need it to keep the 2-adult rule. */
  isAdult?: boolean;
}

export interface D1GroupDetail extends D1GroupSummary {
  description: string | null;
  members: D1GroupMember[];
  canManage: boolean;
  canPost: boolean;
  /** Current counts against the rules, for leaders. */
  rules?: { members: number; adults: number; minMembers: number; minAdults: number };
}

export interface D1Attachment {
  id: string;
  mimeType: string;
  sizeBytes: number | null;
  /** Short-lived signed URL. Re-fetch the page to get a fresh one. */
  url: string | null;
}

export interface D1Reaction {
  emoji: string;
  count: number;
  mine: boolean;
}

export interface D1Message {
  id: number;
  groupId: string;
  sender: { id: string; displayName: string } | null;
  /** Null when deleted: the content is kept for safeguarding review, never shown. */
  body: string | null;
  replyTo: number | null;
  attachment: D1Attachment | null;
  reactions: D1Reaction[];
  createdAt: string;
  deleted: boolean;
  mine: boolean;
}

export interface D1MessagePage {
  messages: D1Message[];
  /** Pass as `before` to load older messages. Null when there are no more. */
  nextBefore: number | null;
}

export interface D1DirectoryEntry {
  id: string;
  displayName: string;
  isAdult: boolean;
}

export interface D1UploadTicket {
  attachmentId: string;
  /** PUT the file here (Supabase signed upload URL), then post the message. */
  uploadUrl: string;
  token: string;
  path: string;
}

/** Realtime events on `d1-group:<id>` and `d1-member:<id>` (Broadcast). */
export type D1RealtimeEvent =
  | { event: "message"; payload: { id: number; groupId: string; sender: { id: string; displayName: string }; body: string | null; replyTo: number | null; attachmentId: string | null; createdAt: string } }
  | { event: "message_deleted"; payload: { id: number; groupId: string } }
  | { event: "reaction"; payload: { messageId: number; groupId: string; memberId: string; emoji: string; added: boolean } }
  | { event: "members_changed"; payload: { groupId: string } }
  | { event: "group_state"; payload: { groupId: string; state: D1GroupState; reason: string | null } }
  | { event: "group_joined"; payload: { groupId: string } }
  | { event: "group_left"; payload: { groupId: string } }
  | { event: "community_left"; payload: { communityId: string } };

export interface D1Export {
  exportedAt: string;
  profile: { id: string; displayName: string; status: D1MemberStatus; roles: D1LeaderRole[]; isAdult: boolean; createdAt: string };
  consents: (D1Consent & { acceptedAt: string })[];
  communities: { id: string; name: string; role: D1MembershipRole; joinedAt: string }[];
  groups: { id: string; name: string; role: D1MembershipRole; joinedAt: string; leftAt: string | null }[];
  messages: { id: number; groupId: string; body: string | null; createdAt: string; deletedAt: string | null }[];
  reports: { id: number; reason: string; createdAt: string; status: string }[];
}
