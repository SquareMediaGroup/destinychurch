// DestinyAI's answer while it's being written, per chat: what it's doing
// ("Checking the calendar") and the text so far. Fed by the realtime listener
// (lib/queries.ts applyEvent). Live only: nothing is stored, and the finished
// message replaces this when it arrives.

import { useSyncExternalStore } from "react";

export interface AssistantStream {
  label: string | null;
  text: string;
}

/** Give up on a stream that has had no update for this long (its finished message was lost). */
const STALE_MS = 60_000;

const streams = new Map<string, AssistantStream>();
const timers = new Map<string, ReturnType<typeof setTimeout>>();
const listeners = new Set<() => void>();

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

function write(groupId: string, next: AssistantStream | null) {
  const timer = timers.get(groupId);
  if (timer) clearTimeout(timer);
  timers.delete(groupId);
  if (next) {
    streams.set(groupId, next);
    timers.set(
      groupId,
      setTimeout(() => clearAssistantStream(groupId), STALE_MS),
    );
  } else {
    streams.delete(groupId);
  }
  for (const listener of listeners) listener();
}

export function setAssistantStatus(groupId: string, label: string | null) {
  const current = streams.get(groupId) ?? { label: null, text: "" };
  write(groupId, { ...current, label });
}

export function setAssistantText(groupId: string, text: string) {
  const current = streams.get(groupId) ?? { label: null, text: "" };
  write(groupId, { ...current, text });
}

export function clearAssistantStream(groupId: string) {
  if (streams.has(groupId)) write(groupId, null);
}

/** The live answer for this chat, or null. The same object until it changes, so it's safe to memoise on. */
export function useAssistantStream(groupId: string): AssistantStream | null {
  return useSyncExternalStore(subscribe, () => streams.get(groupId) ?? null);
}
