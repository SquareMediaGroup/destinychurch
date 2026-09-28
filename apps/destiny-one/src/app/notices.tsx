// A9 Notices — must be accepted before chatting. The server says which are
// outstanding (they re-show when a notice's version changes).

import { useState } from "react";
import { Pressable, Text, View } from "react-native";
import { router } from "expo-router";
import { AuthScreen } from "@/components/AuthScreen";
import { Icon, type IconName } from "@/components/Icon";
import { SafetyNotice, openDocument } from "@/components/SafetyNotice";
import { Card, FormError, LargeTitle, Lead, PrimaryButton, Separator } from "@/components/ui";
import { api } from "@/lib/api";
import { errorMessage, routeFor, useSession } from "@/state/session";
import { useTheme } from "@/theme/tokens";

export default function Notices() {
  const { me, setMe } = useSession();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function agree() {
    if (!me) return;
    setBusy(true);
    setError(null);
    try {
      const next = await api.acceptConsents(me.outstandingConsents);
      setMe(next);
      router.replace(routeFor(next));
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setBusy(false);
    }
  }

  return (
    <AuthScreen grouped footer={<><FormError message={error} /><PrimaryButton label="I agree" onPress={agree} busy={busy} /></>}>
      <View style={{ paddingTop: 30, paddingHorizontal: 4, gap: 8 }}>
        <LargeTitle>Before you start</LargeTitle>
        <Lead>Please read these. You&apos;ll need to agree to them to use Destiny One.</Lead>
      </View>
      <Card style={{ marginTop: 24 }}>
        <DocRow icon="docLines" label="Privacy notice" onPress={() => openDocument("privacy")} />
        <Separator inset={64} />
        <DocRow icon="terms" label="Terms" onPress={() => openDocument("terms")} />
        <Separator inset={64} />
        <SafetyNotice />
      </Card>
    </AuthScreen>
  );
}

function DocRow({ icon, label, onPress }: { icon: IconName; label: string; onPress: () => void }) {
  const t = useTheme();
  return (
    <Pressable onPress={onPress} accessibilityRole="link" style={({ pressed }) => ({ flexDirection: "row", alignItems: "center", gap: 14, paddingVertical: 14, paddingHorizontal: 16, backgroundColor: pressed ? t.fill : "transparent" })}>
      <View style={{ width: 34, height: 34, borderRadius: 10, backgroundColor: t.fill, alignItems: "center", justifyContent: "center" }}>
        <Icon name={icon} size={19} color={t.text} strokeWidth={1.8} />
      </View>
      <Text style={{ flex: 1, fontSize: 17, color: t.text }}>{label}</Text>
      <Icon name="chevronRight" size={14} color={t.subtle} strokeWidth={2.4} />
    </Pressable>
  );
}
