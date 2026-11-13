// Sermon notes (Profile → Notes): newest first, searchable, kept on this phone.

import { useMemo, useState } from "react";
import { Pressable, ScrollView, Text, View } from "react-native";
import { router } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Icon } from "@/components/Icon";
import { Card, EmptyState, Field, FloatingBack, LargeTitle, Lead, PrimaryButton, Separator } from "@/components/ui";
import { dayLabel } from "@/lib/format";
import { createNote, useNotes } from "@/state/notes";
import { useTheme } from "@/theme/tokens";

export default function Notes() {
  const t = useTheme();
  const insets = useSafeAreaInsets();
  const notes = useNotes();
  const [query, setQuery] = useState("");
  const shown = useMemo(() => {
    const q = query.trim().toLowerCase();
    return (notes ?? []).filter((n) => !q || n.title.toLowerCase().includes(q) || n.body.toLowerCase().includes(q));
  }, [notes, query]);

  async function start() {
    const note = await createNote();
    router.push(`/notes/${note.id}`);
  }

  return (
    <View style={{ flex: 1, backgroundColor: t.grouped }}>
      <ScrollView contentContainerStyle={{ paddingTop: insets.top + 56, paddingHorizontal: 16, paddingBottom: insets.bottom + 40, gap: 16 }} keyboardShouldPersistTaps="handled">
        <View style={{ paddingHorizontal: 4, gap: 6 }}>
          <LargeTitle>Notes</LargeTitle>
          <Lead>Your sermon notes. They stay on this phone and are removed if you sign out.</Lead>
        </View>
        <PrimaryButton label="New note" onPress={() => void start()} />
        {notes && notes.length > 0 ? (
          <Field value={query} onChangeText={setQuery} placeholder="Search your notes" background={t.card} leading={<Icon name="search" size={16} color={t.subtle} />} />
        ) : null}
        {notes && shown.length === 0 ? (
          <EmptyState title={notes.length ? "No notes match" : "No notes yet"} body={notes.length ? "Try another word." : "Start one during a sermon. Type a reference like John 3:16 and the verse shows under your note."} />
        ) : (
          <Card>
            {shown.map((n, i) => (
              <View key={n.id}>
                {i > 0 ? <Separator /> : null}
                <Pressable onPress={() => router.push(`/notes/${n.id}`)} accessibilityRole="button" style={({ pressed }) => ({ padding: 16, gap: 4, backgroundColor: pressed ? t.fill : "transparent" })}>
                  <Text numberOfLines={1} style={{ fontSize: 17, fontWeight: "600", color: t.text }}>{n.title}</Text>
                  <Text numberOfLines={2} style={{ fontSize: 14, color: t.muted }}>{[dayLabel(n.updatedAt), n.body.split("\n").find((l) => l.trim())].filter(Boolean).join(" · ")}</Text>
                </Pressable>
              </View>
            ))}
          </Card>
        )}
      </ScrollView>
      <FloatingBack background={t.grouped} />
    </View>
  );
}
