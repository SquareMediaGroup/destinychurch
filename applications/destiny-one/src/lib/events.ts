// What tapping a church event offers (Upcoming events, Search's Coming up):
// share it to a chat, or open its page on the website.

import { ActionSheetIOS, Alert, Platform } from "react-native";
import { router } from "expo-router";
import * as WebBrowser from "expo-web-browser";
import type { D1EventSummary } from "@destiny/shared";
import { haptic } from "@/lib/haptics";

/** Share to a chat, or open the event's page. */
export function eventActions(e: D1EventSummary) {
  const share = () => router.push({ pathname: "/send-event", params: { seriesKey: e.seriesKey, slug: e.slug, name: e.name } });
  const details = () => void WebBrowser.openBrowserAsync(e.webUrl);
  haptic.selection();
  if (Platform.OS === "ios") {
    ActionSheetIOS.showActionSheetWithOptions({ title: e.name, options: ["Share to a chat", "View details", "Cancel"], cancelButtonIndex: 2 }, (i) => {
      if (i === 0) share();
      if (i === 1) details();
    });
  } else {
    Alert.alert(e.name, undefined, [
      { text: "Share to a chat", onPress: share },
      { text: "View details", onPress: details },
      { text: "Cancel", style: "cancel" },
    ]);
  }
}
