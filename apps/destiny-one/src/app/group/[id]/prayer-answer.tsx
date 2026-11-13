// Mark my own prayer request answered, with an optional short update. The card
// in the chat changes to Answered and the group gets a notification.

import { useState } from "react";
import { ScrollView, Text, View } from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import { MAX_PRAYER_UPDATE_LENGTH } from "@destiny/shared";
import { Field, FieldLabel, FormError, ModalForm, ModalHeader, PrimaryButton } from "@/components/ui";
import { api } from "@/lib/api";
import { keys, updateMessages } from "@/lib/queries";
import { queryClient } from "@/lib/queryClient";
import { errorMessage } from "@/state/session";
import { useTheme } from "@/theme/tokens";

export default function PrayerAnswer() {
  const t = useTheme();
  const { id, messageId } = useLocalSearchParams<{ id: string; messageId: string }>();
  const [update, setUpdate] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function save() {
    const mid = Number(messageId);
    const text = update.trim() || null;
    setBusy(true);
    setError(null);
    try {
      await api.answerPrayer(mid, text);
      // Shown at once here; everyone else hears it over Realtime.
      const answeredAt = new Date().toISOString();
      updateMessages(id, (list) =>
        list.map((m) => (m.id === mid && m.content?.kind === "prayer" ? { ...m, content: { kind: "prayer", prayer: { ...m.content.prayer, answeredAt, answerUpdate: text } } } : m)),
      );
      void queryClient.invalidateQueries({ queryKey: keys.prayers(id) });
      router.back();
    } catch (err) {
      setError(errorMessage(err, "Couldn't save that. Try again."));
    } finally {
      setBusy(false);
    }
  }

  return (
    <ModalForm>
      <ModalHeader title="Mark as answered" />
      <ScrollView contentContainerStyle={{ gap: 14, paddingTop: 14 }} keyboardShouldPersistTaps="handled">
        <View style={{ gap: 8 }}>
          <FieldLabel>Add an update (optional)</FieldLabel>
          <Field value={update} onChangeText={setUpdate} placeholder="What happened?" background={t.card} multiline maxLength={MAX_PRAYER_UPDATE_LENGTH} inputStyle={{ minHeight: 80, textAlignVertical: "top" }} />
        </View>
        <Text style={{ fontSize: 14, lineHeight: 19, color: t.muted, paddingHorizontal: 4 }}>The group will be told it was answered. This can&apos;t be undone.</Text>
        <FormError message={error} />
      </ScrollView>
      <PrimaryButton label="Mark as answered" busy={busy} onPress={() => void save()} style={{ marginTop: 14 }} />
    </ModalForm>
  );
}
