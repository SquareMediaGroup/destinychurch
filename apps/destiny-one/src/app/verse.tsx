// Find a passage and drop it in: type a reference ("John 3:16", "Rom 8:28-30",
// "Psalm 23"), see it, and add it. From a chat (?groupId=) it is sent as a
// message, which gets a verse card; from a sermon note (?note=) it is added to
// the note.

import { useState } from "react";
import { ScrollView, Text, View } from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import { findReference } from "@destiny/shared";
import { VerseCard } from "@/components/VerseCard";
import { Field, FieldLabel, ModalForm, ModalHeader, PrimaryButton } from "@/components/ui";
import { appendToNote } from "@/state/notes";
import { verseDraft } from "@/state/verseDraft";
import { useTheme } from "@/theme/tokens";

export default function VersePicker() {
  const t = useTheme();
  const { groupId, note } = useLocalSearchParams<{ groupId?: string; note?: string }>();
  const [query, setQuery] = useState("");
  const ref = findReference(query.trim()) ?? findReference(capitalise(query.trim()));

  function add() {
    if (!ref) return;
    if (groupId) verseDraft.set(`chat:${groupId}`, ref.label);
    else if (note) void appendToNote(note, ref.label);
    router.back();
  }

  return (
    <ModalForm>
      <ModalHeader title="Verse" />
      <ScrollView contentContainerStyle={{ gap: 14, paddingTop: 14 }} keyboardShouldPersistTaps="handled">
        <View style={{ gap: 8 }}>
          <FieldLabel>Reference</FieldLabel>
          <Field value={query} onChangeText={setQuery} placeholder="John 3:16, Romans 8:28-30, Psalm 23" background={t.card} autoFocus autoCorrect={false} returnKeyType="done" onSubmitEditing={add} />
        </View>
        {ref ? (
          // The bibleId is the church's default: the server answers in its version when none is given.
          <VerseCard verse={{ passageId: ref.passageId, bibleId: 0, label: ref.label }} />
        ) : query.trim() ? (
          <Text style={{ fontSize: 14, color: t.muted, paddingHorizontal: 4 }}>Type a book, chapter and verse, like John 3:16.</Text>
        ) : null}
      </ScrollView>
      <PrimaryButton label={groupId ? `Send ${ref?.label ?? "verse"}` : `Add ${ref?.label ?? "verse"}`} disabled={!ref} onPress={add} style={{ marginTop: 14 }} />
    </ModalForm>
  );
}

/** "john 3:16" works as typed; "romans 8" needs a capital, which the finder asks for in messages but not here. */
function capitalise(s: string): string {
  return s.replace(/(^|\s)(\p{Ll})/u, (_m, sp: string, c: string) => sp + c.toUpperCase());
}
