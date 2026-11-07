import { NextResponse } from "next/server";
import { createServiceClient } from "@/utils/supabase/service";
import { recordAudit } from "@/lib/audit.server";
import { cleanText, currentAuthor } from "@/lib/statusIncidents.server";

// POST /api/admin/status/incidents/[id]/updates  { message }
// Adds a line to the incident's public timeline on the status page.

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const body = await request.json().catch(() => ({}));
  const message = cleanText(body.message, 2000);
  if (!message) return NextResponse.json({ error: "Write an update first." }, { status: 400 });

  const supabase = createServiceClient();
  const { data: incident, error: findError } = await supabase
    .from("status_incidents")
    .select("id, title")
    .eq("id", id)
    .maybeSingle();
  if (findError) return NextResponse.json({ error: findError.message }, { status: 500 });
  if (!incident) return NextResponse.json({ error: "Incident not found." }, { status: 404 });

  const author = await currentAuthor();
  const { data, error } = await supabase
    .from("status_incident_updates")
    .insert({ incident_id: incident.id, body: message, author_name: author.name, created_by: author.id })
    .select("id, incident_id, body, author_name, created_at")
    .single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  await recordAudit({
    action: "create",
    section: "site",
    entity: "status update",
    entityId: data.id,
    entityLabel: incident.title,
    summary: `Posted an update on “${incident.title}” on the status page`,
    after: data,
  });

  return NextResponse.json(data, { status: 201 });
}
