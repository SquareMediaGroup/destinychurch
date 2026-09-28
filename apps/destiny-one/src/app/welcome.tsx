// A1 Welcome — first launch and after sign-out. Email for everyone. No phone
// option, by design. "Sign in with ChurchSuite" (A4) is built
// (signInWithChurchSuite in lib/auth.ts) but hidden until it's switched on:
// App Review tends to reject "coming soon" placeholders (decided 2026-09-28).

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
