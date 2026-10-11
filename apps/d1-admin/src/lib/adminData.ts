// Admin data: react-query hooks over /api/admin/destiny-one/*. Reports and
// access requests have no Realtime channel, so they refresh on a timer while
// the app runs (src/lib/live.ts turns new ones into notifications).

import { useQuery } from "@tanstack/react-query";
import type { AdminReportStatus } from "@destiny/shared";
import { admin } from "@/lib/api";
import { queryClient } from "@/lib/queryClient";

export const adminKeys = {
  reports: (status: AdminReportStatus) => ["admin", "reports", status] as const,
  pending: ["admin", "members", "pending"] as const,
  members: ["admin", "members", "all"] as const,
  member: (id: string) => ["admin", "member", id] as const,
  paused: ["admin", "paused"] as const,
  communities: ["admin", "communities"] as const,
  community: (id: string) => ["admin", "community", id] as const,
  group: (id: string) => ["admin", "group", id] as const,
  invites: ["admin", "invites"] as const,
  feedback: ["admin", "feedback"] as const,
  settings: ["admin", "settings"] as const,
  audit: ["admin", "audit"] as const,
};

const MINUTE = 60_000;

export function useReports(status: AdminReportStatus, enabled = true) {
  return useQuery({ queryKey: adminKeys.reports(status), queryFn: () => admin.reports(status), enabled, refetchInterval: status === "open" ? MINUTE : false });
}

export function usePending(enabled = true) {
  return useQuery({ queryKey: adminKeys.pending, queryFn: () => admin.members("pending"), enabled, refetchInterval: 2 * MINUTE });
}

export function useMembers(enabled = true) {
  return useQuery({ queryKey: adminKeys.members, queryFn: () => admin.members(), enabled });
}

/** Paused (frozen) groups, from the safeguarding list. */
export function usePausedGroups(enabled = true) {
  return useQuery({
    queryKey: adminKeys.paused,
    queryFn: async () => (await admin.safeguardingGroups()).filter((g) => g.state === "frozen"),
    enabled,
    refetchInterval: 2 * MINUTE,
  });
}

export function useAdminGroup(id: string | null) {
  return useQuery({ queryKey: adminKeys.group(id ?? ""), queryFn: () => admin.group(id!), enabled: !!id });
}

export function useAdminCommunities(enabled = true) {
  return useQuery({ queryKey: adminKeys.communities, queryFn: () => admin.communities(), enabled });
}

export function useAdminCommunity(id: string | null) {
  return useQuery({ queryKey: adminKeys.community(id ?? ""), queryFn: () => admin.community(id!), enabled: !!id });
}

export function useInvites(enabled = true) {
  return useQuery({ queryKey: adminKeys.invites, queryFn: () => admin.invites(), enabled });
}

export function useFeedback(enabled = true) {
  return useQuery({ queryKey: adminKeys.feedback, queryFn: () => admin.feedback(), enabled });
}

export function useSettings(enabled = true) {
  return useQuery({ queryKey: adminKeys.settings, queryFn: () => admin.settings(), enabled });
}

export function invalidateAdmin(...parts: string[]) {
  void queryClient.invalidateQueries({ queryKey: ["admin", ...parts] });
}
