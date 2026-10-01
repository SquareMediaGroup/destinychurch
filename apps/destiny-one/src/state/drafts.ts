// Unsent text, per chat: leave a chat half-way through a message and it's
// still in the message box when you come back, with "Draft:" on that chat in
// the list (as in WhatsApp).
//
// Kept in memory only, so nothing anyone was typing is written to the phone;
// a draft lasts until the app is closed. Keyed by member as well as group,
// because several accounts can share a phone, and a sign-out forgets that
// account's drafts.
//
// The composer saves on every keystroke without telling anyone; the chat list
// hears about it once, when the chat closes (flush), so typing never re-renders
// the list behind it.

import { useSyncExternalStore } from "react";
import { activeMemberId } from "@/lib/accounts";

const drafts = new Map<string, string>();
const listeners = new Set<() => void>();

const keyFor = (memberId: string, groupId: string) => `${memberId}:${groupId}`;

export const chatDrafts = {
  get(groupId: string): string {
    const member = activeMemberId();
    return member ? (drafts.get(keyFor(member, groupId)) ?? "") : "";
  },
  /** Every keystroke. Quiet: call flush() when the chat closes. */
  set(groupId: string, text: string) {
    const member = activeMemberId();
    if (!member) return;
    if (text.trim()) drafts.set(keyFor(member, groupId), text);
    else drafts.delete(keyFor(member, groupId));
  },
  /** Tell the chat list. */
  flush() {
    for (const l of listeners) l();
  },
  /** Signing an account out: its drafts go with it. */
  forget(memberId: string) {
    for (const key of [...drafts.keys()]) if (key.startsWith(`${memberId}:`)) drafts.delete(key);
    chatDrafts.flush();
  },
};

const subscribe = (l: () => void) => {
  listeners.add(l);
  return () => listeners.delete(l);
};

/** This chat's draft for the chat list ("" when there isn't one). */
export function useChatDraft(groupId: string): string {
  return useSyncExternalStore(subscribe, () => chatDrafts.get(groupId));
}
