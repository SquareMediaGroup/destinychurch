// A message waiting on the Schedule screen: what the composer (or the Poll
// screen) had when the person chose "Schedule". Same tiny-external-store idea as
// state/pollDraft.ts, addressed to one group so a second chat on the stack
// doesn't pick it up.
//
// The Schedule screen reads it once when it opens. When a message is scheduled,
// `done` ticks, which the chat that opened it hears (useScheduleDone) and clears
// its message box, because that text has now been scheduled, not sent.

import { useSyncExternalStore } from "react";
import type { D1PollDraft } from "@destiny/shared";
import { chatDrafts } from "@/state/drafts";

export interface ScheduleDraft {
  groupId: string;
  body: string | null;
  mentions: string[] | null;
  poll: D1PollDraft | null;
}

let draft: ScheduleDraft | null = null;
let doneCount = 0;
let doneGroup: string | null = null;
const listeners = new Set<() => void>();

function emit() {
  for (const l of listeners) l();
}

export const scheduleDraft = {
  set(next: ScheduleDraft) {
    draft = next;
  },
  take(groupId: string): ScheduleDraft | null {
    return draft?.groupId === groupId ? draft : null;
  },
  clear() {
    draft = null;
  },
  /** A message was scheduled from this group's composer. */
  done(groupId: string) {
    draft = null;
    // The text in the message box has been scheduled, not sent: empty it before the chat redraws.
    chatDrafts.set(groupId, "");
    chatDrafts.flush();
    doneCount += 1;
    doneGroup = groupId;
    emit();
  },
};

const subscribe = (l: () => void) => {
  listeners.add(l);
  return () => listeners.delete(l);
};

/** Ticks each time something is scheduled from this group (0 until then). */
export function useScheduleDone(groupId: string): number {
  return useSyncExternalStore(subscribe, () => (doneGroup === groupId ? doneCount : 0));
}
