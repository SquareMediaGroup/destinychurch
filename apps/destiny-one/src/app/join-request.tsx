// Ask to join a group from Discover, with an optional note for its leaders.

import { useState } from "react";
import { ScrollView, Text, View } from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import { MAX_JOIN_NOTE_LENGTH } from "@destiny/shared";
import { Field, FieldLabel, FormError, ModalForm, ModalHeader, PrimaryButton } from "@/components/ui";
import { api } from "@/lib/api";
import { queryClient } from "@/lib/queryClient";
import { errorMessage } from "@/state/session";
import { useTheme } from "@/theme/tokens";

export default function JoinRequest() {
  const t = useTheme();
  const { groupId, name } = useLocalSearchParams<{ groupId: string; name?: string }>();
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function send() {
    setBusy(true);
    setError(null);
    try {
      await api.requestJoin(groupId, note.trim() || null);
      void queryClient.invalidateQueries({ queryKey: ["discover"] });
      router.back();
    } catch (err) {
      setError(errorMessage(err, "Couldn't send your request. Try again."));
    } finally {
      setBusy(false);
    }
  }

  return (
    <ModalForm>
      <ModalHeader title="Ask to join" />
      <ScrollView contentContainerStyle={{ gap: 14, paddingTop: 14 }} keyboardShouldPersistTaps="handled">
        <Text style={{ fontSize: 22, fontWeight: "700", color: t.text, paddingHorizontal: 4 }}>{name ?? "This group"}</Text>
        <View style={{ gap: 8 }}>
          <FieldLabel>A note for the leaders (optional)</FieldLabel>
          <Field value={note} onChangeText={setNote} placeholder="Say hello, or what you're looking for" background={t.card} multiline maxLength={MAX_JOIN_NOTE_LENGTH} inputStyle={{ minHeight: 100, textAlignVertical: "top" }} />
        </View>
        <Text style={{ fontSize: 14, lineHeight: 19, color: t.muted, paddingHorizontal: 4 }}>
          A leader sees your name and your note, and answers your request. You can have up to 3 waiting at a time, and you can cancel one whenever you like.
        </Text>
        <FormError message={error} />
      </ScrollView>
      <PrimaryButton label="Send request" busy={busy} onPress={() => void send()} style={{ marginTop: 14 }} />
    </ModalForm>
  );
}
