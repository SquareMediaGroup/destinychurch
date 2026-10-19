import { NextResponse } from "next/server";
import { createServiceClient } from "@/utils/supabase/service";
import { readForAudit, recordAudit } from "@/lib/audit.server";
import { incidentKindLabel } from "@/lib/statusComponents";
import { cleanText, parseComponents, parseKind } from "@/lib/statusIncidents.server";

// PATCH /api/admin/status/incidents/[id]
//   { kind?, components?, title?, resolved?: boolean }
// Change what an incident covers, or resolve / reopen it.

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const body = await request.json().catch(() => ({}));
  const patch: Record<string, unknown> = {};

  if (body.kind !== undefined) {
    const kind = parseKind(body.kind);
    if (!kind) return NextResponse.json({ error: "Unknown type." }, { status: 400 });
    patch.kind = kind;
  }
  if (body.components !== undefined) {
    const components = parseComponents(body.components);
    if (!components || components.length === 0) {
      return NextResponse.json({ error: "Pick at least one affected part." }, { status: 400 });
    }
    patch.components = components;
  }
  if (body.title !== undefined) {
    const title = cleanText(body.title, 200);
    if (!title) return NextResponse.json({ error: "Title is required." }, { status: 400 });
    patch.title = title;
  }
  if (body.resolved !== undefined) {
    patch.resolved_at = body.resolved ? new Date().toISOString() : null;
  }
  if (Object.keys(patch).length === 0) {
    return NextResponse.json({ error: "Nothing to change." }, { status: 400 });
  }

  const before = await readForAudit("status_incidents", id);
  const { data, error } = await createServiceClient()
    .from("status_incidents")
    .update(patch)
    .eq("id", id)
    .select("id, title, kind, components, started_at, resolved_at")
    .single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const summary =
    body.resolved === true
      ? `Resolved “${data.title}” on the status page`
      : body.resolved === false
        ? `Reopened “${data.title}” on the status page`
        : `Changed “${data.title}” on the status page (${incidentKindLabel(data.kind).toLowerCase()})`;

  await recordAudit({
    action: "update",
    section: "site",
    entity: "status incident",
    entityId: id,
    entityLabel: data.title,
    summary,
    before,
    after: data,
  });

  return NextResponse.json(data);
}
