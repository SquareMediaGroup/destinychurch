// The shape of one DestinyAI tool. Server-only in practice (tools import route
// handlers), but this file itself has no server imports so tests can use it.
//
// Two kinds:
//   read   runs as soon as the model calls it (get_banner, find_posts).
//   write  never runs from the model. assess() describes what it *would* do
//          and how risky that is; the server stores that as a pending step,
//          and execute() only runs after an admin confirms the plan.
//
// The risk comes from assess(), which looks at the live state. It is never
// taken from the model, so "this replaces the banner that's up right now" is
// decided by what's actually up right now.

import type { z } from "zod";
import type { ActionRisk } from "./types";
import type { AgentActor } from "./context.server";

export interface ToolContext {
  actor: AgentActor;
  /** Fixed for the whole turn, so every step agrees on what "now" is. */
  now: number;
  /**
   * True when re-checking a step at Confirm rather than proposing it. A start
   * time that was a few minutes away when proposed may have passed by then;
   * that should mean "straight away", not a refusal.
   */
  confirming?: boolean;
}

export interface Assessment {
  risk: ActionRisk;
  /** One line for the plan card: what will happen. */
  label: string;
  /** The when/where under it. */
  detail?: string;
  /** Things the admin should know before confirming. */
  warnings?: string[];
  /** The current state, kept so the step can be undone. */
  before?: unknown;
}

export interface ExecutedStep {
  args: Record<string, unknown>;
  before: unknown;
  after: unknown;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyObject = z.ZodObject<any>;

export interface ReadTool<S extends AnyObject = AnyObject> {
  kind: "read";
  name: string;
  description: string;
  schema: S;
  run(args: z.infer<S>, ctx: ToolContext): Promise<unknown>;
}

export interface WriteTool<S extends AnyObject = AnyObject> {
  kind: "write";
  name: string;
  description: string;
  schema: S;
  /** Validate against the live state and describe the change. Throws AgentError to refuse. */
  assess(args: z.infer<S>, ctx: ToolContext): Promise<Assessment>;
  /** Make the change. Returns the state afterwards, for undo's "changed since?" check. */
  execute(args: z.infer<S>, ctx: ToolContext, assessment: Assessment): Promise<{ after: unknown }>;
  /** Put things back. Throws AgentError if they've changed since. Omit when there is no undo. */
  undo?(step: ExecutedStep, ctx: ToolContext): Promise<void>;
}

export type AgentTool = ReadTool | WriteTool;

export function readTool<S extends AnyObject>(tool: Omit<ReadTool<S>, "kind">): ReadTool {
  return { kind: "read", ...tool } as unknown as ReadTool;
}

export function writeTool<S extends AnyObject>(tool: Omit<WriteTool<S>, "kind">): WriteTool {
  return { kind: "write", ...tool } as unknown as WriteTool;
}

/** Shallow "has this changed since we did it?" over the fields that matter. */
export function sameFields(
  a: Record<string, unknown> | null | undefined,
  b: Record<string, unknown> | null | undefined,
  fields: string[],
): boolean {
  if (!a || !b) return false;
  return fields.every((f) => normalise(a[f]) === normalise(b[f]));
}

function normalise(value: unknown): string {
  if (value === undefined || value === null || value === "") return "";
  if (typeof value === "string" && /^\d{4}-\d{2}-\d{2}T/.test(value)) {
    const t = new Date(value).getTime();
    return Number.isNaN(t) ? value : String(t);
  }
  return JSON.stringify(value);
}
