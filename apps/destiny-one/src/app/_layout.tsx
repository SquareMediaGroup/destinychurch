// Root layout: the saved data cache, session provider, themed stack, no
// native headers (every screen draws its own floating glass header, as in the
// design).

// First, so crash reporting is running before anything else loads.
import { withErrorReporting } from "@/lib/sentry";
import { useEffect, useRef } from "react";
import { liquidGlass } from "@/components/GlassSurface";
import { Platform, StyleSheet, View } from "react-native";
import { Stack, router, usePathname, useSegments } from "expo-router";
import * as Notifications from "expo-notifications";
import * as SplashScreen from "expo-splash-screen";
import { StatusBar } from "expo-status-bar";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { useQuery } from "@tanstack/react-query";
import { PersistQueryClientProvider } from "@tanstack/react-query-persist-client";
import { UpdateScreen } from "@/components/UpdateScreen";
import { useAppGate } from "@/lib/appGate";
import { api } from "@/lib/api";
import { groupIdFrom } from "@/lib/push";
import { handleNotificationAction, registerMessageCategory, registerNotificationTask } from "@/lib/notificationActions";
import { currentOpenGroup, keys } from "@/lib/queries";
import { pendingSplash } from "@/lib/releaseSplash";
import { hasSeenSetup } from "@/state/setupSeen";
import { markUpdatePromptSeen, pendingUpdatePrompt } from "@/lib/updatePrompt";
import { persistOptions, queryClient } from "@/lib/queryClient";
import { SwitchBanner } from "@/components/SwitchBanner";
import { appearance } from "@/state/appearance";
import { dataSettings } from "@/state/dataSettings";
import { networkUsage } from "@/state/networkUsage";
import { useShakeToReportListener } from "@/lib/useShakeToReport";
import { notificationTap, usePendingNotificationGroup } from "@/state/notificationTap";
import { AccessGuard, SessionProvider, isInApp, useSession } from "@/state/session";
import { useTheme } from "@/theme/tokens";

// Keep the launch splash up until the saved theme is applied, so a member who
// chose Dark never sees a light frame first.
void SplashScreen.preventAutoHideAsync().catch(() => undefined);

/**
 * Tapping a "New message" notification opens that group. The tap is only
 * noted here (OpenFromNotification opens it once the app is ready). A tap that
 * launched the app can arrive both as the last response and through the
 * listener, so each notification is handled once, and the last response is
 * cleared so a later remount doesn't open it again.
 */
function useNotificationTaps() {
  useEffect(() => {
    registerMessageCategory();
    registerNotificationTask();
    const handled = new Set<string>();
    const take = (r: Notifications.NotificationResponse | null) => {
      if (!r) return;
      // Reply / Mark as read run without opening anything.
      if (r.actionIdentifier !== Notifications.DEFAULT_ACTION_IDENTIFIER) {
        void handleNotificationAction(r);
        try {
          Notifications.clearLastNotificationResponse();
        } catch {
          // Not available (e.g. web).
        }
        return;
      }
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
 * Shows the release splash (see lib/releases.ts) once per release, over the
 * chat list, for an active member who has accepted the notices.
 */
function ReleaseSplash() {
  const { ready, me } = useSession();
  const segments = useSegments();
  const inApp = isInApp(segments[0] as string | undefined);
  const active = ready && me?.onboarding === "active" && me.outstandingConsents.length === 0;
  const checked = useRef(false);

  const memberId = me?.id;

  useEffect(() => {
    if (!active || !inApp || !memberId || checked.current) return;
    // Setup comes first: until it's been seen, AccessGuard is about to send them there. This re-runs when they come back.
    void hasSeenSetup(memberId).then(async (seen) => {
      if (!seen || checked.current) return;
      checked.current = true;
      const r = await pendingSplash();
      if (r) router.push("/release");
    });
  }, [active, inApp, memberId]);

  return null;
}

/**
 * Offers a newer X.X release once (see lib/updatePrompt.ts), as a sheet over
 * Chats, for an active member. Waits for setup and the release splash,
 * so it never stacks on either; the path is watched so it tries again once
 * they're out of the way.
 */
function UpdatePrompt() {
  const { ready, me } = useSession();
  const segments = useSegments();
  const pathname = usePathname();
  const inApp = isInApp(segments[0] as string | undefined);
  const active = ready && me?.onboarding === "active" && me.outstandingConsents.length === 0;
  const { data: config } = useQuery({ queryKey: keys.appConfig, queryFn: () => api.appConfig() });
  const shown = useRef<string | null>(null);
  const memberId = me?.id;
  const atHome = pathname === "/chats";

  useEffect(() => {
    if (!active || !inApp || !atHome || !memberId || !config) return;
    let cancelled = false;
    void (async () => {
      if (!(await hasSeenSetup(memberId)) || (await pendingSplash())) return;
      const version = await pendingUpdatePrompt(config);
      if (cancelled || !version || shown.current === version) return;
      shown.current = version;
      // Seen as soon as it's shown, so swiping the sheet away counts as Not now.
      await markUpdatePromptSeen(version);
      router.push("/update-available");
    })();
    return () => {
      cancelled = true;
    };
  }, [active, inApp, atHome, memberId, config]);

  return null;
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
      <ReleaseSplash />
      <UpdatePrompt />
      <ShakeToReport />
      <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: t.bg } }}>
        <Stack.Screen name="(tabs)" options={{ animation: "fade" }} />
        <Stack.Screen name="welcome" options={{ animation: "fade" }} />
        <Stack.Screen name="waiting" options={{ animation: "fade", gestureEnabled: false }} />
        <Stack.Screen name="setup" options={{ animation: "fade", gestureEnabled: false }} />
        <Stack.Screen name="notices" options={{ animation: "fade", gestureEnabled: false }} />
        <Stack.Screen name="new-group" options={{ presentation: "modal", contentStyle: { backgroundColor: t.grouped } }} />
        <Stack.Screen name="report" options={{ presentation: "modal", contentStyle: { backgroundColor: t.grouped } }} />
        <Stack.Screen name="report-sent" options={{ presentation: "modal", gestureEnabled: false }} />
        <Stack.Screen name="feedback" options={{ presentation: "modal", contentStyle: { backgroundColor: t.grouped } }} />
        <Stack.Screen name="beta" options={{ presentation: "modal", contentStyle: { backgroundColor: t.grouped } }} />
        <Stack.Screen name="message-info" options={{ presentation: "modal", contentStyle: { backgroundColor: t.grouped } }} />
        <Stack.Screen name="send-event" options={{ presentation: "modal", contentStyle: { backgroundColor: t.grouped } }} />
        <Stack.Screen name="forward" options={{ presentation: "modal", contentStyle: { backgroundColor: t.grouped } }} />
        <Stack.Screen name="share" options={{ presentation: "modal", gestureEnabled: false, contentStyle: { backgroundColor: t.grouped } }} />
        <Stack.Screen name="release" options={{ presentation: "fullScreenModal", animation: "fade", gestureEnabled: false }} />
        <Stack.Screen name="search" options={{ animation: "fade" }} />
        <Stack.Screen name="camera" options={{ presentation: "fullScreenModal", animation: "fade", gestureEnabled: false, contentStyle: { backgroundColor: "#000" } }} />
        <Stack.Screen name="viewer" options={{ presentation: "transparentModal", animation: "fade", contentStyle: { backgroundColor: "transparent" } }} />
        <Stack.Screen name="video" options={{ presentation: "fullScreenModal", animation: "fade", contentStyle: { backgroundColor: "#000" } }} />
        <Stack.Screen
          name="add-account"
          options={sheetOptions(t.grouped)}
        />
        <Stack.Screen
          name="accounts"
          options={sheetOptions(t.grouped)}
        />
        <Stack.Screen
          name="update-available"
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
  // Storage and data settings and the network usage count, from this phone.
  useEffect(() => {
    void dataSettings.load();
    void networkUsage.load();
  }, []);
  useEffect(() => {
    // Hide even if loading fails; the splash must never stick.
    void appearance
      .load()
      .catch(() => undefined)
      .finally(() => void SplashScreen.hideAsync().catch(() => undefined));
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
