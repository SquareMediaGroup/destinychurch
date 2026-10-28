// Talent show audience voting: settings, acts, totals and the voting rules.
// The rules live here, not in the routes, so they can be unit tested.
// Separate from the judges' buzzers in apps/talent-buzzer.

import { createHash, randomBytes } from "crypto";
import { createServiceClient } from "@/utils/supabase/service";

export interface TalentSettings {
  show_name: string;
  voting_open: boolean;
  results_revealed: boolean;
  round: number;
}

export interface TalentAct {
  id: string;
  name: string;
  performers: string;
  description: string;
  sort_order: number;
  hidden: boolean;
  /** X's the act got from the judges' buzzers, typed in by an admin. */
  judge_xs: number;
}

export interface ActTotal extends TalentAct {
  /** Audience votes. */
  votes: number;
  /** What the act is ranked on: audience votes plus JUDGE_X_POINTS per judge's X. */
  score: number;
}

export const VOTER_COOKIE = "dc_talent_voter";
export const VOTER_RE = /^[A-Za-z0-9_-]{16,64}$/;
export const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export const LIMITS = { name: 80, performers: 200, description: 300, showName: 80 } as const;

/** Each judge's X counts as this many audience votes. Up to 4 judges. */
export const JUDGE_X_POINTS = 2;
export const MAX_JUDGE_XS = 4;

const DEFAULT_SETTINGS: TalentSettings = {
  show_name: "Talent Show",
  voting_open: false,
  results_revealed: false,
  round: 1,
};

const ACT_COLUMNS = "id, name, performers, description, sort_order, hidden, judge_xs";

export const hashValue = (v: string) =>
  createHash("sha256")
    .update(`${process.env.TALENT_VOTE_SALT ?? "destiny-talent-show"}:${v}`)
    .digest("hex")
    .slice(0, 32);

export const newVoterId = () => randomBytes(18).toString("base64url");

/**
 * The voter id for this request: the cookie wins over the id the page kept in
 * local storage, so clearing only one of them doesn't buy a second vote.
 */
export function pickVoterId(cookieValue: unknown, storedValue: unknown): string | null {
  if (typeof cookieValue === "string" && VOTER_RE.test(cookieValue)) return cookieValue;
  if (typeof storedValue === "string" && VOTER_RE.test(storedValue)) return storedValue;
  return null;
}

export const actScore = (votes: number, judgeXs: number) => votes + JUDGE_X_POINTS * judgeXs;

/** Ranks acts by score, then running order. Doesn't change the input. */
export function rankActs(acts: ActTotal[]): ActTotal[] {
  return [...acts].sort((a, b) => b.score - a.score || a.sort_order - b.sort_order);
}

export async function getSettings(): Promise<TalentSettings> {
  const { data } = await createServiceClient()
    .from("talent_show_settings")
    .select("show_name, voting_open, results_revealed, round")
    .eq("id", 1)
    .maybeSingle();
  return data ?? DEFAULT_SETTINGS;
}

export async function listActs({ includeHidden = false } = {}): Promise<TalentAct[]> {
  const query = (columns: string) => {
    let q = createServiceClient()
      .from("talent_show_acts")
      .select(columns)
      .order("sort_order", { ascending: true })
      .order("created_at", { ascending: true });
    if (!includeHidden) q = q.eq("hidden", false);
    return q;
  };
  const { data, error } = await query(ACT_COLUMNS);
  // Until 20261028_01_talent_show_judge_xs.sql is applied there's no judge_xs
  // column; keep the vote working without it rather than showing no acts.
  if (error?.message.includes("judge_xs")) {
    const { data: old } = await query(ACT_COLUMNS.replace(", judge_xs", ""));
    return ((old ?? []) as unknown as TalentAct[]).map((a) => ({ ...a, judge_xs: 0 }));
  }
  return (data ?? []) as unknown as TalentAct[];
}

/** Acts with their vote counts and scores for the current round. `total` is audience votes only. */
export async function getTotals(
  settings: TalentSettings,
  opts: { includeHidden?: boolean } = {},
): Promise<{ acts: ActTotal[]; total: number }> {
  const [acts, { data: rows }] = await Promise.all([
    listActs(opts),
    createServiceClient().from("talent_show_vote_totals").select("act_id, votes").eq("round", settings.round),
  ]);
  const byAct = new Map((rows ?? []).map((r) => [r.act_id as string, Number(r.votes) || 0]));
  const withVotes = acts.map((a) => {
    const votes = byAct.get(a.id) ?? 0;
    return { ...a, judge_xs: a.judge_xs ?? 0, votes, score: actScore(votes, a.judge_xs ?? 0) };
  });
  return { acts: withVotes, total: withVotes.reduce((n, a) => n + a.votes, 0) };
}

/** The act this device voted for in the current round, if any. */
export async function currentVote(voterId: string | null, round: number): Promise<string | null> {
  if (!voterId) return null;
  const { data } = await createServiceClient()
    .from("talent_show_votes")
    .select("act_id")
    .eq("round", round)
    .eq("device_hash", hashValue(voterId))
    .maybeSingle();
  return (data?.act_id as string | undefined) ?? null;
}

export type VoteOutcome =
  | { ok: true; actId: string; changed: boolean }
  | { ok: false; status: number; error: string };

/**
 * Records a device's vote. One row per device per round: voting again while
 * voting is open moves the vote rather than adding one.
 */
export async function castVote(input: { actId: unknown; voterId: string; ip: string }): Promise<VoteOutcome> {
  const fail = (status: number, error: string): VoteOutcome => ({ ok: false, status, error });

  if (typeof input.actId !== "string" || !UUID_RE.test(input.actId)) return fail(400, "That act isn't available.");
  if (!VOTER_RE.test(input.voterId)) return fail(400, "Something went wrong. Please refresh and try again.");

  const settings = await getSettings();
  if (!settings.voting_open) return fail(403, "Voting is closed right now.");

  const supabase = createServiceClient();
  const { data: act } = await supabase
    .from("talent_show_acts")
    .select("id")
    .eq("id", input.actId)
    .eq("hidden", false)
    .maybeSingle();
  if (!act) return fail(404, "That act isn't available.");

  const deviceHash = hashValue(input.voterId);
  const previous = await currentVote(input.voterId, settings.round);
  const now = new Date().toISOString();
  const { error } = await supabase.from("talent_show_votes").upsert(
    {
      round: settings.round,
      act_id: input.actId,
      device_hash: deviceHash,
      ip_hash: hashValue(`ip:${input.ip}`),
      updated_at: now,
    },
    { onConflict: "round,device_hash" },
  );
  if (error) {
    console.error("talent vote failed:", error);
    return fail(500, "Couldn't save your vote. Please try again.");
  }
  return { ok: true, actId: input.actId, changed: previous !== null && previous !== input.actId };
}

/** Trims and checks one act's fields. Returns the clean row or an error. */
export function cleanAct(body: Record<string, unknown>, { partial = false } = {}):
  | { ok: true; patch: Partial<Pick<TalentAct, "name" | "performers" | "description" | "hidden" | "sort_order" | "judge_xs">> }
  | { ok: false; error: string } {
  const patch: Record<string, unknown> = {};
  for (const key of ["name", "performers", "description"] as const) {
    if (body[key] === undefined) continue;
    if (typeof body[key] !== "string") return { ok: false, error: `${key} must be text.` };
    const v = (body[key] as string).trim();
    if (v.length > LIMITS[key]) return { ok: false, error: `Keep the ${key} to ${LIMITS[key]} characters.` };
    patch[key] = v;
  }
  if (!partial || patch.name !== undefined) {
    if (typeof patch.name !== "string" || patch.name.length === 0) return { ok: false, error: "Give the act a name." };
  }
  if (body.hidden !== undefined) {
    if (typeof body.hidden !== "boolean") return { ok: false, error: "hidden must be true or false." };
    patch.hidden = body.hidden;
  }
  if (body.sortOrder !== undefined) {
    const n = Number(body.sortOrder);
    if (!Number.isInteger(n) || n < 0 || n > 10_000) return { ok: false, error: "Invalid running order." };
    patch.sort_order = n;
  }
  if (body.judgeXs !== undefined) {
    const n = Number(body.judgeXs);
    if (!Number.isInteger(n) || n < 0 || n > MAX_JUDGE_XS)
      return { ok: false, error: `Judges' X's must be a whole number from 0 to ${MAX_JUDGE_XS}.` };
    patch.judge_xs = n;
  }
  return { ok: true, patch };
}
