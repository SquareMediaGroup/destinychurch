// A1 Welcome — first launch and after sign-out. Email for everyone;
// ChurchSuite for staff and leaders (A4) shows "Coming soon" for now.
// No phone option, by design.

import { useEffect } from "react";
import { Text, View } from "react-native";
import { router } from "expo-router";
import { SvgXml } from "react-native-svg";
import { AuthScreen } from "@/components/AuthScreen";
import { LOGO_XML } from "@/components/logoXml";
import { Lead, PrimaryButton, TextButton } from "@/components/ui";
import { cancelAdd } from "@/lib/accounts";
import { useSession } from "@/state/session";
import { useTheme } from "@/theme/tokens";

export default function Welcome() {
  const t = useTheme();
  const { accounts } = useSession();

  // A plain sign-in from here, never a half-finished "Add account".
  useEffect(() => {
    void cancelAdd();
  }, []);

  return (
    <AuthScreen
      footer={
        <>
          <PrimaryButton label="Continue with email" onPress={() => router.push("/email")} />
          {/* ChurchSuite sign-in (A4) is built (signInWithChurchSuite in lib/auth.ts) but not switched on yet. */}
          <View accessible accessibilityRole="button" accessibilityState={{ disabled: true }} accessibilityLabel="Sign in with ChurchSuite, coming soon" style={{ marginTop: 4, height: 52, borderRadius: 999, backgroundColor: t.fill, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, opacity: 0.6 }}>
            <Text style={{ fontSize: 17, fontWeight: "600", color: t.text }}>Sign in with ChurchSuite</Text>
            <View style={{ paddingHorizontal: 8, paddingVertical: 2, borderRadius: 8, backgroundColor: t.accentSoft }}>
              <Text style={{ fontSize: 12, fontWeight: "700", color: t.tint }}>Coming soon</Text>
            </View>
          </View>
          <Text style={{ fontSize: 13, lineHeight: 18, color: t.subtle, textAlign: "center" }}>ChurchSuite sign-in for staff and leaders is coming soon.</Text>
          {accounts.length > 0 ? <TextButton label="Use another account on this phone" onPress={() => router.push("/accounts")} style={{ alignSelf: "center", paddingVertical: 8 }} /> : null}
        </>
      }
    >
      <View style={{ flex: 1, alignItems: "center", justifyContent: "center", gap: 22 }}>
        <View style={[{ width: 108, height: 108, borderRadius: 26, backgroundColor: t.card, alignItems: "center", justifyContent: "center", borderWidth: 0.5, borderColor: t.glassLine }, t.shadow]}>
          <SvgXml xml={LOGO_XML} width={84} height={84} accessibilityLabel="Destiny Church" />
        </View>
        <View style={{ alignItems: "center", gap: 10 }}>
          <Text style={{ fontSize: 34, fontWeight: "700", letterSpacing: 0.3, color: t.text }}>Destiny One</Text>
          <Lead style={{ textAlign: "center", maxWidth: 290 }}>Group chat for the teams and communities of Destiny Church.</Lead>
        </View>
      </View>
    </AuthScreen>
  );
}
