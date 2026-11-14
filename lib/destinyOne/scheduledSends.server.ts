// Destiny One — scheduled messages and poll deadlines (1.2), the server half.
//
// Two job kinds in d1_scheduled_jobs (migrations 20261110_01 and _03), run by
// /api/cron/destiny-one-scheduled-jobs:
//
//   send_message  a leader's scheduled message. Everything about it is checked
//                 again at send time, as if the leader had typed it then: still an
//                 active member, still in the group, group not paused, still a
//                 leader or admin, no posting restriction. If any of that fails the
//                 message is NOT sent, the job is cancelled with the reason, and the
//                 leader gets a notification (no message text in it).
//   close_poll    a poll's deadline. Closes the poll and has DestinyAI reply under
//                 it with the result, optionally pinned.
//
// Message text and poll wording in a job's payload are sealed like the message
// itself, so d1_scheduled_jobs never holds plain chat text.
//
// Both kinds are safe to run twice: a message is tagged with its job id
// (d1_post_scheduled_message), and a poll's result is only posted if DestinyAI
// hasn't already replied to it.

import "server-only";
import {
  DESTINY_AI_ID,
  DESTINY_AI_NAME,
  MAX_SCHEDULED_PER_GROUP,
  canSchedule,
  contentPreview,
  isLeaderRole,
  validatePoll,
  validatePollDeadline,
  validateScheduleTime,
  type D1EventRef,
  type D1MessageContent,
  type D1PollContent,
  type D1PollDraft,
  type D1ScheduledMessage,
} from "@destiny/shared";
import { createServiceClient } from "@/utils/supabase/service";
import { MEMBER_COLUMNS, toPolicy, type Caller, type MemberRow } from "@/lib/destinyOne/auth.server";
import { broadcastNewMessage, getMessageFor, requireGroupMembership } from "@/lib/destinyOne/chat.server";
import { messageTerms, openBody, openContent, sealBody, sealContent } from "@/lib/destinyOne/crypto.server";
import { buildEventSnapshot } from "@/lib/destinyOne/events.server";
import { OneError, fromDbError } from "@/lib/destinyOne/http";
import { attachLinkPreview } from "@/lib/destinyOne/linkPreview.server";
import { buildPollContent } from "@/lib/destinyOne/pollContent";
import { pollResultText } from "@/lib/destinyOne/polls";
import { pushNewMessage, pushNotice } from "@/lib/destinyOne/push.server";
import { JobCancelled, type JobHandlers, type ScheduledJob } from "@/lib/destinyOne/scheduledJobs";

/** What is kept in a send_message job's payload. Text fields are sealed. */
interface SendPayload {
  body: string | null;
  attachmentId: string | null;
  mentions: string[] | null;
  poll: { question: string; options: string[]; allowMultiple: boolean } | null;
  event: D1EventRef | null;
  closesAt: string | null;
  pinResult: boolean;
}

export interface ScheduleInput {
  runAt: string;
  body?: string | null;
  attachmentId?: string | null;
  poll?: D1PollDraft | null;
  event?: D1EventRef | null;
  mentions?: string[] | null;
}

type Membership = Awaited<ReturnType<typeof requireGroupMembership>>;

// ── Who is asking ───────────────────────────────────────────────────────────

/** A member as a caller, for jobs, which have no request to authenticate. Null if they aren't an active member. */
export async function callerForMember(memberId: string): Promise<Caller | null> {
  const { data, error } = await createServiceClient().from("d1_members").select(MEMBER_COLUMNS).eq("id", memberId).maybeSingle();
  if (error) throw fromDbError(error);
  const member = data as MemberRow | null;
  if (!member || member.status !== "active") return null;
  return { user: { id: member.auth_user_id ?? "", email: null, phone: null }, member, policy: toPolicy(member) };
}

function mayManageSchedule(caller: Caller, membership: Membership): boolean {
  return canSchedule({ member: caller.policy, groupKind: membership.kind, groupState: membership.state, myRole: membership.role });
}

async function groupName(groupId: string): Promise<string> {
  const { data } = await createServiceClient().from("d1_groups").select("name").eq("id", groupId).maybeSingle();
  return (data?.name as string | undefined) ?? "Destiny One";
}

async function tellLeader(memberId: string, groupId: string, reason: string): Promise<void> {
  await pushNotice(memberId, await groupName(groupId), `Your scheduled message was not sent. ${reason}`, { groupId, scheduled: true });
}

// ── Sealing a payload ───────────────────────────────────────────────────────

function sealPayload(groupId: string, input: ScheduleInput): SendPayload {
  const body = input.body?.trim() || null;
  return {
    body: sealBody(body, groupId),
    attachmentId: input.attachmentId ?? null,
    mentions: body ? input.mentions ?? null : null,
    poll: input.poll
      ? {
          question: sealBody(input.poll.question.trim(), groupId) ?? "",
          options: input.poll.options.map((o) => sealBody(o.trim(), groupId) ?? ""),
          allowMultiple: input.poll.allowMultiple,
        }
      : null,
    event: input.event ?? null,
    closesAt: input.poll?.closesAt ?? null,
    pinResult: input.poll?.pinResult === true,
  };
}

function openPayload(groupId: string, payload: SendPayload): Omit<D1ScheduledMessage, "id" | "groupId" | "runAt" | "createdBy" | "status"> {
  return {
    body: openBody(payload.body, groupId),
    attachmentId: payload.attachmentId ?? null,
    poll: payload.poll
      ? {
          question: openBody(payload.poll.question, groupId) ?? "",
          options: payload.poll.options.map((o) => openBody(o, groupId) ?? ""),
          allowMultiple: payload.poll.allowMultiple,
          closesAt: payload.closesAt,
          pinResult: payload.pinResult,
        }
      : null,
    event: payload.event ?? null,
  };
}

// ── Scheduling (the API a leader uses) ──────────────────────────────────────

interface JobRow {
  id: number;
  kind: string;
  run_at: string;
  group_id: string | null;
  created_by: string | null;
  payload: SendPayload;
  status: string;
}

const JOB_COLUMNS = "id, kind, run_at, group_id, created_by, payload, status";

function validateInput(input: ScheduleInput, runAt: Date): void {
  const hasContent = Boolean(input.body?.trim()) || Boolean(input.attachmentId) || Boolean(input.poll) || Boolean(input.event);
  if (!hasContent) throw new OneError("invalid", "A message can't be empty.");
  const when = validateScheduleTime(runAt);
  if (!when.ok) throw new OneError("rule_violation", when.reason);
  if (input.poll) {
    const poll = validatePoll(input.poll);
    if (!poll.ok) throw new OneError("rule_violation", poll.reason);
    if (input.poll.closesAt) {
      const deadline = validatePollDeadline(new Date(input.poll.closesAt), runAt);
      if (!deadline.ok) throw new OneError("rule_violation", deadline.reason);
    }
  }
}

/** Only a photo the leader uploaded to this group can be scheduled: voice notes and videos can't, to keep storage simple. */
async function requireSchedulableAttachment(caller: Caller, groupId: string, attachmentId: string): Promise<void> {
  const { data, error } = await createServiceClient().from("d1_attachments").select("group_id, uploader_id, mime_type").eq("id", attachmentId).maybeSingle();
  if (error) throw fromDbError(error);
  const a = data as { group_id: string; uploader_id: string; mime_type: string } | null;
  if (!a || a.group_id !== groupId || a.uploader_id !== caller.member.id) throw new OneError("invalid", "That attachment isn't available.");
  if (!a.mime_type.startsWith("image/")) throw new OneError("rule_violation", "Only photos can be scheduled. Voice notes and videos send straight away.");
}

async function toScheduled(row: JobRow, names: Map<string, string>): Promise<D1ScheduledMessage> {
  const groupId = row.group_id as string;
  return {
    id: row.id,
    groupId,
    runAt: row.run_at,
    createdBy: row.created_by ? { id: row.created_by, displayName: names.get(row.created_by) ?? "A leader" } : null,
    status: row.status === "running" ? "running" : "pending",
    ...openPayload(groupId, row.payload),
  };
}

async function namesOf(ids: (string | null)[]): Promise<Map<string, string>> {
  const unique = [...new Set(ids.filter((i): i is string => !!i))];
  if (unique.length === 0) return new Map();
  const { data } = await createServiceClient().from("d1_members").select("id, display_name").in("id", unique);
  return new Map((data ?? []).map((m) => [m.id as string, m.display_name as string]));
}

export async function createScheduledMessage(caller: Caller, groupId: string, membership: Membership, input: ScheduleInput): Promise<D1ScheduledMessage> {
  if (!mayManageSchedule(caller, membership)) {
    throw new OneError(
      "rule_violation",
      membership.state !== "active" ? "This group is paused and read-only for now." : "Only leaders and admins can schedule messages.",
    );
  }
  const runAt = new Date(input.runAt);
  validateInput(input, runAt);
  if (input.attachmentId) await requireSchedulableAttachment(caller, groupId, input.attachmentId);

  const supabase = createServiceClient();
  const { count, error: countError } = await supabase
    .from("d1_scheduled_jobs")
    .select("id", { count: "exact", head: true })
    .eq("kind", "send_message")
    .eq("group_id", groupId)
    .in("status", ["pending", "running"]);
  if (countError) throw fromDbError(countError);
  if ((count ?? 0) >= MAX_SCHEDULED_PER_GROUP) {
    throw new OneError("rule_violation", `This group already has ${MAX_SCHEDULED_PER_GROUP} scheduled messages waiting. Send or delete one first.`);
  }

  const { data, error } = await supabase
    .from("d1_scheduled_jobs")
    .insert({ kind: "send_message", run_at: runAt.toISOString(), group_id: groupId, created_by: caller.member.id, payload: sealPayload(groupId, input) })
    .select(JOB_COLUMNS)
    .single();
  if (error) throw fromDbError(error);
  return toScheduled(data as unknown as JobRow, new Map([[caller.member.id, caller.member.display_name]]));
}

export async function listScheduledMessages(caller: Caller, groupId: string, membership: Membership): Promise<D1ScheduledMessage[]> {
  if (!mayManageSchedule(caller, membership)) return [];
  const { data, error } = await createServiceClient()
    .from("d1_scheduled_jobs")
    .select(JOB_COLUMNS)
    .eq("kind", "send_message")
    .eq("group_id", groupId)
    .in("status", ["pending", "running"])
    .order("run_at");
  if (error) throw fromDbError(error);
  const rows = (data ?? []) as unknown as JobRow[];
  const names = await namesOf(rows.map((r) => r.created_by));
  return Promise.all(rows.map((r) => toScheduled(r, names)));
}

async function loadPending(groupId: string, jobId: number): Promise<JobRow> {
  const { data, error } = await createServiceClient()
    .from("d1_scheduled_jobs")
    .select(JOB_COLUMNS)
    .eq("id", jobId)
    .eq("kind", "send_message")
    .eq("group_id", groupId)
    .maybeSingle();
  if (error) throw fromDbError(error);
  const row = data as unknown as JobRow | null;
  if (!row || row.status !== "pending") throw new OneError("not_found", "That message has already been sent or removed.");
  return row;
}

export interface SchedulePatch {
  runAt?: string;
  body?: string | null;
  poll?: D1PollDraft | null;
  mentions?: string[] | null;
}

/** Edit what is waiting: the time, the text, or the poll. Only while it is still pending. */
export async function updateScheduledMessage(caller: Caller, groupId: string, membership: Membership, jobId: number, patch: SchedulePatch): Promise<D1ScheduledMessage> {
  if (!mayManageSchedule(caller, membership)) throw new OneError("forbidden", "Only leaders and admins can change scheduled messages.");
  const row = await loadPending(groupId, jobId);
  const current = openPayload(groupId, row.payload);

  const next: ScheduleInput = {
    runAt: patch.runAt ?? row.run_at,
    body: patch.body !== undefined ? patch.body : current.body,
    attachmentId: current.attachmentId,
    poll: patch.poll !== undefined ? patch.poll : current.poll,
    event: current.event,
    mentions: patch.mentions !== undefined ? patch.mentions : row.payload.mentions,
  };
  const runAt = new Date(next.runAt);
  validateInput(next, runAt);

  const { data, error } = await createServiceClient()
    .from("d1_scheduled_jobs")
    .update({ run_at: runAt.toISOString(), payload: sealPayload(groupId, next) })
    .eq("id", jobId)
    .eq("status", "pending")
    .select(JOB_COLUMNS)
    .maybeSingle();
  if (error) throw fromDbError(error);
  if (!data) throw new OneError("not_found", "That message has already been sent or removed.");
  const updated = data as unknown as JobRow;
  return toScheduled(updated, await namesOf([updated.created_by]));
}

export async function deleteScheduledMessage(caller: Caller, groupId: string, membership: Membership, jobId: number): Promise<void> {
  if (!mayManageSchedule(caller, membership)) throw new OneError("forbidden", "Only leaders and admins can delete scheduled messages.");
  const { data, error } = await createServiceClient()
    .from("d1_scheduled_jobs")
    .update({ status: "cancelled", last_error: "Deleted before it was sent.", finished_at: new Date().toISOString() })
    .eq("id", jobId)
    .eq("kind", "send_message")
    .eq("group_id", groupId)
    .eq("status", "pending")
    .select("id")
    .maybeSingle();
  if (error) throw fromDbError(error);
  if (!data) throw new OneError("not_found", "That message has already been sent or removed.");
}

/** Makes a waiting message due now. The caller then runs the due jobs, so it goes out straight away. */
export async function markSendNow(caller: Caller, groupId: string, membership: Membership, jobId: number): Promise<void> {
  if (!mayManageSchedule(caller, membership)) throw new OneError("forbidden", "Only leaders and admins can send scheduled messages.");
  const row = await loadPending(groupId, jobId);
  const { data, error } = await createServiceClient()
    .from("d1_scheduled_jobs")
    .update({ run_at: new Date().toISOString() })
    .eq("id", row.id)
    .eq("status", "pending")
    .select("id")
    .maybeSingle();
  if (error) throw fromDbError(error);
  if (!data) throw new OneError("not_found", "That message has already been sent or removed.");
}

// ── Running a scheduled message ─────────────────────────────────────────────

const RULE_CODES = new Set(["P0001", "42501"]);

async function cancelAndTell(job: ScheduledJob, reason: string): Promise<never> {
  if (job.created_by && job.group_id) await tellLeader(job.created_by, job.group_id, reason);
  throw new JobCancelled(reason);
}

async function sendMessageJob(job: ScheduledJob): Promise<void> {
  const groupId = job.group_id;
  const payload = job.payload as unknown as SendPayload;
  if (!groupId || !job.created_by) throw new JobCancelled("The message has no group or sender.");

  const caller = await callerForMember(job.created_by);
  if (!caller) throw new JobCancelled("The person who scheduled it is no longer an active member.");

  let membership: Membership;
  try {
    membership = await requireGroupMembership(caller, groupId);
  } catch (e) {
    if (e instanceof OneError && e.code === "not_found") return cancelAndTell(job, "You are no longer in the group.");
    throw e;
  }
  if (!mayManageSchedule(caller, membership)) {
    return cancelAndTell(job, membership.state !== "active" ? "The group is paused." : "You can no longer post here.");
  }

  // Built now, not when it was scheduled: an event is as of the moment it goes out.
  let content: D1MessageContent | null = null;
  if (payload.poll) {
    content = buildPollContent({
      question: openBody(payload.poll.question, groupId) ?? "",
      options: payload.poll.options.map((o) => openBody(o, groupId) ?? ""),
      allowMultiple: payload.poll.allowMultiple,
    });
  } else if (payload.event) {
    try {
      content = await buildEventSnapshot(payload.event);
    } catch (e) {
      if (e instanceof OneError && e.code === "not_found") return cancelAndTell(job, "The event you attached isn't available any more.");
      throw e; // events being down for a moment is worth a retry
    }
  }

  const body = openBody(payload.body, groupId);
  const { data, error } = await createServiceClient().rpc("d1_post_scheduled_message", {
    p_job: job.id,
    p_actor: caller.member.id,
    p_group: groupId,
    p_body: payload.body,
    p_attachment: payload.attachmentId ?? null,
    p_content: sealContent(content, groupId),
    p_terms: messageTerms(body, groupId),
    p_mentions: payload.mentions ?? null,
  });
  if (error) {
    // A rule the database enforces (a posting restriction, a pause that began a moment ago): never going to work.
    if (error.code && RULE_CODES.has(error.code)) return cancelAndTell(job, error.message);
    throw fromDbError(error);
  }
  const result = data as { id: number; created: boolean };
  const message = await getMessageFor(caller.member.id, result.id);

  if (payload.poll && payload.closesAt) {
    const { error: deadlineError } = await createServiceClient().rpc("d1_start_poll_deadline", {
      p_message: result.id,
      p_closes_at: payload.closesAt,
      p_pin_result: payload.pinResult,
    });
    if (deadlineError) throw fromDbError(deadlineError);
  }

  // Said once, however many times the job runs.
  if (result.created) {
    await Promise.allSettled([
      broadcastNewMessage(message),
      pushNewMessage(groupId, caller.member.id, { senderName: caller.member.display_name, body: body ?? contentPreview(content), attachmentMime: message.attachment?.mimeType ?? null }, message.mentions, message.id),
      attachLinkPreview(message.id, groupId, body),
    ]);
  }
}

// ── Closing a poll ──────────────────────────────────────────────────────────

/**
 * Closes a poll (if it isn't already) and has DestinyAI reply under it with the
 * result, pinned if asked. Used at the deadline and when someone closes a poll
 * by hand. Safe to run again: the result is only posted if DestinyAI hasn't
 * already replied to this poll.
 */
export async function closePollAndAnnounce(messageId: number, pinResult: boolean): Promise<{ newlyClosed: boolean }> {
  const supabase = createServiceClient();
  const { data, error } = await supabase.rpc("d1_close_poll", { p_message: messageId });
  if (error) throw fromDbError(error);
  const closed = data as { groupId: string; senderId: string | null; newlyClosed: boolean; totalVoters: number; tally: { optionId: string; count: number }[] };

  const { data: already } = await supabase.from("d1_messages").select("id").eq("reply_to", messageId).eq("sender_id", DESTINY_AI_ID).limit(1);
  if ((already ?? []).length > 0) return { newlyClosed: closed.newlyClosed };

  const { data: row, error: rowError } = await supabase.from("d1_messages").select("content").eq("id", messageId).maybeSingle();
  if (rowError) throw fromDbError(rowError);
  const content = openContent((row?.content as D1MessageContent | null) ?? null, closed.groupId);
  const options = content?.kind === "poll" ? (content as D1PollContent).poll.options : [];
  const text = pollResultText(options, closed.tally, closed.totalVoters);

  const { data: posted, error: postError } = await supabase.rpc("d1_post_assistant_message", {
    p_group: closed.groupId,
    p_body: sealBody(text, closed.groupId),
    p_reply_to: messageId,
    p_content: null,
    p_terms: messageTerms(text, closed.groupId),
    p_mentions: null,
  });
  if (postError) {
    // A paused group refuses any new message. The poll is closed, which is what matters; the result isn't posted.
    if (postError.code === "P0001") {
      console.warn("⚠️ Poll closed but its result couldn't be posted:", postError.message);
      return { newlyClosed: closed.newlyClosed };
    }
    throw fromDbError(postError);
  }
  const message = await getMessageFor(DESTINY_AI_ID, posted as number);
  await Promise.allSettled([
    broadcastNewMessage(message),
    pushNewMessage(closed.groupId, DESTINY_AI_ID, { senderName: DESTINY_AI_NAME, body: text, attachmentMime: null }, [], message.id),
  ]);

  if (pinResult && closed.senderId) {
    const { error: pinError } = await supabase.rpc("d1_pin_message", { p_actor: closed.senderId, p_message: message.id, p_pin: true });
    if (pinError) console.warn("⚠️ Poll result couldn't be pinned:", pinError.message); // only admins can pin; the result is still posted
  }
  return { newlyClosed: closed.newlyClosed };
}

async function closePollJob(job: ScheduledJob): Promise<void> {
  const messageId = Number((job.payload as { messageId?: unknown }).messageId);
  if (!Number.isInteger(messageId)) throw new JobCancelled("The job has no poll.");
  try {
    await closePollAndAnnounce(messageId, (job.payload as { pinResult?: unknown }).pinResult === true);
  } catch (e) {
    if (e instanceof OneError && e.code === "not_found") throw new JobCancelled("The poll was deleted.");
    throw e;
  }
}

/** Whether `caller` may close this poll early: its author, or a leader or admin of the group. */
export function canClosePoll(caller: Caller, membership: Membership, pollSenderId: string | null): boolean {
  return pollSenderId === caller.member.id || membership.role === "admin" || isLeaderRole(caller.policy.roles);
}

export const SCHEDULED_HANDLERS: JobHandlers = {
  send_message: sendMessageJob,
  close_poll: closePollJob,
};
