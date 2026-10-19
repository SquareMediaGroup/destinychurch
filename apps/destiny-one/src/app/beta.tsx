// "Become a beta tester" — a hidden screen, reached by tapping the version at
// the bottom of Profile 10 times (src/app/(tabs)/profile.tsx). Joining sends a
// request to the Destiny One Admins through the feedback inbox; they add the
// person's email to the TestFlight nightly group, which is how the nightly
// build reaches a phone (Apple only lets a tester be added by email).
// Whether this phone has asked is kept on the phone only.

import { useEffect, useState } from "react";
import { Platform, Text, View } from "react-native";
import { router } from "expo-router";
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as Application from "expo-application";
import Constants from "expo-constants";
import * as Device from "expo-device";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { SvgXml } from "react-native-svg";
import { LOGO_XML } from "@/components/logoXml";
import { FormError, Lead, ModalHeader, PrimaryButton, SecondaryButton } from "@/components/ui";
import { api } from "@/lib/api";
import { haptic } from "@/lib/haptics";
import { errorMessage, useSession } from "@/state/session";
import { useTheme } from "@/theme/tokens";

const KEY = "d1.betaRequested.v1";

export default function Beta() {
  const t = useTheme();
  const insets = useSafeAreaInsets();
  const { me, email } = useSession();
  const [requested, setRequested] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    AsyncStorage.getItem(KEY)
      .then((v) => setRequested(v === "1"))
      .catch(() => undefined);
  }, []);

  async function join() {
    setBusy(true);
    setError(null);
    try {
      const version = Constants.expoConfig?.version;
      const build = Application.nativeBuildVersion;
      await api.sendFeedback({
        kind: "idea",
        body: `Beta tester request: please add ${email ?? "this member"}${me?.displayName ? ` (${me.displayName})` : ""} to the Destiny One nightly TestFlight group.`,
        appVersion: version ? (build ? `${version} (${build})` : version) : undefined,
        platform: Platform.OS,
        osVersion: Device.osVersion ?? undefined,
        device: Device.modelName ?? undefined,
      });
      haptic.success();
      AsyncStorage.setItem(KEY, "1").catch(() => undefined);
      setRequested(true);
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setBusy(false);
    }
  }

  return (
    <View style={{ flex: 1, backgroundColor: t.grouped, paddingTop: insets.top, paddingHorizontal: 16, paddingBottom: Math.max(insets.bottom, 16) }}>
      <ModalHeader title="Beta" />
      <View style={{ flex: 1, alignItems: "center", justifyContent: "center", gap: 18 }}>
        <View style={{ width: 88, height: 88 }}>
          <SvgXml xml={LOGO_XML} width={88} height={88} />
        </View>
        <Text accessibilityRole="header" style={{ fontSize: 28, fontWeight: "700", textAlign: "center", color: t.text }}>
          {requested ? "You're on the list" : "Become a beta tester?"}
        </Text>
        <Lead style={{ textAlign: "center", maxWidth: 320 }}>
          {requested
            ? "The Destiny One team will add you to the nightly release. You'll get an invite from TestFlight by email."
            : "Move to the nightly release of Destiny One and try new features first. Nightly builds can be rough around the edges, and your feedback helps us fix things before everyone else sees them."}
        </Lead>
        <FormError message={error} />
      </View>
      {requested ? (
        <SecondaryButton label="Done" onPress={() => router.back()} />
      ) : (
        <View style={{ gap: 10 }}>
          <PrimaryButton label="Yes, make me a beta tester" onPress={join} busy={busy} />
          <SecondaryButton label="Not now" onPress={() => router.back()} />
        </View>
      )}
    </View>
  );
}
