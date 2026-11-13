// One sermon note: a title and plain text ("# " for a heading, "- " for a
// bullet). Every Bible reference typed in it shows as a verse card underneath;
// "Add verse" finds one and adds it. "Share to a group" sends the note as a
// normal message from you (its first reference arrives as a verse card).

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Alert, ScrollView, Text, TextInput, View } from "react-native";
import { router, useFocusEffect, useLocalSearchParams } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { findReferences } from "@destiny/shared";
import { VerseCard } from "@/components/VerseCard";
import { FloatingBack, SectionLabel, TextButton } from "@/components/ui";
import { deleteNote, getNote, saveNote, useNotes } from "@/state/notes";
import { useTheme } from "@/theme/tokens";

const MAX_CARDS = 10;

export default function Note() {
  const t = useTheme();
  const insets = useSafeAreaInsets();
  const { id } = useLocalSearchParams<{ id: string }>();
  useNotes(); // loads the notes, so getNote finds this one
  const note = getNote(id);
  const [title, setTitle] = useState<string | null>(null);
  const [body, setBody] = useState<string | null>(null);
  const shownTitle = title ?? note?.title ?? "";
  const shownBody = body ?? note?.body ?? "";

  // Saved a moment after typing stops, and on leaving.
  const pending = useRef<{ title?: string; body?: string }>({});
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const queue = (patch: { title?: string; body?: string }) => {
    pending.current = { ...pending.current, ...patch };
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => {
      void saveNote(id, pending.current);
      pending.current = {};
    }, 600);
  };
  useEffect(
    () => () => {
      if (timer.current) clearTimeout(timer.current);
      if (Object.keys(pending.current).length) void saveNote(id, pending.current);
    },
    [id],
  );

  /** Saves what's typed now, before another screen changes the note (Add verse). */
  const flush = () => {
    if (timer.current) clearTimeout(timer.current);
    const patch = pending.current;
    pending.current = {};
    return Object.keys(patch).length ? saveNote(id, patch) : Promise.resolve();
  };
  // Coming back from Add verse: show the note as saved, with the verse added.
  useFocusEffect(
    useCallback(() => {
      setBody(null);
      setTitle(null);
    }, []),
  );

  const refs = useMemo(() => {
    const seen = new Set<string>();
    return findReferences(shownBody).filter((r) => (seen.has(r.passageId) ? false : (seen.add(r.passageId), true))).slice(0, MAX_CARDS);
  }, [shownBody]);

  if (!note) {
    return (
      <View style={{ flex: 1, backgroundColor: t.grouped, paddingTop: insets.top + 80, paddingHorizontal: 20 }}>
        <Text style={{ fontSize: 16, color: t.muted }}>This note isn&apos;t on this phone any more.</Text>
        <FloatingBack background={t.grouped} />
      </View>
    );
  }

  function remove() {
    Alert.alert("Delete this note?", "It can't be brought back.", [
      { text: "Keep it", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: () => {
          pending.current = {};
          void deleteNote(id).then(() => router.back());
        },
      },
    ]);
  }

  return (
    <View style={{ flex: 1, backgroundColor: t.grouped }}>
      <ScrollView contentContainerStyle={{ paddingTop: insets.top + 56, paddingHorizontal: 20, paddingBottom: insets.bottom + 60, gap: 14 }} keyboardShouldPersistTaps="handled">
        <TextInput
          value={shownTitle}
          onChangeText={(v) => {
            setTitle(v);
            queue({ title: v });
          }}
          placeholder="Title"
          placeholderTextColor={t.subtle}
          accessibilityLabel="Title"
          style={{ fontSize: 26, fontWeight: "700", color: t.text }}
        />
        <TextInput
          value={shownBody}
          onChangeText={(v) => {
            setBody(v);
            queue({ body: v });
          }}
          placeholder={"Write as you listen.\n# A heading\n- A point\nJohn 3:16 shows the verse below."}
          placeholderTextColor={t.subtle}
          accessibilityLabel="Note"
          multiline
          scrollEnabled={false}
          style={{ minHeight: 220, fontSize: 17, lineHeight: 25, color: t.text, textAlignVertical: "top" }}
        />
        <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 20 }}>
          <TextButton label="Add verse" onPress={() => void flush().then(() => router.push({ pathname: "/verse", params: { note: id } }))} />
          <TextButton label="Share to a group" onPress={() => void flush().then(() => router.push({ pathname: "/share-verse", params: { note: id } }))} />
          <TextButton label="Delete" onPress={remove} color={t.muted} />
        </View>
        {refs.length ? (
          <View style={{ gap: 6 }}>
            <SectionLabel>Verses in this note</SectionLabel>
            {refs.map((r) => (
              <VerseCard key={r.passageId} verse={{ passageId: r.passageId, bibleId: 0, label: r.label }} />
            ))}
          </View>
        ) : null}
      </ScrollView>
      <FloatingBack background={t.grouped} />
    </View>
  );
}
