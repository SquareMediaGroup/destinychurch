// Plans: what DestinyAI proposed, waiting for an admin to confirm.
//
// The flow, and the rules it exists to enforce:
//
//   propose   The model calls write tools. Each call is assessed against the
//             live site (risk, warnings, before-state) and kept in memory for
//             the turn; at the end of the turn they're saved as one plan.
//   confirm   Only the admin who asked can confirm, only within 30 minutes,
//             and only once (the status flip is conditional). Every step is
//             assessed again first, because the site may have changed: a step
//             that has become destructive since is sent back for a second
//             confirmation rather than run.
//   execute   Steps run in order through the real admin route handlers. The
//             first failure stops the rest, since later steps often depend on
//             earlier ones.
//   undo      Per step, within a day, by the same admin or a Super Admin, and
//             refused if the thing has been changed since.

import "server-only";
import { createServiceClient } from "@/utils/supabase/service";
import { AgentError, type AgentActor } from "./context.server";
import { writeToolNamed } from "./registry.server";
import type { Assessment, ToolContext } from "./tool";
import { argsWithFollowUps, unacknowledgedDestructive } from "./gating";
import type { ActionRisk, FollowUp, Plan, PlanAction, PlanDecision, PlanStatus } from "./types";

export const PLAN_TTL_MINUTES = 30;
export const UNDO_WINDOW_HOURS = 24;

export interface Proposal {
  tool: string;
  args: Record<string, unknown>;
  follow_ups: FollowUp[];
  assessment: Assessment;
}

interface ActionRow {
  id: string;
  plan_id: string;
  position: number;
  tool: string;
  args: Record<string, unknown>;
  follow_ups: FollowUp[];
  risk: ActionRisk;
  label: string;
  detail: string | null;
  warnings: string[];
  status: PlanAction["status"];
  before: unknown;
  after: unknown;
  error: string | null;
  executed_at: string | null;
  undone_at: string | null;
}

interface PlanRow {
  id: string;
  actor_id: string;
  prompt: string;
  summary: string | null;
  status: PlanStatus;
  created_at: string;
  expires_at: string;
}

const db = () => createServiceClient();

function missingTables(message: string) {
  return /admin_agent_(plans|actions)/.test(message) && /does not exist|schema cache/.test(message);
}

function dbError(message: string): AgentError {
  return new AgentError(
    missingTables(message)
      ? "DestinyAI's tables aren't set up yet. Apply supabase/migrations/20261105_01_admin_destinyai.sql."
      : message,
    500,
  );
}

export function canUndo(row: Pick<ActionRow, "status" | "tool" | "executed_at">, now = Date.now()): boolean {
  if (row.status !== "executed" || !row.executed_at) return false;
  if (!writeToolNamed(row.tool)?.undo) return false;
  return now - Date.parse(row.executed_at) < UNDO_WINDOW_HOURS * 3_600_000;
}

function toView(plan: PlanRow, actions: ActionRow[]): Plan {
  return {
    id: plan.id,
    summary: plan.summary,
    status: plan.status,
    created_at: plan.created_at,
    expires_at: plan.expires_at,
    actions: actions
      .sort((a, b) => a.position - b.position)
      .map((a) => ({
        id: a.id,
        position: a.position,
        tool: a.tool,
        label: a.label,
        detail: a.detail,
        risk: a.risk,
        warnings: a.warnings ?? [],
        follow_ups: a.follow_ups ?? [],
        status: a.status,
        error: a.error,
        executed_at: a.executed_at,
        undone_at: a.undone_at,
        undoable: canUndo(a),
      })),
  };
}

async function loadRows(planId: string): Promise<{ plan: PlanRow; actions: ActionRow[] } | null> {
  const supabase = db();
  const [{ data: plan, error }, { data: actions, error: actionsError }] = await Promise.all([
    supabase.from("admin_agent_plans").select("*").eq("id", planId).maybeSingle(),
    supabase.from("admin_agent_actions").select("*").eq("plan_id", planId),
  ]);
  if (error || actionsError) throw dbError((error ?? actionsError)!.message);
  if (!plan) return null;
  return { plan: plan as PlanRow, actions: (actions ?? []) as ActionRow[] };
}

/**
 * Follow-ups the model suggested, kept only if switching them on still gives
 * valid arguments for the tool. A suggestion that couldn't run is dropped
 * here rather than failing on Confirm.
 */
export function validFollowUps(toolName: string, args: Record<string, unknown>, followUps: FollowUp[]): FollowUp[] {
  const tool = writeToolNamed(toolName);
  if (!tool) return [];
  const keys = Object.keys(tool.schema.shape);
  return followUps
    .filter((f) => f.label?.trim() && f.changes && Object.keys(f.changes).every((k) => keys.includes(k)))
    .filter((f) => tool.schema.safeParse({ ...args, ...f.changes }).success)
    .slice(0, 3);
}

/** Save the turn's proposals as one pending plan; earlier pending plans are cancelled. */
export async function createPlan(
  actor: AgentActor,
  prompt: string,
  summary: string | null,
  proposals: Proposal[],
): Promise<Plan> {
  const supabase = db();
  // One open plan per admin. A new request supersedes the last one, so an old
  // card can't be confirmed after the conversation has moved on.
  await supabase
    .from("admin_agent_plans")
    .update({ status: "cancelled", decided_at: new Date().toISOString() })
    .eq("actor_id", actor.id)
    .eq("status", "pending");

  const { data: plan, error } = await supabase
    .from("admin_agent_plans")
    .insert({
      actor_id: actor.id,
      actor_email: actor.email,
      prompt: prompt.slice(0, 4000),
      summary: summary?.slice(0, 1000) ?? null,
      expires_at: new Date(Date.now() + PLAN_TTL_MINUTES * 60_000).toISOString(),
    })
    .select("*")
    .single();
  if (error || !plan) throw dbError(error?.message ?? "Couldn't save the plan.");

  const rows = proposals.map((p, index) => ({
    plan_id: plan.id,
    position: index,
    tool: p.tool,
    args: p.args,
    follow_ups: p.follow_ups,
    risk: p.assessment.risk,
    label: p.assessment.label,
    detail: p.assessment.detail ?? null,
    warnings: p.assessment.warnings ?? [],
  }));
  const { data: actions, error: actionsError } = await supabase
    .from("admin_agent_actions")
    .insert(rows)
    .select("*");
  if (actionsError) throw dbError(actionsError.message);

  return toView(plan as PlanRow, (actions ?? []) as ActionRow[]);
}

export async function getPlan(actor: AgentActor, planId: string): Promise<Plan> {
  const rows = await loadRows(planId);
  if (!rows || rows.plan.actor_id !== actor.id) throw new AgentError("That plan wasn't found.", 404);
  return toView(rows.plan, rows.actions);
}

export type DecideResult =
  | { kind: "done"; plan: Plan; prompt: string }
  | { kind: "needs_acknowledgement"; plan: Plan; ids: string[] };

export async function decidePlan(actor: AgentActor, planId: string, decision: PlanDecision): Promise<DecideResult> {
  const supabase = db();
  const rows = await loadRows(planId);
  if (!rows || rows.plan.actor_id !== actor.id) throw new AgentError("That plan wasn't found.", 404);
  const { plan } = rows;
  if (plan.status !== "pending") throw new AgentError("This plan has already been dealt with.", 409);

  if (decision.decision === "cancel") {
    await supabase
      .from("admin_agent_plans")
      .update({ status: "cancelled", decided_at: new Date().toISOString() })
      .eq("id", plan.id)
      .eq("status", "pending");
    await supabase.from("admin_agent_actions").update({ status: "skipped" }).eq("plan_id", plan.id);
    const fresh = await loadRows(plan.id);
    return { kind: "done", plan: toView(fresh!.plan, fresh!.actions), prompt: plan.prompt };
  }

  if (Date.parse(plan.expires_at) < Date.now()) {
    throw new AgentError("This plan is more than 30 minutes old. Ask DestinyAI again so it checks the site afresh.", 409);
  }

  const ctx: ToolContext = { actor, now: Date.now(), confirming: true };
  const actions = rows.actions.sort((a, b) => a.position - b.position);
  const included = actions.filter((a) => decision.include?.[a.id] !== false);
  if (included.length === 0) throw new AgentError("Every step was left out, so there's nothing to do.");

  // Re-check every step against the site as it is now, before running any.
  const checked: { row: ActionRow; args: Record<string, unknown>; assessment: Assessment }[] = [];
  for (const row of included) {
    const tool = writeToolNamed(row.tool);
    if (!tool) throw new AgentError(`Step ${row.position + 1} uses a tool DestinyAI no longer has.`);
    const parsed = tool.schema.safeParse(argsWithFollowUps(row, decision.follow_ups?.[row.id]));
    if (!parsed.success) throw new AgentError(`Step ${row.position + 1} isn't valid any more. Ask again.`);
    try {
      const assessment = await tool.assess(parsed.data, ctx);
      checked.push({ row, args: parsed.data, assessment });
    } catch (err) {
      throw new AgentError(`Step ${row.position + 1}: ${(err as Error).message}`, 409);
    }
  }

  // A step that is destructive now needs its own second confirmation, even if
  // it wasn't destructive when proposed.
  const missing = unacknowledgedDestructive(
    checked.map((c) => ({ id: c.row.id, risk: c.assessment.risk })),
    decision.acknowledged,
  );
  if (missing.length > 0) {
    for (const c of checked) {
      await supabase
        .from("admin_agent_actions")
        .update({
          risk: c.assessment.risk,
          label: c.assessment.label,
          detail: c.assessment.detail ?? null,
          warnings: c.assessment.warnings ?? [],
        })
        .eq("id", c.row.id);
    }
    const fresh = await loadRows(plan.id);
    return { kind: "needs_acknowledgement", plan: toView(fresh!.plan, fresh!.actions), ids: missing };
  }

  // Claim the plan. The conditional update means a double tap (or two tabs)
  // runs it once.
  const { data: claimed } = await supabase
    .from("admin_agent_plans")
    .update({ status: "executed", decided_at: new Date().toISOString() })
    .eq("id", plan.id)
    .eq("status", "pending")
    .select("id");
  if (!claimed || claimed.length === 0) throw new AgentError("This plan has already been dealt with.", 409);

  const skippedIds = actions.filter((a) => !included.includes(a)).map((a) => a.id);
  if (skippedIds.length) {
    await supabase.from("admin_agent_actions").update({ status: "skipped" }).in("id", skippedIds);
  }

  let failed = false;
  let executed = 0;
  for (const { row, args, assessment } of checked) {
    if (failed) {
      await supabase.from("admin_agent_actions").update({ status: "skipped" }).eq("id", row.id);
      continue;
    }
    const tool = writeToolNamed(row.tool)!;
    try {
      const { after } = await tool.execute(args, ctx, assessment);
      executed += 1;
      await supabase
        .from("admin_agent_actions")
        .update({
          status: "executed",
          args,
          risk: assessment.risk,
          label: assessment.label,
          detail: assessment.detail ?? null,
          warnings: assessment.warnings ?? [],
          before: assessment.before ?? null,
          after: after ?? null,
          executed_at: new Date().toISOString(),
        })
        .eq("id", row.id);
    } catch (err) {
      failed = true;
      await supabase
        .from("admin_agent_actions")
        .update({ status: "failed", error: (err as Error).message.slice(0, 500) })
        .eq("id", row.id);
    }
  }

  const status: PlanStatus = !failed ? "executed" : executed > 0 ? "partial" : "failed";
  if (status !== "executed") await supabase.from("admin_agent_plans").update({ status }).eq("id", plan.id);

  const fresh = await loadRows(plan.id);
  return { kind: "done", plan: toView(fresh!.plan, fresh!.actions), prompt: plan.prompt };
}

export async function undoAction(
  actor: AgentActor,
  actionId: string,
): Promise<{ plan: Plan; label: string; tool: string }> {
  const supabase = db();
  const { data: row, error } = await supabase.from("admin_agent_actions").select("*").eq("id", actionId).maybeSingle();
  if (error) throw dbError(error.message);
  if (!row) throw new AgentError("That step wasn't found.", 404);
  const action = row as ActionRow;
  const rows = await loadRows(action.plan_id);
  if (!rows) throw new AgentError("That step wasn't found.", 404);
  if (rows.plan.actor_id !== actor.id && !actor.roles.super_admin) {
    throw new AgentError("Only the admin who ran this, or a Super Admin, can undo it.", 403);
  }
  if (!canUndo(action)) throw new AgentError("This step can't be undone any more.", 409);

  // Claim first, so a double tap undoes once; hand it back if the undo fails.
  const { data: claimed } = await supabase
    .from("admin_agent_actions")
    .update({ status: "undone", undone_at: new Date().toISOString() })
    .eq("id", action.id)
    .eq("status", "executed")
    .select("id");
  if (!claimed?.length) throw new AgentError("This step was already undone.", 409);

  const tool = writeToolNamed(action.tool)!;
  try {
    await tool.undo!({ args: action.args, before: action.before, after: action.after }, { actor, now: Date.now() });
  } catch (err) {
    await supabase.from("admin_agent_actions").update({ status: "executed", undone_at: null }).eq("id", action.id);
    throw err;
  }

  const fresh = await loadRows(action.plan_id);
  return { plan: toView(fresh!.plan, fresh!.actions), label: action.label, tool: action.tool };
}
