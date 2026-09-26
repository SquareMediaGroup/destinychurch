// Push notifications.
//
// Ask CONTEXTUALLY (docs/mobile-app-scope.md B.3) — e.g. just after someone
// joins their first group, with a line explaining what they'll get — never on
// first launch. Notifications are content-free by design: "New message",
// nothing else, so no message text or names pass through Apple/Google/Expo or
// show on a lock screen. `data.groupId` says which group to open on tap.

import { Platform } from "react-native";
import * as Device from "expo-device";
import * as Notifications from "expo-notifications";
import { api } from "@/lib/api";
import { config } from "@/lib/config";

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

  const { data: token } = await Notifications.getExpoPushTokenAsync({ projectId: config.easProjectId });
  await api.registerPushToken(token, Platform.OS === "ios" ? "ios" : "android");
  registeredToken = token;
  return "registered";
}

export async function unregisterPush(): Promise<void> {
  if (!registeredToken) return;
  await api.unregisterPushToken(registeredToken);
  registeredToken = null;
}

/** The group a tapped notification refers to, if any. */
export function groupIdFrom(response: Notifications.NotificationResponse): string | null {
  const data = response.notification.request.content.data as { groupId?: unknown } | undefined;
  return typeof data?.groupId === "string" ? data.groupId : null;
}
