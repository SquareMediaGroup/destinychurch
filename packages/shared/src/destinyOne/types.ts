// Destiny One — the wire types for /api/app/v1/one/*.
//
// Shared by the BFF (which produces them) and the Expo app (which consumes them
// through createDestinyOneClient), so a field rename breaks the type-check on
// both sides at once instead of silently at runtime on one.
//
// Deliberately absent from every type here: phone numbers, email addresses,
// dates of birth. The app never receives another person's contact details.

export type D1MemberStatus = "pending" | "active" | "suspended" | "deleted";
/**
 * Account-level leader roles. All three carry the same powers (create groups and
 * communities, search the directory); they differ only in the tag shown beside
 * the person's name in chats and on their profile.
 */
export type D1LeaderRole = "admin" | "cg_leader" | "senior_leader";
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
  /** Signed in, no invite: show the access request form (POST /me/access-request). */
  | "access_request_needed"
  /** Waiting for approval, or invite-only. Show `message`. */
  | "not_verified"
  | "consent_required"
  | "forbidden"
  | "not_found"
  | "invalid"
  | "rule_violation"
  | "rate_limited"
  | "unavailable";

/**
 * GET /config — read before sign-in. The app shows the update screen when its
 * native build number is below `minBuild` for its platform, and the
 * maintenance screen whenever `maintenanceMessage` is set.
 */
export interface D1AppConfig {
  minBuild: { ios: number; android: number };
  /** Replaces the default update-screen copy. */
  forceUpdateMessage: string | null;
  /** When set, the app shows this instead of working. */
  maintenanceMessage: string | null;
  /** Where the Update button goes. */
  storeUrl: { ios: string; android: string };
}

export interface D1Consent {
  document: D1ConsentDocument;
  version: string;
}

export interface D1Me {
  id: string;
  displayName: string;
  /** displayName is "firstName lastName". Members can change both themselves (PATCH /me). */
  firstName: string;
  lastName: string;
  /** Name changes still allowed in the current 30 days (2 in any 30 days). */
  nameChangesLeft: number;
  /** When the next name change is allowed; null while any are left. */
  nextNameChangeAt: string | null;
  /** Self-uploaded profile picture as a short-lived signed link (the bucket is private). Unlike displayName, members can set this themselves. */
  avatarUrl: string | null;
  /** People I've blocked: their messages are hidden for me and don't notify me. Never hides anything from safeguarding. */
  blocked: { id: string; displayName: string }[];
  /** Shares read receipts, and so sees other people's (Profile → Privacy and safety). On by default. */
  readReceipts: boolean;
  status: D1MemberStatus;
  roles: D1LeaderRole[];
  isAdult: boolean;
  /** Has staff access to the admin side (Destiny One or Safeguarding Admin, or Super Admin). Only used to check an "Add admin account". */
  isStaff: boolean;
  /** Notices accepted so far. */
  consents: (D1Consent & { acceptedAt: string })[];
  /** Notices still to accept before chat unlocks. Empty when all done. */
  outstandingConsents: D1Consent[];
  /** Verified by Destiny staff (invite or approval) or ChurchSuite. Unverified accounts stay `pending`. */
  verified: boolean;
  verification: "invite" | "admin" | "churchsuite" | null;
  /**
   * Which screen the app should show:
   *   active            → the app
   *   request_needed    → the access request form
   *   request_submitted → "waiting for approval"
   *   invite_only       → "ask for an invite"
   *   suspended         → "speak to the church office"
   */
  onboarding: "active" | "request_needed" | "request_submitted" | "invite_only" | "suspended";
  /** Copy for the non-active states, so the wording can change without an app release. */
  onboardingMessage: string | null;
}

export interface D1AccessRequest {
  /** Their real name, as the church knows them. */
  name: string;
  /** YYYY-MM-DD. Optional; staff confirm age when approving. Only the 18th birthday is kept. */
  dateOfBirth?: string;
  /** e.g. "I serve on the Media team". Up to 500 characters. */
  note?: string;
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
  /** Short-lived signed link to the group's picture, or null when it hasn't set one. */
  iconUrl: string | null;
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
  /** Their tag in chats: the highest of their account roles, or null for an ordinary member. */
  tag: D1LeaderRole | null;
  joinedAt: string;
  /** Only sent to people who can manage the group, who need it to keep the 2-adult rule. */
  isAdult?: boolean;
}

export interface D1GroupDetail extends D1GroupSummary {
  description: string | null;
  members: D1GroupMember[];
  canManage: boolean;
  canPost: boolean;
  /** Pinned messages, newest pin first (at most 3). Only ones the caller can see. */
  pinned: D1Message[];
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

/** A link's preview, fetched once by the server after sending (the phone never contacts the site for it). */
export interface D1LinkPreview {
  url: string;
  title: string;
  description: string | null;
  siteName: string | null;
  /** https only. The one thing the phone loads from the site. */
  imageUrl: string | null;
}

export interface D1Reaction {
  emoji: string;
  count: number;
  mine: boolean;
}

/**
 * A ChurchSuite event, captured as of when it was shared into the chat. Not a
 * live mirror of ChurchSuite — the card shows what the event looked like at
 * send time, so a chat history doesn't retroactively change as the calendar
 * is edited. Tapping the card always opens `webUrl`, which is live.
 */
export interface D1EventContent {
  kind: "event";
  event: {
    seriesKey: string;
    slug: string;
    name: string;
    startsAt: string;
    location: string | null;
    imageUrl: string | null;
    webUrl: string;
  };
}

export interface D1PollOption {
  id: string;
  label: string;
}

export interface D1PollTally {
  optionId: string;
  count: number;
}

export interface D1PollContent {
  kind: "poll";
  poll: {
    id: string;
    question: string;
    options: D1PollOption[];
    allowMultiple: boolean;
    /** How many distinct members have voted at all. */
    totalVoters: number;
    votes: D1PollTally[];
    /** This member's current choice(s). Empty if they haven't voted. */
    myOptionIds: string[];
  };
}

export type D1MessageContent = D1EventContent | D1PollContent;

/** What the app sends to create a poll — the server mints option ids and tallies. */
export interface D1PollDraft {
  question: string;
  options: string[];
  allowMultiple: boolean;
}

/** What the app sends to attach an event — the server re-fetches and snapshots it. */
export interface D1EventRef {
  seriesKey: string;
  slug: string;
}

/** A ChurchSuite event, as offered in the app's event picker. */
export interface D1EventSummary {
  seriesKey: string;
  slug: string;
  name: string;
  startsAt: string;
  location: string | null;
  thumbnailUrl: string | null;
}

export interface D1Message {
  id: number;
  groupId: string;
  sender: { id: string; displayName: string } | null;
  /** Null when deleted: the content is kept for safeguarding review, never shown. */
  body: string | null;
  replyTo: number | null;
  attachment: D1Attachment | null;
  /** A poll or event embed. Independent of `body`/`attachment` — a message can carry just this. */
  content: D1MessageContent | null;
  reactions: D1Reaction[];
  createdAt: string;
  /** Set when the sender edited the text (shown as "Edited"). Earlier versions are kept for safeguarding review only. */
  editedAt: string | null;
  /** Member ids "@mentioned" in the text (only current members of the group). */
  mentions: string[];
  /** A copy of a message from another chat. Who wrote the original isn't carried across. */
  forwarded: boolean;
  /** The first link's preview. Arrives a moment after the message (a `link_preview` event). */
  linkPreview: D1LinkPreview | null;
  deleted: boolean;
  mine: boolean;
}

/** Who has read one message ("Seen by"): for its sender, and for the group's managers. */
export interface D1ReadReceipts {
  read: { id: string; displayName: string }[];
  notYet: { id: string; displayName: string }[];
  /** People who have read receipts turned off: not shown either way. */
  hidden: number;
}

export interface D1MessagePage {
  messages: D1Message[];
  /** Pass as `before` to load older messages. Null when there are no more. */
  nextBefore: number | null;
}

/** A message found by search. Only ever from groups the caller is in, since they joined. */
export interface D1MessageHit {
  id: number;
  groupId: string;
  groupName: string;
  communityName: string;
  sender: { id: string; displayName: string } | null;
  body: string;
  createdAt: string;
  mine: boolean;
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
  | { event: "message"; payload: { id: number; groupId: string; sender: { id: string; displayName: string }; body: string | null; replyTo: number | null; attachmentId: string | null; content: D1MessageContent | null; mentions: string[]; forwarded?: boolean; createdAt: string } }
  | { event: "message_deleted"; payload: { id: number; groupId: string } }
  | { event: "message_edited"; payload: { id: number; groupId: string; body: string; editedAt: string; mentions: string[] } }
  | { event: "reaction"; payload: { messageId: number; groupId: string; memberId: string; emoji: string; added: boolean } }
  | { event: "poll_vote"; payload: { messageId: number; groupId: string; votes: D1PollTally[]; totalVoters: number } }
  | { event: "members_changed"; payload: { groupId: string } }
  /** A message's link preview is ready (or was removed by an edit). */
  | { event: "link_preview"; payload: { id: number; groupId: string; preview: D1LinkPreview | null } }
  /** Someone is writing a message (sent every few seconds while they type; show it briefly). */
  | { event: "typing"; payload: { groupId: string; memberId: string; name: string } }
  /** Something was pinned or unpinned: re-fetch the group (it carries the pins). */
  | { event: "pins_changed"; payload: { groupId: string } }
  | { event: "group_state"; payload: { groupId: string; state: D1GroupState; reason: string | null } }
  /** Renamed, re-described or a new icon: re-fetch the group and the chat list. */
  | { event: "group_updated"; payload: { groupId: string } }
  | { event: "group_joined"; payload: { groupId: string } }
  | { event: "group_left"; payload: { groupId: string } }
  | { event: "community_left"; payload: { communityId: string } }
  | { event: "blocks_changed"; payload: { memberId: string; blocked: boolean } };

/** GDPR right of access: everything Destiny One holds about the caller. */
export interface D1Export {
  exportedAt: string;
  profile: {
    id: string;
    displayName: string;
    status: D1MemberStatus;
    roles: D1LeaderRole[];
    isAdult: boolean;
    /** The date they turn (or turned) 18, as set by staff. The full date of birth is never stored. */
    adultOn: string | null;
    /** From their access request: the 18th birthday worked out from the date of birth they gave. */
    declaredAdultOn: string | null;
    requestNote: string | null;
    requestSubmittedAt: string | null;
    verifiedAt: string | null;
    verification: "invite" | "admin" | "churchsuite" | null;
    /** A short-lived link to their profile picture, if they set one. */
    profilePictureUrl: string | null;
    createdAt: string;
  };
  consents: (D1Consent & { acceptedAt: string })[];
  communities: { id: string; name: string; role: D1MembershipRole; joinedAt: string }[];
  groups: { id: string; name: string; role: D1MembershipRole; joinedAt: string; leftAt: string | null }[];
  messages: { id: number; groupId: string; body: string | null; createdAt: string; deletedAt: string | null }[];
  /** Files they sent (photos and PDFs), each with a short-lived download link. */
  attachments: { id: string; groupId: string; mimeType: string; sizeBytes: number | null; createdAt: string; url: string | null }[];
  reactions: { messageId: number; emoji: string; createdAt: string }[];
  blocked: { id: string; displayName: string; since: string }[];
  reports: { id: number; reason: string; createdAt: string; status: string }[];
  /** What they sent through "Report a problem" and "Send feedback". */
  feedback: { id: string; kind: D1FeedbackKind; body: string; createdAt: string; status: D1FeedbackStatus }[];
}

// ── Feedback ────────────────────────────────────────────────────────────────

/** "problem": something isn't working. "idea": a suggestion or other feedback. */
export type D1FeedbackKind = "problem" | "idea";
export type D1FeedbackStatus = "new" | "done";

/** POST /feedback. Everything but kind and body is filled in by the app, for staff fixing a problem. */
export interface D1FeedbackInput {
  kind: D1FeedbackKind;
  body: string;
  appVersion?: string;
  platform?: string;
  osVersion?: string;
  device?: string;
  /** The last error the app sent to crash reporting, so staff can match the two. */
  errorId?: string;
}
