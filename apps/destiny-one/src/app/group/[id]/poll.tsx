// Compose a poll to send into the chat. Sending happens back on the group
// screen (state/pollDraft.ts) once this screen hands back a valid draft.

import { useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { router } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { MAX_POLL_OPTIONS, MIN_POLL_OPTIONS, validatePoll } from "@destiny/shared";
import { Icon } from "@/components/Icon";
import { Card, Field, FieldLabel, FormError, ModalHeader, PickRow, PrimaryButton, SectionLabel, TextButton } from "@/components/ui";
import { pollDraft } from "@/state/pollDraft";
import { useTheme } from "@/theme/tokens";

export default function Poll() {
  const t = useTheme();
  const insets = useSafeAreaInsets();
  const [question, setQuestion] = useState("");
  const [options, setOptions] = useState(["", ""]);
  const [allowMultiple, setAllowMultiple] = useState(false);

  const draft = { question, options, allowMultiple };
  const check = validatePoll(draft);

  function setOption(i: number, value: string) {
    setOptions((prev) => prev.map((o, idx) => (idx === i ? value : o)));
  }

  function removeOption(i: number) {
    setOptions((prev) => prev.filter((_, idx) => idx !== i));
  }

  function send() {
    if (!check.ok) return;
    pollDraft.set(draft);
    router.back();
  }

  return (
    <View style={{ flex: 1, backgroundColor: t.grouped, paddingTop: insets.top, paddingHorizontal: 16, paddingBottom: Math.max(insets.bottom, 16) }}>
      <ModalHeader title="Poll" />
      <ScrollView contentContainerStyle={{ gap: 20, paddingTop: 14 }} keyboardShouldPersistTaps="handled">
        <View style={{ gap: 8 }}>
          <FieldLabel>Question</FieldLabel>
          <Field value={question} onChangeText={setQuestion} placeholder="What should we ask?" background={t.card} />
        </View>

        <View style={{ gap: 8 }}>
          <SectionLabel>Options</SectionLabel>
          <Card>
            {options.map((value, i) => (
              <View key={i}>
                {i > 0 ? <View style={{ height: StyleSheet.hairlineWidth, backgroundColor: t.sep, marginLeft: 16 }} /> : null}
                <View style={{ flexDirection: "row", alignItems: "center", paddingHorizontal: 16, gap: 10 }}>
                  <Field
                    value={value}
                    onChangeText={(v) => setOption(i, v)}
                    placeholder={`Option ${i + 1}`}
                    background={t.card}
                    containerStyle={{ flex: 1 }}
                  />
                  {options.length > MIN_POLL_OPTIONS ? (
                    <Pressable onPress={() => removeOption(i)} accessibilityLabel={`Remove option ${i + 1}`} hitSlop={8}>
                      <Icon name="close" size={14} color={t.subtle} strokeWidth={2.6} />
                    </Pressable>
                  ) : null}
                </View>
              </View>
            ))}
          </Card>
          {options.length < MAX_POLL_OPTIONS ? <TextButton label="Add option" onPress={() => setOptions((prev) => [...prev, ""])} /> : null}
        </View>

        <View style={{ gap: 8 }}>
          <Card>
            <PickRow label="Allow selecting more than one option" on={allowMultiple} onPress={() => setAllowMultiple((v) => !v)} />
          </Card>
        </View>

        <FormError message={!check.ok && (question || options.some(Boolean)) ? check.reason : null} />
      </ScrollView>
      <PrimaryButton label="Send" onPress={send} disabled={!check.ok} style={{ marginTop: 14 }} />
    </View>
  );
}
