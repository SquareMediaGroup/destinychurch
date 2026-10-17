// The Destiny One admin API's shapes now live in the shared package
// (packages/shared/src/destinyOne/adminTypes.ts), so the website and the D1
// Admin desktop app (applications/d1-admin) read the same types. Re-exported here so
// the website's imports didn't have to change.

export { ADMIN_API, LEADER_ROLE_LABELS } from "@destiny/shared";
export type {
  AdminAuditEntry,
  AdminAuditPage,
  AdminChurchSuiteMatch,
  AdminCommunity,
  AdminCommunityDetail,
  AdminFeedback,
  AdminGroup,
  AdminGroupDetail,
  AdminInvite,
  AdminMember,
  AdminMemberDetail,
  AdminOverview,
  AdminPerson,
  AdminReport,
  AdminReportStatus,
  AdminSafeguardingGroup,
  AdminSettings,
  AdminTranscript,
  AdminWhoami,
  LeaderRole,
  MemberStatus,
} from "@destiny/shared";
