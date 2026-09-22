// recordNotification() — the one way an inbound event reaches the admin bell.
//
// Called from public-facing submission routes (new order, new application,
// new design ticket, ...) right alongside their existing insert/email logic,
// never in place of it. Writes the row, then pushes it onto a
// admin-notifications:<role> Realtime topic per lib/liveChat.server.ts's
// emit() precedent — Broadcast, not Postgres Changes, so notifications stays
// deny-all like every other admin table.
//
// Like recordAudit(), it never throws: a notification failing to write or
// broadcast must not fail the request that triggered it.

import "server-only";
import { createServiceClient } from "@/utils/supabase/service";
import type { AdminRole } from "@/lib/adminRoles";

export interface NotifyInput {
  section: string;
  kind: string;
  entityId?: string | number | null;
  entityLabel?: string | null;
  /** One plain sentence: "New order #1042 from Jane Doe". */
  summary: string;
  /** Admin deep link, e.g. /admin/store/orders?open=<id>. */
  href: string;
  /** Which AdminRoles this is relevant to. super_admin always sees it too. */
  roles: AdminRole[];
  metadata?: Record<string, unknown> | null;
}

export async function recordNotification(input: NotifyInput): Promise<void> {
  try {
    const supabase = createServiceClient();
    const { data, error } = await supabase
      .from("notifications")
      .insert({
        section: input.section,
        kind: input.kind,
        entity_id: input.entityId != null ? String(input.entityId) : null,
        entity_label: input.entityLabel ?? null,
        summary: input.summary,
        href: input.href,
        roles: input.roles,
        metadata: input.metadata ?? null,
      })
      .select("id, created_at")
      .single();

    if (error || !data) {
      console.error("⚠️ Notification write failed (notifications):", error?.message);
      return;
    }

    const payload = {
      id: data.id,
      createdAt: data.created_at,
      section: input.section,
      kind: input.kind,
      entityId: input.entityId ?? null,
      entityLabel: input.entityLabel ?? null,
      summary: input.summary,
      href: input.href,
      roles: input.roles,
    };

    const topics = new Set<string>(input.roles.map((role) => `admin-notifications:${role}`));
    topics.add("admin-notifications:super_admin");

    await Promise.all(
      [...topics].map(async (topic) => {
        const { error: emitError } = await supabase.rpc("admin_notify_emit", {
          topic,
          event: "notification",
          payload,
        });
        if (emitError) {
          console.error(`⚠️ Notification broadcast failed [${topic}]:`, emitError.message);
        }
      }),
    );
  } catch (err) {
    console.error("⚠️ Notification write threw:", err);
  }
}
