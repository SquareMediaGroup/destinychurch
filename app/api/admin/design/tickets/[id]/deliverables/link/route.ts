import { NextResponse } from "next/server";
import { headers } from "next/headers";
import { createServiceClient } from "@/utils/supabase/service";
import { AUDIT_ACTOR_HEADERS } from "@/lib/audit";
import { recordAudit } from "@/lib/audit.server";
import { ticketRef } from "@/lib/designTickets";

// Video never gets an upload button — a finished video is routinely bigger
// than the 50MB Supabase tier and well past what's worth proxying through a
// Vercel function. The designer instead pastes a Drive or Playbook share
// link; we just store and display it. Nothing here owns any bytes, so
// there's nothing to clean up on delete beyond the row itself.
export const runtime = "nodejs";

function detectProvider(url: URL): "drive" | "playbook" | null {
  const host = url.hostname.toLowerCase();
  if (host === "drive.google.com" || host.endsWith(".drive.google.com")) return "drive";
  if (host === "playbook.com" || host.endsWith(".playbook.com")) return "playbook";
  return null;
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const h = await headers();
  const body = await request.json().catch(() => ({}));

  const rawUrl = typeof body.url === "string" ? body.url.trim() : "";
  const fileName = typeof body.file_name === "string" ? body.file_name.trim().slice(0, 255) : "";

  if (!rawUrl) return NextResponse.json({ error: "A link is required" }, { status: 400 });

  let parsed: URL;
  try {
    parsed = new URL(rawUrl);
  } catch {
    return NextResponse.json({ error: "That doesn't look like a valid link" }, { status: 400 });
  }
  if (parsed.protocol !== "https:") {
    return NextResponse.json({ error: "Link must be https" }, { status: 400 });
  }

  const provider = detectProvider(parsed);
  if (!provider) {
    return NextResponse.json(
      { error: "Only Google Drive or Playbook links are accepted" },
      { status: 400 },
    );
  }

  const supabase = createServiceClient();
  const { data: ticket } = await supabase
    .from("design_tickets")
    .select("id, ref, revision")
    .eq("id", id)
    .maybeSingle();

  if (!ticket) return NextResponse.json({ error: "Ticket not found" }, { status: 404 });

  const { data, error } = await supabase
    .from("design_ticket_deliverables")
    .insert({
      ticket_id: id,
      revision: ticket.revision,
      storage_kind: "link",
      link_url: parsed.toString(),
      link_provider: provider,
      file_name: fileName || (provider === "drive" ? "Video (Drive link)" : "Video (Playbook link)"),
      mime_type: "video",
      uploaded_by_email: h.get(AUDIT_ACTOR_HEADERS.email),
    })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  await supabase
    .from("design_tickets")
    .update({ last_activity_at: new Date().toISOString() })
    .eq("id", id);

  await recordAudit({
    action: "upload",
    section: "design",
    entity: "design deliverable",
    entityId: data.id,
    entityLabel: data.file_name,
    summary: `Added a ${provider === "drive" ? "Drive" : "Playbook"} video link to the design ticket ${ticketRef(ticket.ref)}`,
    after: { file_name: data.file_name, revision: ticket.revision, link_provider: provider },
  });

  return NextResponse.json(data, { status: 201 });
}
