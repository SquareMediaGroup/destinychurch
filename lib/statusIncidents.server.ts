// Server helpers for status page incidents (/admin/status and the cron).
import "server-only";
import { headers } from "next/headers";
import { createServiceClient } from "@/utils/supabase/service";
import { AUDIT_ACTOR_HEADERS } from "@/lib/audit";
import { STATUS_COMPONENT_IDS, type IncidentKind } from "@/lib/statusComponents";

const KINDS: IncidentKind[] = ["outage", "degraded", "maintenance"];

export const INCIDENT_SELECT =
  "id, title, kind, components, started_at, resolved_at, long_outage_alerted_at, author_name, created_at, status_incident_updates(id, incident_id, body, author_name, created_at)";

/**
 * Who is posting: their admin id (from the headers middleware sets) and their
 * profile name, which is published as the notice's author. No name on the
 * profile → "Destiny Church team"; never the email, which would be public.
 */
export async function currentAuthor(): Promise<{ id: string | null; name: string }> {
  const id = (await headers()).get(AUDIT_ACTOR_HEADERS.id) || null;
  if (!id) return { id: null, name: "Destiny Church team" };
  const { data } = await createServiceClient()
    .from("admin_roles")
    .select("name")
    .eq("auth_user_id", id)
    .maybeSingle();
  const name = (data?.name as string | null)?.trim();
  return { id, name: name || "Destiny Church team" };
}

export function parseKind(value: unknown): IncidentKind | null {
  return typeof value === "string" && (KINDS as string[]).includes(value) ? (value as IncidentKind) : null;
}

/** Known component ids only, de-duplicated. */
export function parseComponents(value: unknown): string[] | null {
  if (!Array.isArray(value)) return null;
  const ids = value.filter((v): v is string => typeof v === "string" && STATUS_COMPONENT_IDS.includes(v));
  return [...new Set(ids)];
}

export function cleanText(value: unknown, max: number): string | null {
  if (typeof value !== "string") return null;
  const text = value.trim();
  return text.length > 0 && text.length <= max ? text : null;
}
