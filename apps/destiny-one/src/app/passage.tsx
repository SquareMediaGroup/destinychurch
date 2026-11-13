// A whole passage (from a verse card's "Read more", or the verse of the day):
// the words, the version and copyright line, Read in Bible App, and Share to a
// chat, which sends the reference as a message so it arrives as a verse card.

import { ScrollView, Text, View } from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { ErrorState, FloatingBack, LargeTitle, Lead, PrimaryButton, TextButton } from "@/components/ui";
import { openInBibleApp, passageUrl, usePassage } from "@/lib/bible";
import { errorMessage } from "@/state/session";
import { useTheme } from "@/theme/tokens";

export default function Passage() {
  const t = useTheme();
  const insets = useSafeAreaInsets();
  const { id, bible, votd } = useLocalSearchParams<{ id: string; bible?: string; votd?: string }>();
  const bibleId = Number(bible) || 0;
  const passage = usePassage(id, bibleId);
  const url = passageUrl(id, bibleId, passage.data?.webUrl);

  return (
    <View style={{ flex: 1, backgroundColor: t.grouped }}>
      <ScrollView contentContainerStyle={{ paddingTop: insets.top + 56, paddingHorizontal: 20, paddingBottom: insets.bottom + 40, gap: 16 }}>
        <View style={{ gap: 6 }}>
          {votd ? <Text style={{ fontSize: 13, fontWeight: "600", color: t.tint }}>Verse of the day</Text> : null}
          <LargeTitle>{passage.data?.reference ?? id}</LargeTitle>
          {passage.data?.versionTitle ? <Lead>{passage.data.versionTitle}</Lead> : null}
        </View>
        {passage.isError ? (
          <ErrorState message={errorMessage(passage.error, "Couldn't load this verse.")} onRetry={() => void passage.refetch()} />
        ) : passage.data ? (
          <>
            <Text selectable style={{ fontSize: 19, lineHeight: 29, color: t.text }}>{passage.data.text}</Text>
            {passage.data.copyright ? <Text style={{ fontSize: 12, lineHeight: 17, color: t.muted }}>{passage.data.copyright}</Text> : null}
          </>
        ) : null}
        <PrimaryButton label="Share to a chat" onPress={() => router.push({ pathname: "/share-verse", params: { label: passage.data?.reference ?? id } })} />
        <TextButton label="Read in Bible App" onPress={() => void openInBibleApp(url)} style={{ alignSelf: "center" }} />
      </ScrollView>
      <FloatingBack background={t.grouped} />
    </View>
  );
}
