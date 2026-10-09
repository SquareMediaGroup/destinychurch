// Help, from Profile → Support. Short answers to the questions people ask
// about Destiny One, each opening in place (one at a time, like Settings'
// disclosure rows). Anything not answered here goes to "Report a problem".
//
// The answers describe how the app actually behaves, so keep them in step
// with it: the safeguarding rules, muting, blocking and reporting especially.

import { useState } from "react";
import { LayoutAnimation, Pressable, ScrollView, Text, View } from "react-native";
import { router } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Icon } from "@/components/Icon";
import { reduceMotion } from "@/components/Motion";
import { Card, FloatingBack, LargeTitle, Lead, SectionLabel, Separator, SettingsRow } from "@/components/ui";
import { haptic } from "@/lib/haptics";
import { useTheme } from "@/theme/tokens";

interface Question {
  q: string;
  a: string;
}

const TOPICS: { title: string; questions: Question[] }[] = [
  {
    title: "Chats",
    questions: [
      {
        q: "Why can't I message one person on their own?",
        a: "Destiny One has no one-to-one chats between people. Every conversation happens in a group with at least 2 adults in it, so no one is ever chatting alone. It's part of how we keep everyone safe, young people especially. The one exception is DestinyAI, which is a computer, not a person.",
      },
      {
        q: "What is DestinyAI?",
        a: "DestinyAI answers questions about Destiny: what's on, service times, groups, sermons, giving and more. It reads the church calendar live. Find it at the top of Chats, or type @DestinyAI in a group to ask it there. It can get things wrong, so check anything important with a leader.",
      },
      {
        q: "What can DestinyAI see?",
        a: "In its own chat, only what you send it. In a group it can't read the chat at all. It only sees the message you tag it in, and, if you replied to a message when you tagged it, that message too. So to ask about something someone said, reply to their message and tag @DestinyAI.",
      },
      {
        q: "How do I join a group?",
        a: "Group leaders add people. If you think you should be in a group, ask its leader or the church office.",
      },
      {
        q: "Why is a group paused?",
        a: "A group pauses itself when it no longer has enough adults or members to meet the rules. You can still read it. It opens again as soon as a leader adds the people it needs.",
      },
      {
        q: "Can I edit or delete a message?",
        a: "Press and hold your message. Edit changes the text for 15 minutes after you send it, and the message then says Edited. Delete removes it for everyone. We keep a copy of earlier versions and deleted messages for a while in case we ever need to check something.",
      },
      {
        q: "How do I mention someone?",
        a: "Type @ and the start of their name, then pick them from the list. They'll get a notification even if they've muted the group.",
      },
      {
        q: "How do I send a voice message?",
        a: "With the message box empty, tap the microphone. Tap Send when you're done, or the bin to throw it away. Voice messages can be up to 5 minutes, and they're kept like photos, so our team can listen if something is reported.",
      },
      {
        q: "How do I find an old message?",
        a: "Use the Search tab to search every chat, or the search button at the top of a chat to search just that one.",
      },
    ],
  },
  {
    title: "Notifications",
    questions: [
      {
        q: "How do I stop notifications from one group?",
        a: "Swipe the chat left in your chat list and tap Mute, or open the group's info and tap Mute to choose how long for.",
      },
      {
        q: "I'm not getting any notifications",
        a: "Check that notifications are on for Destiny One in your phone's Settings app, and that the group isn't muted. Then go to Profile, Notifications.",
      },
    ],
  },
  {
    title: "Safety",
    questions: [
      {
        q: "Who can read my messages?",
        a: "The people in the group, and a small safeguarding team at church who only look if something is reported or doesn't look right. Chats aren't end-to-end encrypted so that this team can step in. Messages are encrypted when they're stored.",
      },
      {
        q: "Someone made me feel uncomfortable. What do I do?",
        a: "Press and hold their message and tap Report. It goes straight to the safeguarding team. You can block them too, so you stop seeing their messages. If anyone is in danger, call 999.",
      },
      {
        q: "What does blocking do?",
        a: "You stop seeing their messages and getting notifications from them. They aren't told. You both stay in your groups, and the safeguarding team can still see everything. Unblock them any time from Profile, Blocked people.",
      },
    ],
  },
  {
    title: "Your account",
    questions: [
      {
        q: "How do I use two accounts on one phone?",
        a: "Go to Profile and tap Add account. Double-tap the Profile tab to switch between them.",
      },
      {
        q: "How do I change my name or picture?",
        a: "On the Profile tab, tap your name to change it, or your picture to choose a new one.",
      },
      {
        q: "How do I delete my account?",
        a: "Profile, Delete my account. You can download a copy of your data first from the same section.",
      },
    ],
  },
];

export default function Help() {
  const t = useTheme();
  const insets = useSafeAreaInsets();
  const [open, setOpen] = useState<string | null>(null);

  function toggle(q: string) {
    haptic.selection();
    if (!reduceMotion()) LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setOpen((cur) => (cur === q ? null : q));
  }

  return (
    <View style={{ flex: 1, backgroundColor: t.grouped }}>
      <ScrollView contentContainerStyle={{ paddingTop: insets.top + 56, paddingHorizontal: 16, paddingBottom: insets.bottom + 40, gap: 22 }}>
        <View style={{ paddingHorizontal: 4, gap: 6 }}>
          <LargeTitle>Help</LargeTitle>
          <Lead>Answers to the questions people ask most.</Lead>
        </View>

        {TOPICS.map((topic) => (
          <View key={topic.title} style={{ gap: 7 }}>
            <SectionLabel>{topic.title}</SectionLabel>
            <Card>
              {topic.questions.map((item, i) => {
                const expanded = open === item.q;
                return (
                  <View key={item.q}>
                    {i > 0 ? <Separator /> : null}
                    <Pressable
                      onPress={() => toggle(item.q)}
                      accessibilityRole="button"
                      accessibilityState={{ expanded }}
                      style={({ pressed }) => ({ flexDirection: "row", alignItems: "center", gap: 12, paddingVertical: 13, paddingHorizontal: 16, backgroundColor: pressed ? t.fill : "transparent" })}
                    >
                      <Text style={{ flex: 1, fontSize: 17, color: t.text }}>{item.q}</Text>
                      <View style={{ transform: [{ rotate: expanded ? "90deg" : "0deg" }] }}>
                        <Icon name="chevronRight" size={14} color={t.subtle} strokeWidth={2.4} />
                      </View>
                    </Pressable>
                    {expanded ? <Text style={{ paddingHorizontal: 16, paddingBottom: 14, fontSize: 15, lineHeight: 21, color: t.muted }}>{item.a}</Text> : null}
                  </View>
                );
              })}
            </Card>
          </View>
        ))}

        <View style={{ gap: 7 }}>
          <SectionLabel>Still stuck?</SectionLabel>
          <Card>
            <SettingsRow icon="flag" label="Report a problem" onPress={() => router.push({ pathname: "/feedback", params: { kind: "problem" } })} />
          </Card>
        </View>
      </ScrollView>
      <FloatingBack background={t.grouped} />
    </View>
  );
}
