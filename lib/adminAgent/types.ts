// DestinyAI for Destiny Admin — the shapes the chat page and the API share.
// Client-safe: no server imports.

export type ActionRisk = "write" | "destructive";

export type ActionStatus = "pending" | "executed" | "failed" | "skipped" | "undone";

export type PlanStatus = "pending" | "executed" | "partial" | "failed" | "cancelled";

/** An optional add-on DestinyAI suggested for a step ("Remove it at 3pm"). */
export interface FollowUp {
  label: string;
  /** Merged into the step's arguments when switched on. */
  changes: Record<string, unknown>;
  on_by_default: boolean;
}

export interface PlanAction {
  id: string;
  position: number;
  tool: string;
  label: string;
  detail: string | null;
  risk: ActionRisk;
  warnings: string[];
  follow_ups: FollowUp[];
  status: ActionStatus;
  error: string | null;
  executed_at: string | null;
  undone_at: string | null;
  /** Whether this step can still be undone (executed, has an undo, not stale). */
  undoable: boolean;
}

export interface Plan {
  id: string;
  summary: string | null;
  status: PlanStatus;
  created_at: string;
  expires_at: string;
  actions: PlanAction[];
}

export interface AssistantQuestion {
  question: string;
  options: string[];
  allow_free_text: boolean;
}

/** One message as the chat page keeps it and sends it back each turn. */
export interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

export interface AssistantReply {
  reply: string;
  question: AssistantQuestion | null;
  plan: Plan | null;
}

/** POST /api/admin/assistant/plans/[id] */
export interface PlanDecision {
  decision: "confirm" | "cancel";
  /** Per action id: which follow-ups (by index) are switched on. */
  follow_ups?: Record<string, number[]>;
  /** Per action id: false to leave that step out. */
  include?: Record<string, boolean>;
  /** Ids of destructive steps the admin confirmed a second time. */
  acknowledged?: string[];
}
