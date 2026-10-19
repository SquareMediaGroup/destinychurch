// The parts shown on status.destinytees.uk, for the incident form in
// /admin/status. Keep in step with componentCatalog in
// apps/status/src/lib/status.ts (a separate app, so it can't import this).

export const STATUS_COMPONENTS = [
  { id: "pages", service: "Destiny Church website", name: "Website pages" },
  { id: "sermons", service: "Destiny Church website", name: "Sermons" },
  { id: "events", service: "Destiny Church website", name: "Events and What's On" },
  { id: "shop", service: "Destiny Church website", name: "Shop and checkout" },
  { id: "giving", service: "Destiny Church website", name: "Giving" },
  { id: "search", service: "Destiny Church website", name: "AI search" },
  { id: "admin", service: "Destiny Church website", name: "Admin and staff portal" },
  { id: "d1-signin", service: "Destiny One", name: "Sign-in" },
  { id: "d1-chats", service: "Destiny One", name: "Chats and messages" },
  { id: "d1-realtime", service: "Destiny One", name: "Live updates" },
  { id: "d1-media", service: "Destiny One", name: "Photos and voice notes" },
  { id: "d1-push", service: "Destiny One", name: "Notifications" },
  { id: "d1-admin", service: "Destiny One", name: "D1 Admin" },
] as const;

export const STATUS_COMPONENT_IDS: readonly string[] = STATUS_COMPONENTS.map((c) => c.id);

export type IncidentKind = "outage" | "degraded" | "maintenance";

export const INCIDENT_KINDS: { value: IncidentKind; label: string }[] = [
  { value: "outage", label: "Outage" },
  { value: "degraded", label: "Amber alert" },
  { value: "maintenance", label: "Maintenance" },
];

export function incidentKindLabel(kind: string): string {
  return INCIDENT_KINDS.find((k) => k.value === kind)?.label ?? kind;
}

export interface StatusIncidentUpdate {
  id: number;
  incident_id: number;
  body: string;
  created_at: string;
}

export interface StatusIncident {
  id: number;
  title: string;
  kind: IncidentKind;
  components: string[];
  started_at: string;
  resolved_at: string | null;
  long_outage_alerted_at: string | null;
  created_at: string;
  status_incident_updates: StatusIncidentUpdate[];
}
