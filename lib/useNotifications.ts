"use client";

// The admin notification bell's data layer: fetch the initial list, then stay
// live over Realtime for whatever arrives after — one broadcast topic per
// role the signed-in admin holds (admin-notifications:<role>), matching how
// admin_notify_emit() fans a notification out in
// supabase/migrations/20260922_02_notifications.sql.
//
// Subscription pattern copied from components/live/chat/useLiveChat.ts: the
// memoised browser client, realtime.setAuth() before subscribing, a private
// channel per topic, cleanup via removeChannel on unmount.

import { useCallback, useEffect, useState } from "react";
import type { RealtimeChannel } from "@supabase/supabase-js";
import { getSupabaseBrowserClient } from "@/lib/supabase-browser";
import { ADMIN_ROLES, type RoleFlags } from "@/lib/adminRoles";

export interface NotificationItem {
  id: number;
  summary: string;
  href: string;
  section: string;
  kind: string;
  createdAt: string;
  read: boolean;
}

interface BroadcastPayload {
  id: number;
  createdAt: string;
  section: string;
  kind: string;
  summary: string;
  href: string;
}

/** Add a freshly-broadcast notification, ignoring one already in the list. */
function mergeNotification(list: NotificationItem[], next: NotificationItem): NotificationItem[] {
  if (list.some((n) => n.id === next.id)) return list;
  return [next, ...list];
}

export function useNotifications(roles: RoleFlags) {
  const [items, setItems] = useState<NotificationItem[]>([]);
  const [loaded, setLoaded] = useState(false);

  const refresh = useCallback(async () => {
    try {
      const res = await fetch("/api/admin/notifications");
      if (!res.ok) return;
      const data = (await res.json()) as NotificationItem[];
      setItems(data);
    } catch {
      // Left for the next refresh — a blip here shouldn't crash the bell.
    } finally {
      setLoaded(true);
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  // Roles held right now, deduped and stable across renders that don't
  // actually change which roles are true.
  const heldRoles = ADMIN_ROLES.filter((role) => roles[role]);
  const topicsKey = heldRoles.join(",");

  useEffect(() => {
    if (!topicsKey) return;

    const supabase = getSupabaseBrowserClient();
    const channels: RealtimeChannel[] = [];
    let cancelled = false;

    (async () => {
      await supabase.realtime.setAuth();
      if (cancelled) return;

      for (const role of topicsKey.split(",")) {
        const channel = supabase.channel(`admin-notifications:${role}`, {
          config: { private: true },
        });
        channel
          .on("broadcast", { event: "notification" }, ({ payload }) => {
            const p = payload as BroadcastPayload;
            if (!p?.id) return;
            setItems((list) =>
              mergeNotification(list, {
                id: p.id,
                summary: p.summary,
                href: p.href,
                section: p.section,
                kind: p.kind,
                createdAt: p.createdAt,
                read: false,
              }),
            );
          })
          .subscribe();
        channels.push(channel);
      }
    })();

    return () => {
      cancelled = true;
      for (const channel of channels) void supabase.removeChannel(channel);
    };
  }, [topicsKey]);

  const markRead = useCallback(async (id: number) => {
    setItems((list) => list.map((n) => (n.id === id ? { ...n, read: true } : n)));
    try {
      await fetch(`/api/admin/notifications/${id}/read`, { method: "POST" });
    } catch {
      // Optimistic update stays; the next refresh reconciles it either way.
    }
  }, []);

  const markAllRead = useCallback(async () => {
    setItems((list) => list.map((n) => ({ ...n, read: true })));
    try {
      await fetch("/api/admin/notifications/read-all", { method: "POST" });
    } catch {
      // Same as markRead — reconciled on the next refresh.
    }
  }, []);

  const unreadCount = items.filter((n) => !n.read).length;

  return { items, unreadCount, loaded, markRead, markAllRead, refresh };
}
