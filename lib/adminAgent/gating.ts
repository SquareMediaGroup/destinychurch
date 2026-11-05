// The two rules that decide what runs on Confirm. Client-safe and pure, so the
// unit tests can pin them down (tests/unit/admin-assistant.spec.ts).

import type { ActionRisk, FollowUp } from "./types";

/** The arguments a step runs with: its own, plus the follow-ups switched on. */
export function argsWithFollowUps(
  action: { args: Record<string, unknown>; follow_ups: FollowUp[] },
  enabled: number[] | undefined,
): Record<string, unknown> {
  const on = enabled ?? action.follow_ups.map((f, i) => (f.on_by_default ? i : -1)).filter((i) => i >= 0);
  return on.reduce<Record<string, unknown>>(
    (args, index) => ({ ...args, ...(action.follow_ups[index]?.changes ?? {}) }),
    { ...action.args },
  );
}

/** Which included steps need a second confirmation and haven't had one. */
export function unacknowledgedDestructive(
  steps: { id: string; risk: ActionRisk }[],
  acknowledged: string[] = [],
): string[] {
  return steps.filter((s) => s.risk === "destructive" && !acknowledged.includes(s.id)).map((s) => s.id);
}
