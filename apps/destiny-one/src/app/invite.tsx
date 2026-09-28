// Invite by email (leaders) — for someone who isn't on Destiny One yet. They
// get an email, sign in, and the church office confirms them (including their
// age) before they join the group. What the leader picks here is only a hint.

import { useState } from "react";
import { ScrollView, StyleSheet, Text, View } from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Icon } from "@/components/Icon";
import { Card, Field, FieldLabel, FormError, ModalHeader, PickRow, PrimaryButton, SectionLabel } from "@/components/ui";
import { api } from "@/lib/api";
import { errorMessage, useGroupSummary } from "@/state/session";
import { useTheme } from "@/theme/tokens";

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export default function Invite() {
  const t = useTheme();
  const insets = useSafeAreaInsets();
  const { groupId } = useLocalSearchParams<{ groupId: string }>();
  const summary = useGroupSummary(groupId);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [adult, setAdult] = useState<boolean | null>(null);
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const ready = name.trim().length >= 2 && EMAIL.test(email.trim()) && adult !== null;

  async function send() {
    if (!ready || adult === null) return;
    setBusy(true);
    setError(null);
    try {
      await api.inviteToGroup(groupId, { name: name.trim(), email: email.trim(), adult });
      setSent(true);
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setBusy(false);
    }
  }

  if (sent) {
    return (
      <View style={{ flex: 1, backgroundColor: t.grouped, paddingTop: insets.top, paddingHorizontal: 16, paddingBottom: Math.max(insets.bottom, 16) }}>
        <View style={{ flex: 1, alignItems: "center", justifyContent: "center", gap: 18 }}>
          <View style={{ width: 76, height: 76, borderRadius: 38, backgroundColor: t.accentSoft, alignItems: "center", justifyContent: "center" }}>
            <Icon name="mail" size={34} color={t.tint} strokeWidth={1.8} />
          </View>
          <Text style={{ fontSize: 28, fontWeight: "700", color: t.text }}>Invite sent</Text>
          <Text style={{ fontSize: 17, lineHeight: 23, color: t.muted, textAlign: "center", maxWidth: 300 }}>
            {name.trim().split(" ")[0]} will get an email. Once they sign in, the church office will confirm them and add them to {summary?.group.name ?? "the group"}.
          </Text>
        </View>
        <PrimaryButton label="Done" onPress={() => router.back()} />
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: t.grouped, paddingTop: insets.top, paddingHorizontal: 16, paddingBottom: Math.max(insets.bottom, 16) }}>
      <ModalHeader title="Invite by email" icon="back" />
      <ScrollView contentContainerStyle={{ gap: 20, paddingTop: 14 }} keyboardShouldPersistTaps="handled">
        <View style={{ gap: 8 }}>
          <FieldLabel>Full name</FieldLabel>
          <Field value={name} onChangeText={setName} placeholder="As the church knows them" autoCapitalize="words" background={t.card} />
        </View>
        <View style={{ gap: 8 }}>
          <FieldLabel>Email</FieldLabel>
          <Field value={email} onChangeText={setEmail} placeholder="name@example.com" keyboardType="email-address" autoCapitalize="none" autoCorrect={false} background={t.card} />
        </View>
        <View style={{ gap: 8 }}>
          <SectionLabel>Are they 18 or over?</SectionLabel>
          <Card>
            <PickRow label="Adult (18 or over)" on={adult === true} onPress={() => setAdult(true)} />
            <View style={{ height: StyleSheet.hairlineWidth, backgroundColor: t.sep, marginLeft: 16 }} />
            <PickRow label="Under 18" on={adult === false} onPress={() => setAdult(false)} />
          </Card>
          <Text style={{ paddingHorizontal: 16, fontSize: 13, lineHeight: 18, color: t.subtle }}>
            The church office confirms everyone&apos;s age before they join{summary ? ` ${summary.group.name}` : ""}. If they already use Destiny One, add them from the list instead.
          </Text>
        </View>
        <FormError message={error} />
      </ScrollView>
      <PrimaryButton label="Send invite" onPress={send} busy={busy} disabled={!ready} style={{ marginTop: 14 }} />
    </View>
  );
}
