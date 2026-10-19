// Push notifications.
//
// Ask CONTEXTUALLY (docs/mobile-app-scope.md B.3) — e.g. just after someone
// joins their first group, with a line explaining what they'll get — never on
// first launch. A notification shows the group name, the sender and the first
// line of the message (lib/destinyOne/push.server.ts). `data.groupId` says
// which group to open on tap.

import { Platform } from "react-native";
import * as Device from "expo-device";
import * as Notifications from "expo-notifications";
import { api } from "@/lib/api";
import { config } from "@/lib/config";
import { registerMessageCategory } from "@/lib/notificationActions";

let registeredToken: string | null = null;

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: false,
    shouldSetBadge: true,
  }),
});

export type PushResult = "registered" | "denied" | "unsupported";

export async function registerForPush(): Promise<PushResult> {
  if (!Device.isDevice || !config.easProjectId) return "unsupported";

  if (Platform.OS === "android") {
    await Notifications.setNotificationChannelAsync("messages", {
      name: "Messages",
      importance: Notifications.AndroidImportance.HIGH,
    });
  }

  let { status } = await Notifications.getPermissionsAsync();
  if (status !== "granted") ({ status } = await Notifications.requestPermissionsAsync());
  if (status !== "granted") return "denied";
  await registerMessageCategory();

  const { data: token } = await Notifications.getExpoPushTokenAsync({ projectId: config.easProjectId });
  await api.registerPushToken(token, Platform.OS === "ios" ? "ios" : "android");
  registeredToken = token;
  return "registered";
}

/** This device's token, without asking for permission. Null if not allowed (yet). */
async function currentToken(): Promise<string | null> {
  if (registeredToken) return registeredToken;
  if (!Device.isDevice || !config.easProjectId) return null;
  const { status } = await Notifications.getPermissionsAsync();
  if (status !== "granted") return null;
  const { data } = await Notifications.getExpoPushTokenAsync({ projectId: config.easProjectId });
  return data;
}

export async function unregisterPush(): Promise<void> {
  const token = await currentToken();
  if (!token) return;
  await api.unregisterPushToken(token);
  registeredToken = null;
}

/**
 * After switching accounts: point this device's notifications at the account
 * now open. Registering moves the token over (one owner per token on the
 * server), so the account you left stops getting them. Never asks for
 * permission; if it hasn't been given, there's nothing to move.
 */
export async function movePushToActiveAccount(): Promise<void> {
  const token = await currentToken();
  if (!token) return;
  await api.registerPushToken(token, Platform.OS === "ios" ? "ios" : "android");
  registeredToken = token;
}

/** The group a tapped notification refers to, if any. */
export function groupIdFrom(response: Notifications.NotificationResponse): string | null {
  const data = response.notification.request.content.data as { groupId?: unknown } | undefined;
  return typeof data?.groupId === "string" ? data.groupId : null;
}
