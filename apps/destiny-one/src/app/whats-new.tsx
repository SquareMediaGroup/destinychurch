// What's new, from Profile → Support (and tapping the version at the bottom
// of Profile). The latest release first. Add a release at the top of
// RELEASES when app.json's version goes up.

import { ScrollView, Text, View } from "react-native";
import Constants from "expo-constants";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Icon, type IconName } from "@/components/Icon";
import { Card, FloatingBack, LargeTitle, Lead, SectionLabel, Separator } from "@/components/ui";
import { useTheme } from "@/theme/tokens";

interface Feature {
  icon: IconName;
  title: string;
  body: string;
}

const RELEASES: { version: string; features: Feature[] }[] = [
  {
    version: "0.8",
    features: [
      { icon: "pencil", title: "Edit messages", body: "Fix a typo for 15 minutes after sending. Press and hold your message, then Edit." },
      { icon: "people", title: "@mentions", body: "Type @ to mention someone. They'll hear about it even if they've muted the group." },
      { icon: "pin", title: "Pinned messages", body: "Group admins can pin up to 3 messages to the top of a chat." },
      { icon: "check", title: "Seen by", body: "See who has read your messages. You can turn read receipts off in Profile." },
      { icon: "photo", title: "Photos, full screen", body: "Pinch to zoom, swipe between photos, and save them to your library." },
      { icon: "doc", title: "Photos and files", body: "Everything shared in a chat, in Group info." },
      { icon: "mic", title: "Voice messages", body: "Tap the microphone to record up to 5 minutes." },
      { icon: "forward", title: "Forward", body: "Send a message on to another chat you're in." },
      { icon: "share", title: "Share into Destiny One", body: "Share photos, PDFs and links from other apps straight into a chat." },
      { icon: "bell", title: "Reply from notifications", body: "Reply or mark as read without opening the app." },
      { icon: "calendar", title: "Upcoming events", body: "See what's on in Search, and share an event to a chat." },
      { icon: "chats", title: "Typing and link previews", body: "See when someone's typing, and a preview of links people share." },
      { icon: "help", title: "Help, and a tidier Profile", body: "Answers to common questions, and Profile grouped into sections." },
    ],
  },
];

export default function WhatsNew() {
  const t = useTheme();
  const insets = useSafeAreaInsets();
  return (
    <View style={{ flex: 1, backgroundColor: t.grouped }}>
      <ScrollView contentContainerStyle={{ paddingTop: insets.top + 56, paddingHorizontal: 16, paddingBottom: insets.bottom + 40, gap: 22 }}>
        <View style={{ paddingHorizontal: 4, gap: 6 }}>
          <LargeTitle>What&apos;s new</LargeTitle>
          <Lead>{`You're on Destiny One ${Constants.expoConfig?.version ?? ""}.`}</Lead>
        </View>
        {RELEASES.map((r) => (
          <View key={r.version} style={{ gap: 7 }}>
            <SectionLabel>{`Version ${r.version}`}</SectionLabel>
            <Card>
              {r.features.map((f, i) => (
                <View key={f.title}>
                  {i > 0 ? <Separator inset={62} /> : null}
                  <View style={{ flexDirection: "row", gap: 14, paddingVertical: 12, paddingHorizontal: 16 }}>
                    <View style={{ width: 32, height: 32, borderRadius: 9, backgroundColor: t.accentSoft, alignItems: "center", justifyContent: "center" }}>
                      <Icon name={f.icon} size={17} color={t.tint} strokeWidth={2} />
                    </View>
                    <View style={{ flex: 1, gap: 2 }}>
                      <Text style={{ fontSize: 16, fontWeight: "600", color: t.text }}>{f.title}</Text>
                      <Text style={{ fontSize: 14, lineHeight: 19, color: t.muted }}>{f.body}</Text>
                    </View>
                  </View>
                </View>
              ))}
            </Card>
          </View>
        ))}
      </ScrollView>
      <FloatingBack background={t.grouped} />
    </View>
  );
}
