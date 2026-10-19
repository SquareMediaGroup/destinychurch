import { NextResponse } from "next/server";
import { createServiceClient } from "@/utils/supabase/service";
import { recordAudit } from "@/lib/audit.server";
import { incidentKindLabel } from "@/lib/statusComponents";
import { INCIDENT_SELECT, cleanText, parseComponents, parseKind } from "@/lib/statusIncidents.server";

// GET  /api/admin/status/incidents  — open incidents, then the last 30 days of resolved ones
// POST /api/admin/status/incidents  — { title, kind, components, message } opens one
//
// Site Admin (lib/adminRoles.ts). Published on status.destinytees.uk.

export async function GET() {
  const since = new Date(Date.now() - 30 * 24 * 60 * 60_000).toISOString();
  const { data, error } = await createServiceClient()
    .from("status_incidents")
    .select(INCIDENT_SELECT)
    .or(`resolved_at.is.null,resolved_at.gt.${since}`)
    .order("started_at", { ascending: false })
    .order("created_at", { referencedTable: "status_incident_updates", ascending: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}

export async function POST(request: Request) {
  const body = await request.json().catch(() => ({}));
  const title = cleanText(body.title, 200);
  const kind = parseKind(body.kind);
  const components = parseComponents(body.components);
  const message = cleanText(body.message, 2000);

  if (!title || !kind || !components || components.length === 0 || !message) {
    return NextResponse.json(
      { error: "A title, a type, at least one affected part and a first update are required." },
      { status: 400 },
    );
  }

  const supabase = createServiceClient();
  const { data: incident, error } = await supabase
    .from("status_incidents")
    .insert({ title, kind, components })
    .select("id, title, kind, components, started_at")
    .single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const { error: updateError } = await supabase
    .from("status_incident_updates")
    .insert({ incident_id: incident.id, body: message });
  if (updateError) return NextResponse.json({ error: updateError.message }, { status: 500 });

  await recordAudit({
    action: "create",
    section: "site",
    entity: "status incident",
    entityId: incident.id,
    entityLabel: title,
    summary: `Posted the ${incidentKindLabel(kind).toLowerCase()} “${title}” on the status page`,
    after: { ...incident, message },
  });

  return NextResponse.json(incident, { status: 201 });
}
