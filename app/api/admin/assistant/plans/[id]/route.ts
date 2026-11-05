// Confirm or cancel a plan DestinyAI proposed.
//
// Each step runs through its admin page's own route handler, which records its
// own audit entry as the confirming admin (path: this route). This entry adds
// the "why": the plan as a whole and what was asked for.

import { NextResponse } from "next/server";
import { recordAudit } from "@/lib/audit.server";
import { AgentError, currentActor } from "@/lib/adminAgent/context.server";
import { decidePlan, getPlan } from "@/lib/adminAgent/plans.server";
import type { PlanDecision } from "@/lib/adminAgent/types";

export const maxDuration = 60;

type Params = { params: Promise<{ id: string }> };

function failure(err: unknown) {
  if (err instanceof AgentError) return NextResponse.json({ error: err.message }, { status: err.status });
  console.error("⚠️ DestinyAI plan route:", err);
  return NextResponse.json({ error: "Something went wrong." }, { status: 500 });
}

export async function GET(_request: Request, { params }: Params) {
  const actor = await currentActor();
  if (!actor) return NextResponse.json({ error: "Sign in again." }, { status: 401 });
  try {
    return NextResponse.json({ plan: await getPlan(actor, (await params).id) });
  } catch (err) {
    return failure(err);
  }
}

export async function POST(request: Request, { params }: Params) {
  const actor = await currentActor();
  if (!actor) return NextResponse.json({ error: "Sign in again." }, { status: 401 });
  const { id } = await params;
  const body = (await request.json().catch(() => null)) as PlanDecision | null;
  if (body?.decision !== "confirm" && body?.decision !== "cancel") {
    return NextResponse.json({ error: "Say confirm or cancel." }, { status: 400 });
  }

  try {
    const result = await decidePlan(actor, id, body);
    if (result.kind === "needs_acknowledgement") {
      return NextResponse.json(
        {
          error: "Some steps would remove or replace something live. Confirm those again.",
          needs_acknowledgement: result.ids,
          plan: result.plan,
        },
        { status: 409 },
      );
    }

    if (body.decision === "confirm") {
      const ran = result.plan.actions.filter((a) => a.status === "executed");
      const failed = result.plan.actions.find((a) => a.status === "failed");
      await recordAudit({
        action: "update",
        section: "site",
        entity: "DestinyAI plan",
        entityId: id,
        entityLabel: result.plan.summary ?? "DestinyAI plan",
        summary: `Confirmed a DestinyAI plan (${ran.length} of ${result.plan.actions.length} steps done${
          failed ? `, stopped at “${failed.label}”` : ""
        }): ${ran.map((a) => a.label).join("; ") || "nothing ran"}`,
        metadata: {
          via: "DestinyAI",
          prompt: result.prompt,
          steps: result.plan.actions.map((a) => ({ label: a.label, risk: a.risk, status: a.status, error: a.error })),
        },
      });
    }
    // A cancelled plan changed nothing on the site, so it isn't logged.

    return NextResponse.json({ plan: result.plan });
  } catch (err) {
    return failure(err);
  }
}
