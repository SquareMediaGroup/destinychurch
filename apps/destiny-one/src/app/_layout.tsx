// Root layout: session provider, themed stack, no native headers (every
// screen draws its own floating glass header, as in the design).

import { useEffect } from "react";
import { Stack, router } from "expo-router";
import * as Notifications from "expo-notifications";
import { StatusBar } from "expo-status-bar";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { groupIdFrom } from "@/lib/push";
import { SessionProvider } from "@/state/session";
import { useTheme } from "@/theme/tokens";

/** Tapping a "New message" notification opens that group. */
function useNotificationTaps() {
  useEffect(() => {
    const open = (r: Notifications.NotificationResponse | null) => {
      const id = r ? groupIdFrom(r) : null;
      if (id) router.push(`/group/${id}`);
    };
    try {
      open(Notifications.getLastNotificationResponse());
    } catch {
      // Not available (e.g. web). Nothing to open.
    }
    const sub = Notifications.addNotificationResponseReceivedListener(open);
    return () => sub.remove();
  }, []);
}

export default function RootLayout() {
  useNotificationTaps();
  const t = useTheme();
  return (
    <SafeAreaProvider>
      <SessionProvider>
        <StatusBar style="auto" />
        <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: t.bg } }}>
          <Stack.Screen name="(tabs)" options={{ animation: "fade" }} />
          <Stack.Screen name="welcome" options={{ animation: "fade" }} />
          <Stack.Screen name="waiting" options={{ animation: "fade", gestureEnabled: false }} />
          <Stack.Screen name="notices" options={{ animation: "fade", gestureEnabled: false }} />
          <Stack.Screen name="new-group" options={{ presentation: "modal", contentStyle: { backgroundColor: t.grouped } }} />
          <Stack.Screen name="report" options={{ presentation: "modal", contentStyle: { backgroundColor: t.grouped } }} />
          <Stack.Screen name="report-sent" options={{ presentation: "modal", gestureEnabled: false }} />
          <Stack.Screen name="search" options={{ animation: "fade" }} />
        </Stack>
      </SessionProvider>
    </SafeAreaProvider>
  );
}
