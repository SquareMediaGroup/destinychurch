// A verse card: the passage a message (or a note) mentions, as YouVersion has
// it in the church's Bible. Up to about six verses; a longer passage is cut with
// "Read more", which opens it whole. Always with the version and the
// publisher's copyright line under it (YouVersion requires it), and "Read in
// Bible App". If the words can't be loaded (YouVersion down, or not set up yet)
// it says so and still offers the Bible App.

import { Pressable, Text, View } from "react-native";
import { router } from "expo-router";
import type { D1VerseRef } from "@destiny/shared";
import { Icon } from "@/components/Icon";
import { openInBibleApp, passageUrl, usePassage } from "@/lib/bible";
import { useTheme } from "@/theme/tokens";

const LINES = 8;

export interface VerseTones {
  text: string;
  soft: string;
  panel: string;
  name: string;
}

export function VerseCard({ verse, tones: k, style }: { verse: D1VerseRef; tones?: VerseTones; style?: object }) {
  const t = useTheme();
  const tone = k ?? { text: t.text, soft: t.muted, panel: t.card, name: t.tint };
  const passage = usePassage(verse.passageId, verse.bibleId);
  const url = passageUrl(verse.passageId, verse.bibleId, passage.data?.webUrl);
  const long = (passage.data?.text.length ?? 0) > 420;
  const open = () => router.push({ pathname: "/passage", params: { id: verse.passageId, bible: String(verse.bibleId) } });

  return (
    <View style={[{ marginTop: 6, borderRadius: 14, backgroundColor: tone.panel, padding: 10, gap: 6, minWidth: 220 }, style]}>
      <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
        <Icon name="doc" size={13} color={tone.name} strokeWidth={2.2} />
        <Text style={{ fontSize: 12, fontWeight: "600", color: tone.name }}>{passage.data?.reference ?? verse.label}</Text>
      </View>
      {passage.isPending ? (
        <Text style={{ fontSize: 14, color: tone.soft }}>Loading the verse</Text>
      ) : passage.isError ? (
        <Text style={{ fontSize: 14, color: tone.soft }}>Couldn&apos;t load this verse.</Text>
      ) : (
        <Pressable onPress={open} accessibilityRole="button" accessibilityHint="Opens the whole passage">
          <Text numberOfLines={LINES} style={{ fontSize: 15, lineHeight: 21, color: tone.text }}>
            {passage.data.text}
          </Text>
          {long ? <Text style={{ fontSize: 13, fontWeight: "600", color: tone.name, paddingTop: 4 }}>Read more</Text> : null}
        </Pressable>
      )}
      {passage.data ? (
        <Text style={{ fontSize: 11, lineHeight: 15, color: tone.soft }}>{[passage.data.abbreviation, passage.data.copyright].filter(Boolean).join(" · ")}</Text>
      ) : null}
      <Pressable onPress={() => void openInBibleApp(url)} accessibilityRole="link" hitSlop={6}>
        <Text style={{ fontSize: 13, fontWeight: "600", color: tone.name }}>Read in Bible App</Text>
      </Pressable>
    </View>
  );
}
