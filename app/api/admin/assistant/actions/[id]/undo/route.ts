// Undo one step a DestinyAI plan ran. The step's own route handler records the
// field-level change; this entry says it was an undo of a DestinyAI step.

import { NextResponse } from "next/server";
import { recordAudit } from "@/lib/audit.server";
import { AgentError, currentActor } from "@/lib/adminAgent/context.server";
import { undoAction } from "@/lib/adminAgent/plans.server";

export async function POST(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const actor = await currentActor();
  if (!actor) return NextResponse.json({ error: "Sign in again." }, { status: 401 });
  const { id } = await params;

  try {
    const { plan, label, tool } = await undoAction(actor, id);
    await recordAudit({
      action: "update",
      section: "site",
      entity: "DestinyAI step",
      entityId: id,
      entityLabel: label,
      summary: `Undid a DestinyAI step: ${label}`,
      metadata: { via: "DestinyAI", tool, plan_id: plan.id },
    });
    return NextResponse.json({ plan });
  } catch (err) {
    if (err instanceof AgentError) return NextResponse.json({ error: err.message }, { status: err.status });
    console.error("⚠️ DestinyAI undo route:", err);
    return NextResponse.json({ error: "Something went wrong." }, { status: 500 });
  }
}
