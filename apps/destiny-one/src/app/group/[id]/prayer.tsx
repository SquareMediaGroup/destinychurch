// Write a prayer request for this group. It is sent back on the group screen
// (state/prayerDraft.ts), like a poll.

import { useState } from "react";
import { ScrollView, Text, View } from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import { MAX_PRAYER_LENGTH } from "@destiny/shared";
import { Field, FieldLabel, ModalForm, ModalHeader, PrimaryButton } from "@/components/ui";
import { prayerDraft } from "@/state/prayerDraft";
import { useTheme } from "@/theme/tokens";

export default function PrayerRequest() {
  const t = useTheme();
  const { id } = useLocalSearchParams<{ id: string }>();
  const [text, setText] = useState("");
  const trimmed = text.trim();

  function send() {
    if (!trimmed) return;
    prayerDraft.set(id, trimmed);
    router.back();
  }

  return (
    <ModalForm>
      <ModalHeader title="Prayer request" />
      <ScrollView contentContainerStyle={{ gap: 14, paddingTop: 14 }} keyboardShouldPersistTaps="handled">
        <View style={{ gap: 8 }}>
          <FieldLabel>What would you like prayer for?</FieldLabel>
          <Field value={text} onChangeText={setText} placeholder="Write your request" background={t.card} multiline maxLength={MAX_PRAYER_LENGTH} autoFocus inputStyle={{ minHeight: 120, textAlignVertical: "top" }} />
          <Text style={{ alignSelf: "flex-end", fontSize: 13, color: t.subtle }}>{`${text.length} of ${MAX_PRAYER_LENGTH}`}</Text>
        </View>
        <Text style={{ fontSize: 14, lineHeight: 19, color: t.muted, paddingHorizontal: 4 }}>
          Everyone in this group will see it and can tap &quot;I prayed&quot;. Share only what you&apos;re comfortable with the group knowing, especially about someone else. You can delete it at any time, and mark it answered later.
        </Text>
      </ScrollView>
      <PrimaryButton label="Share with the group" onPress={send} disabled={!trimmed} style={{ marginTop: 14 }} />
    </ModalForm>
  );
}
