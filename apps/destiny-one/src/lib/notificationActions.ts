// Reply and Mark as read, straight from a message notification (the
// "message" category, set by lib/destinyOne/push.server.ts).
//
// Reply needs the phone unlocked first (isAuthenticationRequired): on a shared
// or family phone, someone shouldn't be able to answer as you from the lock
// screen. Neither action opens the app. On iOS the response reaches the
// listener in _layout.tsx (the app is woken in the background); on Android,
// the background task below. Either way it's handled once.
//
// A notification is for the member it was sent to (data.memberId). If that's
// another account on this phone than the active one, the action uses that
// account (accounts.apiFor), the same as Send-as does.

import * as Notifications from "expo-notifications";
import * as TaskManager from "expo-task-manager";
import { MAX_MESSAGE_LENGTH } from "@destiny/shared";
import * as accounts from "@/lib/accounts";
import { api } from "@/lib/api";
import { updateGroupSummary } from "@/lib/queries";

export const MESSAGE_CATEGORY = "message";
const REPLY = "reply";
const MARK_READ = "read";
const TASK = "d1-notification-actions";

let categorySet: Promise<unknown> | null = null;

/** The Reply / Mark as read buttons. Safe to call often; it only registers once per launch. */
export function registerMessageCategory(): Promise<unknown> {
  return (categorySet ??= Notifications.setNotificationCategoryAsync(MESSAGE_CATEGORY, [
    {
      identifier: REPLY,
      buttonTitle: "Reply",
      textInput: { submitButtonTitle: "Send", placeholder: "Message" },
      options: { opensAppToForeground: false, isAuthenticationRequired: true },
    },
    {
      identifier: MARK_READ,
      buttonTitle: "Mark as read",
      options: { opensAppToForeground: false },
    },
  ]).catch(() => {
    categorySet = null; // try again next time
  }));
}

const handled = new Set<string>();

/**
 * Runs Reply or Mark as read for a notification response. Returns false for
 * an ordinary tap (the caller opens the chat). Never throws.
 */
export async function handleNotificationAction(response: Notifications.NotificationResponse): Promise<boolean> {
  const action = response.actionIdentifier;
  if (action !== REPLY && action !== MARK_READ) return false;
  const key = `${response.notification.request.identifier}:${action}`;
  if (handled.has(key)) return true;
  handled.add(key);

  const data = response.notification.request.content.data as { groupId?: unknown; messageId?: unknown; memberId?: unknown } | undefined;
  const groupId = typeof data?.groupId === "string" ? data.groupId : null;
  const messageId = typeof data?.messageId === "number" ? data.messageId : null;
  if (!groupId) return true;

  try {
    await accounts.loadAccounts();
    const owner = typeof data?.memberId === "string" ? accounts.accounts().find((a) => a.memberId === data.memberId) : undefined;
    const client = owner && owner.slot !== accounts.activeSlot() ? accounts.apiFor(owner.slot) : api;

    if (action === REPLY) {
      const text = (response.userText ?? "").trim().slice(0, MAX_MESSAGE_LENGTH);
      if (!text) return true;
      await client.send(groupId, { body: text });
    } else if (messageId) {
      await client.markRead(groupId, messageId);
      if (client === api) updateGroupSummary(groupId, (g) => ({ ...g, unreadCount: 0 }));
    }
    await Notifications.dismissNotificationAsync(response.notification.request.identifier).catch(() => undefined);
  } catch {
    if (action === REPLY) {
      // Say so, rather than letting the reply vanish.
      await Notifications.scheduleNotificationAsync({
        content: { title: "Your reply wasn't sent", body: "Open Destiny One to try again.", data: { groupId } },
        trigger: null,
      }).catch(() => undefined);
    }
  }
  return true;
}

// Android delivers action taps on a backgrounded or closed app to this task.
// Defined at module scope, as expo-task-manager needs, from a module the root
// layout imports.
TaskManager.defineTask<Notifications.NotificationTaskPayload>(TASK, async ({ data }) => {
  if (data && "actionIdentifier" in data) await handleNotificationAction(data as unknown as Notifications.NotificationResponse);
});

let taskRegistered = false;
export function registerNotificationTask() {
  if (taskRegistered) return;
  taskRegistered = true;
  void Notifications.registerTaskAsync(TASK).catch(() => {
    taskRegistered = false;
  });
}
