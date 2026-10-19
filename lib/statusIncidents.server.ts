// Server helpers for status page incidents (/admin/status and the cron).
import "server-only";
import { STATUS_COMPONENT_IDS, type IncidentKind } from "@/lib/statusComponents";

const KINDS: IncidentKind[] = ["outage", "degraded", "maintenance"];

export const INCIDENT_SELECT =
  "id, title, kind, components, started_at, resolved_at, long_outage_alerted_at, created_at, status_incident_updates(id, incident_id, body, created_at)";

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
