// A1 Welcome — first launch and after sign-out. Email for everyone;
// ChurchSuite for staff and leaders (A4). No phone option, by design.

import { useState } from "react";
import { Text, View } from "react-native";
import { router } from "expo-router";
import { SvgXml } from "react-native-svg";
import { AuthScreen } from "@/components/AuthScreen";
import { LOGO_XML } from "@/components/logoXml";
import { FormError, Lead, PrimaryButton, SecondaryButton } from "@/components/ui";
import { signInWithChurchSuite } from "@/lib/auth";
import { errorMessage, routeFor, useSession } from "@/state/session";
import { useTheme } from "@/theme/tokens";

export default function Welcome() {
  const t = useTheme();
  const { setMe } = useSession();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function churchSuite() {
    setBusy(true);
    setError(null);
    try {
      const result = await signInWithChurchSuite();
      if (result.kind === "signed-in") {
        setMe(result.me);
        router.replace(routeFor(result.me));
      } else if (result.kind === "failed") {
        setError("Couldn't sign in with ChurchSuite. Try email instead.");
      }
    } catch (err) {
      setError(errorMessage(err, "Couldn't sign in with ChurchSuite. Try email instead."));
    } finally {
      setBusy(false);
    }
  }

  return (
    <AuthScreen
      footer={
        <>
          <FormError message={error} />
          <PrimaryButton label="Continue with email" onPress={() => router.push("/email")} />
          <SecondaryButton label="Sign in with ChurchSuite" onPress={churchSuite} busy={busy} style={{ marginTop: 4 }} />
          <Text style={{ fontSize: 13, lineHeight: 18, color: t.subtle, textAlign: "center" }}>ChurchSuite sign-in is for staff and leaders.</Text>
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
