// Root layout: the saved data cache, session provider, themed stack, no
// native headers (every screen draws its own floating glass header, as in the
// design).

// First, so crash reporting is running before anything else loads.
import { withErrorReporting } from "@/lib/sentry";
import { useEffect } from "react";
import { liquidGlass } from "@/components/GlassSurface";
import { Platform, StyleSheet, View } from "react-native";
import { Stack, router, useSegments } from "expo-router";
import * as Notifications from "expo-notifications";
import { StatusBar } from "expo-status-bar";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { PersistQueryClientProvider } from "@tanstack/react-query-persist-client";
import { UpdateScreen } from "@/components/UpdateScreen";
import { useAppGate } from "@/lib/appGate";
import { groupIdFrom } from "@/lib/push";
import { currentOpenGroup } from "@/lib/queries";
import { persistOptions, queryClient } from "@/lib/queryClient";
import { SwitchBanner } from "@/components/SwitchBanner";
import { appearance } from "@/state/appearance";
import { useShakeToReportListener } from "@/lib/useShakeToReport";
import { notificationTap, usePendingNotificationGroup } from "@/state/notificationTap";
import { AccessGuard, SessionProvider, isInApp, useSession } from "@/state/session";
import { useTheme } from "@/theme/tokens";

/**
 * Tapping a "New message" notification opens that group. The tap is only
 * noted here (OpenFromNotification opens it once the app is ready). A tap that
 * launched the app can arrive both as the last response and through the
 * listener, so each notification is handled once, and the last response is
 * cleared so a later remount doesn't open it again.
 */
function useNotificationTaps() {
  useEffect(() => {
    const handled = new Set<string>();
    const take = (r: Notifications.NotificationResponse | null) => {
      if (!r) return;
      const key = r.notification.request.identifier;
      if (handled.has(key)) return;
      handled.add(key);
      const id = groupIdFrom(r);
      if (id) notificationTap.set(id);
      try {
        Notifications.clearLastNotificationResponse();
      } catch {
        // Not available (e.g. web).
      }
    };
    try {
      take(Notifications.getLastNotificationResponse());
    } catch {
      // Not available (e.g. web). Nothing to open.
    }
    const sub = Notifications.addNotificationResponseReceivedListener(take);
    return () => sub.remove();
  }, []);
}

/**
 * Opens the chat from a tapped notification once someone is signed in, has
 * accepted the notices and is past the launch screen, so the chat lands on top
 * of the chat list rather than under it. Already looking at that chat: stays put.
 */
function OpenFromNotification() {
  const { ready, session, me } = useSession();
  const pending = usePendingNotificationGroup();
  const segments = useSegments();
  const inApp = isInApp(segments[0] as string | undefined);
  const active = ready && me?.onboarding === "active" && me.outstandingConsents.length === 0;

  useEffect(() => {
    if (!pending) return;
    // Signed out: it was for someone who isn't here any more.
    if (ready && !session) {
      notificationTap.clear();
      return;
    }
    if (!active || !inApp) return;
    notificationTap.clear();
    if (currentOpenGroup() !== pending) router.push(`/group/${pending}`);
  }, [pending, ready, session, active, inApp]);

  return null;
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

/** Shake the phone to report a problem, for signed-in members. */
function ShakeToReport() {
  const { me } = useSession();
  useShakeToReportListener(me?.onboarding === "active");
  return null;
}

function App() {
  const t = useTheme();
  return (
    <SessionProvider>
      <StatusBar style="auto" />
      <AccessGuard />
      <OpenFromNotification />
      <ShakeToReport />
      <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: t.bg } }}>
        <Stack.Screen name="(tabs)" options={{ animation: "fade" }} />
        <Stack.Screen name="welcome" options={{ animation: "fade" }} />
        <Stack.Screen name="waiting" options={{ animation: "fade", gestureEnabled: false }} />
        <Stack.Screen name="notices" options={{ animation: "fade", gestureEnabled: false }} />
        <Stack.Screen name="new-group" options={{ presentation: "modal", contentStyle: { backgroundColor: t.grouped } }} />
        <Stack.Screen name="report" options={{ presentation: "modal", contentStyle: { backgroundColor: t.grouped } }} />
        <Stack.Screen name="report-sent" options={{ presentation: "modal", gestureEnabled: false }} />
        <Stack.Screen name="feedback" options={{ presentation: "modal", contentStyle: { backgroundColor: t.grouped } }} />
        <Stack.Screen name="search" options={{ animation: "fade" }} />
        <Stack.Screen name="viewer" options={{ presentation: "transparentModal", animation: "fade", contentStyle: { backgroundColor: "transparent" } }} />
        <Stack.Screen
          name="add-account"
          options={sheetOptions(t.grouped)}
        />
        <Stack.Screen
          name="accounts"
          options={sheetOptions(t.grouped)}
        />
      </Stack>
      <SwitchBanner />
    </SessionProvider>
  );
}

/**
 * Bottom sheets. On iOS 26 the system draws the glass sheet with corners that
 * follow the device's own screen radius, so we leave both to it (no fixed
 * radius, transparent content background). Older iOS keeps a solid sheet.
 */
function sheetOptions(solid: string) {
  return {
    presentation: "formSheet" as const,
    sheetAllowedDetents: "fitToContents" as const,
    sheetGrabberVisible: true,
    ...(liquidGlass ? { contentStyle: { backgroundColor: "transparent" } } : { sheetCornerRadius: 28, contentStyle: { backgroundColor: solid } }),
  };
}

function RootLayout() {
  useNotificationTaps();
  // The person's own send colour and wallpaper, from this phone.
  useEffect(() => {
    void appearance.load();
  }, []);
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

export default withErrorReporting(RootLayout);
