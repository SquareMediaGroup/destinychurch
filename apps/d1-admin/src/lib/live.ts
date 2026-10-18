// Everything that keeps running while D1 Admin sits in the menu bar:
//   - Realtime for every group the member is in (chat stays current)
//   - banners for new messages, new reports and new access requests
//   - the count beside the menu bar icon, and the popover's contents
//
// Mounted once by the app shell after sign-in. Banners respect the group's
// mute, "Show message previews", and "Pause notifications for 1 hour".

import { useEffect, useMemo, useRef } from "react";
import type { D1CommunitySummary } from "@destiny/shared";
import { api } from "@/lib/api";
import { usePausedGroups, usePending, useReports } from "@/lib/adminData";
import { allGroups, applyEvent, currentOpenGroup, invalidateCommunities, useAssistant, useCommunities } from "@/lib/chat";
import { initials, plural } from "@/lib/format";
import { MENUBAR_HELLO, MENUBAR_OPEN, MENUBAR_PAUSE, MENUBAR_REPLY, MENUBAR_STATE, type MenubarState, type MenubarTarget } from "@/lib/menubarTypes";
import { emitTo, listenTo, notify, setTrayCount, showMain } from "@/lib/native";
import { nav } from "@/lib/nav";
import { getPrefs, setPrefs, usePrefs } from "@/lib/prefs";
import { queryClient } from "@/lib/queryClient";
import { startHub, type Hub } from "@/lib/realtime";
import { useReady } from "@/lib/session";
import { supabase } from "@/lib/supabase";

function bannersAllowed(): boolean {
  const p = getPrefs();
  return p.notifications && Date.now() > p.pausedUntil;
}

function groupName(communities: D1CommunitySummary[] | undefined, id: string, assistant?: { id: string; muted: boolean }): { name: string; muted: boolean } {
  if (assistant && assistant.id === id) return { name: "DestinyAI", muted: assistant.muted };
  for (const c of communities ?? []) {
    const g = c.groups.find((x) => x.id === id);
    if (g) return { name: g.kind === "announcements" ? `${c.name} Announcements` : g.name, muted: g.muted };
  }
  return { name: "Destiny One", muted: false };
}

export function useLive() {
  const { me, roles } = useReady();
  const prefs = usePrefs();
  const communities = useCommunities();
  const assistant = useAssistant();
  const reports = useReports("open", roles.safeguardingAdmin);
  const pending = usePending(roles.destinyOneAdmin);
  const paused = usePausedGroups(roles.safeguardingAdmin);

  const hub = useRef<Hub | null>(null);
  const communitiesRef = useRef(communities.data);
  communitiesRef.current = communities.data;
  const assistantRef = useRef(assistant.data);
  assistantRef.current = assistant.data;

  // Realtime, for the whole signed-in session.
  useEffect(() => {
    hub.current = startHub(
      supabase,
      me.id,
      (event) => {
        applyEvent(event, me.id);
        if (event.event !== "message") return;
        const p = event.payload;
        if (p.sender.id === me.id || !bannersAllowed()) return;
        const { name, muted } = groupName(communitiesRef.current, p.groupId, assistantRef.current);
        if (muted) return;
        if (document.hasFocus() && currentOpenGroup() === p.groupId) return;
        const body = getPrefs().previews ? `${p.sender.displayName}: ${p.body ?? (p.attachmentId ? "Sent a file" : "New message")}` : "New message";
        void notify(name, body);
      },
      // Broadcast doesn't replay: after a drop, everything cached (open chats
      // included) may have missed messages, so all of it goes stale.
      () => void queryClient.invalidateQueries(),
    );
    return () => hub.current?.stop();
  }, [me.id]);

  const groupIds = useMemo(
    () => [...allGroups(communities.data).map((g) => g.id), ...(assistant.data ? [assistant.data.id] : [])].join(","),
    [communities.data, assistant.data],
  );
  useEffect(() => {
    hub.current?.setGroups(groupIds ? groupIds.split(",") : []);
  }, [groupIds]);

  // Banners for new reports and access requests (they refresh on a timer).
  const seenReports = useRef<Set<number> | null>(null);
  useEffect(() => {
    if (!reports.data) return;
    const ids = new Set(reports.data.map((r) => r.id));
    if (seenReports.current && bannersAllowed()) {
      for (const r of reports.data) {
        if (seenReports.current.has(r.id)) continue;
        void notify(
          "New report",
          getPrefs().previews && r.group ? `A message in ${r.group.name} was reported. Review it in D1 Admin.` : "A message was reported. Review it in D1 Admin.",
        );
      }
    }
    seenReports.current = ids;
  }, [reports.data]);

  const seenRequests = useRef<Set<string> | null>(null);
  useEffect(() => {
    if (!pending.data) return;
    const submitted = pending.data.filter((m) => m.requestSubmittedAt);
    if (seenRequests.current && bannersAllowed()) {
      const fresh = submitted.filter((m) => !seenRequests.current!.has(m.id));
      if (fresh.length) void notify("Access requests", `${plural(fresh.length, "new request")} waiting for approval.`);
    }
    seenRequests.current = new Set(submitted.map((m) => m.id));
  }, [pending.data]);

  // The menu bar: icon count and popover contents.
  const state = useMemo<MenubarState>(() => {
    const attention: MenubarState["attention"] = [];
    const openReports = reports.data?.length ?? 0;
    const requests = pending.data?.filter((m) => m.requestSubmittedAt).length ?? 0;
    if (openReports) attention.push({ key: "reports", label: "Open reports", count: openReports, accent: true, action: null, target: { kind: "admin", page: "reports" } });
    if (requests) attention.push({ key: "requests", label: "Access requests", count: requests, accent: false, action: null, target: { kind: "admin", page: "requests" } });
    for (const g of paused.data ?? []) {
      attention.push({ key: `paused-${g.id}`, label: `${g.name} is paused`, count: null, accent: false, action: "Review", target: { kind: "admin", page: "paused" } });
    }
    const unread = (communities.data ?? []).flatMap((c) =>
      c.groups
        .filter((g) => g.unreadCount > 0 && !g.muted)
        .map((g) => ({
          groupId: g.id,
          name: g.kind === "announcements" ? `${c.name} Announcements` : g.name,
          initials: initials(g.name),
          announcements: g.kind === "announcements",
          count: g.unreadCount,
          line: g.lastMessage
            ? `${g.lastMessage.senderName ? `${g.lastMessage.senderName.split(" ")[0]}: ` : ""}${g.lastMessage.deleted ? "Message deleted" : g.lastMessage.preview ?? (g.lastMessage.hasAttachment ? "File" : "")}`
            : "",
        })),
    );
    return { signedIn: true, attention, unread, pausedUntil: prefs.pausedUntil };
  }, [reports.data, pending.data, paused.data, communities.data, prefs.pausedUntil]);

  useEffect(() => {
    const count = state.attention.reduce((n, a) => n + (a.count ?? 1), 0) + state.unread.length;
    void setTrayCount(count);
    void emitTo(MENUBAR_STATE, state);
  }, [state]);

  // Requests from the popover.
  const stateRef = useRef(state);
  stateRef.current = state;
  useEffect(() => {
    const offs: Promise<() => void>[] = [
      listenTo<null>(MENUBAR_HELLO, () => void emitTo(MENUBAR_STATE, stateRef.current)),
      listenTo<MenubarTarget>(MENUBAR_OPEN, (t) => {
        if (t.kind === "group") nav.openGroup(t.groupId);
        else nav.openAdmin(t.page);
        void showMain();
      }),
      listenTo<{ groupId: string; body: string }>(MENUBAR_REPLY, ({ groupId, body }) => {
        void api.send(groupId, { body }).then(invalidateCommunities, () => {
          void notify("Couldn't send", "Open D1 Admin to try again.");
        });
      }),
      listenTo<null>(MENUBAR_PAUSE, () => {
        const p = getPrefs();
        setPrefs({ pausedUntil: p.pausedUntil > Date.now() ? 0 : Date.now() + 60 * 60_000 });
      }),
    ];
    return () => offs.forEach((o) => void o.then((off) => off()));
  }, []);

  // Signed out: clear the icon and popover.
  useEffect(
    () => () => {
      void setTrayCount(0);
      void emitTo<MenubarState>(MENUBAR_STATE, { signedIn: false, attention: [], unread: [], pausedUntil: 0 });
    },
    [],
  );
}
