// B5 Report a message — quick reason plus optional detail (1000 max). Only
// the safeguarding team sees reports; the sender isn't told who reported.

import { useState } from "react";
import { ScrollView, StyleSheet, Text, View } from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Card, Field, FieldLabel, FormError, ModalHeader, PickRow, PrimaryButton, SectionLabel } from "@/components/ui";
import { api } from "@/lib/api";
import { clock } from "@/lib/format";
import { errorMessage } from "@/state/session";
import { useTheme } from "@/theme/tokens";

const REASONS = ["Inappropriate", "Bullying or harassment", "Makes me feel unsafe", "Spam", "Something else"];
const MAX = 1000;

export default function Report() {
  const t = useTheme();
  const insets = useSafeAreaInsets();
  const { messageId, name, at, body } = useLocalSearchParams<{ messageId: string; name: string; at: string; body: string }>();
  const [reason, setReason] = useState<string | null>(null);
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function send() {
    if (!reason) return;
    const text = note.trim() ? `${reason}: ${note.trim()}` : reason;
    setBusy(true);
    setError(null);
    try {
      await api.report(Number(messageId), text.slice(0, MAX));
      router.replace("/report-sent");
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setBusy(false);
    }
  }

  return (
    <View style={{ flex: 1, backgroundColor: t.grouped, paddingTop: insets.top, paddingHorizontal: 16, paddingBottom: Math.max(insets.bottom, 16) }}>
      <ModalHeader title="Report message" />
      <ScrollView contentContainerStyle={{ gap: 20, paddingTop: 14 }} keyboardShouldPersistTaps="handled">
        <Card style={{ gap: 4, paddingVertical: 12, paddingHorizontal: 14 }}>
          <Text style={{ fontSize: 13, fontWeight: "600", color: t.muted }}>
            {name}
            {at ? ` · ${clock(at)}` : ""}
          </Text>
          <Text numberOfLines={6} style={{ fontSize: 16, lineHeight: 21, color: t.text }}>
            {body}
          </Text>
        </Card>

        <View style={{ gap: 8 }}>
          <SectionLabel>What&apos;s wrong with it?</SectionLabel>
          <Card>
            {REASONS.map((r, i) => (
              <View key={r}>
                {i > 0 ? <View style={{ height: StyleSheet.hairlineWidth, backgroundColor: t.sep, marginLeft: 16 }} /> : null}
                <PickRow label={r} on={reason === r} onPress={() => setReason(r)} />
              </View>
            ))}
          </Card>
        </View>

        <View style={{ gap: 8 }}>
          <FieldLabel optional>Anything else?</FieldLabel>
          <Field
            value={note}
            onChangeText={(v) => setNote(v.slice(0, MAX))}
            placeholder="Tell us what happened"
            multiline
            maxLength={MAX}
            background={t.card}
            footer={<Text style={{ alignSelf: "flex-end", paddingBottom: 10, fontSize: 12, color: t.subtle, fontVariant: ["tabular-nums"] }}>{note.length} / {MAX}</Text>}
          />
          <Text style={{ paddingHorizontal: 16, fontSize: 13, lineHeight: 18, color: t.subtle }}>Only our safeguarding team sees reports. The other person isn&apos;t told it was you.</Text>
        </View>
        <FormError message={error} />
      </ScrollView>
      <PrimaryButton label="Send report" onPress={send} busy={busy} disabled={!reason} style={{ marginTop: 14 }} />
    </View>
  );
}
