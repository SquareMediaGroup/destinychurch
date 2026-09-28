// Root layout: the saved data cache, session provider, themed stack, no
// native headers (every screen draws its own floating glass header, as in the
// design).

import { useEffect } from "react";
import { Platform, StyleSheet, View } from "react-native";
import { Stack, router } from "expo-router";
import * as Notifications from "expo-notifications";
import { StatusBar } from "expo-status-bar";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { PersistQueryClientProvider } from "@tanstack/react-query-persist-client";
import { UpdateScreen } from "@/components/UpdateScreen";
import { useAppGate } from "@/lib/appGate";
import { groupIdFrom } from "@/lib/push";
import { persistOptions, queryClient } from "@/lib/queryClient";
import { AccessGuard, SessionProvider } from "@/state/session";
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

/**
 * The app, behind the forced-update / maintenance gate. Expo Router needs the
 * navigator mounted at all times (a notification tap navigates), so when the
 * gate is closed the update screen covers it completely: it takes every touch,
 * and the app underneath is hidden from screen readers.
 */
function Gated() {
  const { gate, config } = useAppGate();
  const closed = gate !== "ok";
  return (
    <View style={{ flex: 1 }}>
      <View style={{ flex: 1 }} accessibilityElementsHidden={closed} importantForAccessibility={closed ? "no-hide-descendants" : "auto"}>
        <App />
      </View>
      {closed ? (
        <View style={StyleSheet.absoluteFill}>
          <UpdateScreen mode={gate} config={config} platform={Platform.OS} />
        </View>
      ) : null}
    </View>
  );
}

function App() {
  const t = useTheme();
  return (
    <SessionProvider>
      <StatusBar style="auto" />
      <AccessGuard />
      <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: t.bg } }}>
        <Stack.Screen name="(tabs)" options={{ animation: "fade" }} />
        <Stack.Screen name="welcome" options={{ animation: "fade" }} />
        <Stack.Screen name="waiting" options={{ animation: "fade", gestureEnabled: false }} />
        <Stack.Screen name="notices" options={{ animation: "fade", gestureEnabled: false }} />
        <Stack.Screen name="new-group" options={{ presentation: "modal", contentStyle: { backgroundColor: t.grouped } }} />
        <Stack.Screen name="report" options={{ presentation: "modal", contentStyle: { backgroundColor: t.grouped } }} />
        <Stack.Screen name="report-sent" options={{ presentation: "modal", gestureEnabled: false }} />
        <Stack.Screen name="search" options={{ animation: "fade" }} />
        <Stack.Screen
          name="accounts"
          options={{ presentation: "formSheet", sheetAllowedDetents: "fitToContents", sheetGrabberVisible: true, sheetCornerRadius: 28, contentStyle: { backgroundColor: t.grouped } }}
        />
      </Stack>
    </SessionProvider>
  );
}

export default function RootLayout() {
  useNotificationTaps();
  return (
    <SafeAreaProvider>
      {/* Once the saved cache is back, everything in it shows at once and is
          marked stale, so whatever's on screen quietly checks for anything
          missed while the app was closed. */}
      <PersistQueryClientProvider client={queryClient} persistOptions={persistOptions} onSuccess={() => void queryClient.invalidateQueries()}>
        <Gated />
      </PersistQueryClientProvider>
    </SafeAreaProvider>
  );
}
