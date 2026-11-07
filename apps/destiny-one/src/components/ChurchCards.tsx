// Church cards in a DestinyAI bubble: the pastors and team (PersonCard) and
// everything else (InfoCard: a ministry, visiting, giving, the live service, a
// course, a job, the weather, directions, a shop item). Built on the server from
// structured data, so what is shown here is never written by the model.
// Every link and photo arrives absolute; see lib/churchCards.server.ts.

import { useState } from "react";
import { Image, Linking, Pressable, Text, View } from "react-native";
import * as Clipboard from "expo-clipboard";
import * as WebBrowser from "expo-web-browser";
import { MAX_CARDS, type CardAction, type D1CardContent, type InfoCardData, type PersonCardData } from "@destiny/shared";
import { Icon } from "@/components/Icon";
import { haptic } from "@/lib/haptics";
import { useTheme } from "@/theme/tokens";

/** The bubble's colours for whichever side it is on (see tones() in MessageBubble). */
export interface CardTone {
  text: string;
  soft: string;
  panel: string;
  name: string;
}

function open(href: string) {
  // Web pages open in the in-app browser; mail and phone links go to their apps.
  if (/^https?:/.test(href)) void WebBrowser.openBrowserAsync(href);
  else void Linking.openURL(href);
}

function ActionButton({ action, primary, tone }: { action: CardAction; primary: boolean; tone: CardTone }) {
  return (
    <Pressable
      accessibilityRole="link"
      accessibilityLabel={action.label}
      onPress={() => open(action.href)}
      hitSlop={4}
      style={({ pressed }) => ({
        paddingVertical: 7,
        paddingHorizontal: 13,
        borderRadius: 16,
        borderWidth: primary ? 0 : 1,
        borderColor: tone.soft,
        backgroundColor: primary ? tone.name : "transparent",
        opacity: pressed ? 0.7 : 1,
      })}
    >
      <Text style={{ fontSize: 13, fontWeight: "600", color: primary ? tone.panel : tone.text }}>{action.label}</Text>
    </Pressable>
  );
}

function PersonCard({ person, tone }: { person: PersonCardData; tone: CardTone }) {
  const t = useTheme();
  const actions: CardAction[] = [
    ...(person.email ? [{ label: "Email", href: `mailto:${person.email}` }] : []),
    ...(person.href ? [{ label: "Learn more", href: person.href }] : []),
  ];
  return (
    <View style={{ marginTop: 2, marginHorizontal: -6, borderRadius: 14, overflow: "hidden", backgroundColor: tone.panel, minWidth: 240, maxWidth: 300 }}>
      <View style={{ flexDirection: "row", gap: 10, padding: 10 }}>
        {person.photo ? (
          <Image source={{ uri: person.photo }} accessibilityLabel={person.name} style={{ width: 66, height: 88, borderRadius: 10, backgroundColor: t.fill }} resizeMode="contain" />
        ) : (
          <View style={{ width: 66, height: 88, borderRadius: 10, backgroundColor: t.fill, alignItems: "center", justifyContent: "center" }}>
            <Icon name="person" size={26} color={tone.soft} />
          </View>
        )}
        <View style={{ flex: 1, gap: 2 }}>
          <Text style={{ fontSize: 16, fontWeight: "700", color: tone.text }}>{person.name}</Text>
          <Text style={{ fontSize: 12, fontWeight: "600", color: tone.name }}>{person.role}</Text>
          {person.bio ? <Text style={{ marginTop: 3, fontSize: 13, lineHeight: 17, color: tone.soft }}>{person.bio}</Text> : null}
          {person.leads.length ? <Text style={{ marginTop: 3, fontSize: 12, color: tone.soft }}>Leads: {person.leads.join(", ")}</Text> : null}
        </View>
      </View>
      {actions.length ? (
        <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8, paddingHorizontal: 10, paddingBottom: 10 }}>
          {actions.map((a, i) => (
            <ActionButton key={a.href} action={a} primary={i === 0} tone={tone} />
          ))}
        </View>
      ) : null}
    </View>
  );
}

function CopyButton({ value, label, tone }: { value: string; label: string; tone: CardTone }) {
  const [copied, setCopied] = useState(false);
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`Copy ${label}`}
      hitSlop={8}
      onPress={() => {
        void Clipboard.setStringAsync(value);
        haptic.success();
        setCopied(true);
        setTimeout(() => setCopied(false), 1500);
      }}
      style={{ flexDirection: "row", alignItems: "center", gap: 3, marginLeft: 8 }}
    >
      <Icon name={copied ? "check" : "copy"} size={13} color={tone.name} strokeWidth={2.2} />
      <Text style={{ fontSize: 12, fontWeight: "600", color: tone.name }}>{copied ? "Copied" : "Copy"}</Text>
    </Pressable>
  );
}

function InfoCard({ card, tone }: { card: InfoCardData; tone: CardTone }) {
  const t = useTheme();
  return (
    <View style={{ marginTop: 2, marginHorizontal: -6, borderRadius: 14, overflow: "hidden", backgroundColor: tone.panel, minWidth: 240, maxWidth: 300 }}>
      {card.image ? <Image source={{ uri: card.image }} style={{ width: "100%", height: 110, backgroundColor: t.fill }} resizeMode="cover" /> : null}
      <View style={{ padding: 10, gap: 3 }}>
        {card.eyebrow ? <Text style={{ fontSize: 12, fontWeight: "600", color: tone.name }}>{card.eyebrow}</Text> : null}
        <Text style={{ fontSize: 16, fontWeight: "700", color: tone.text }}>{card.title}</Text>
        {card.summary ? <Text style={{ fontSize: 13, lineHeight: 18, color: tone.soft }}>{card.summary}</Text> : null}
        {card.facts.length ? (
          <View style={{ marginTop: 6, gap: 7 }}>
            {card.facts.map((f) => (
              <View key={f.label} style={{ gap: 1 }}>
                <Text style={{ fontSize: 11, fontWeight: "600", color: tone.soft }}>{f.label.toUpperCase()}</Text>
                <View style={{ flexDirection: "row", alignItems: "center" }}>
                  <Text selectable style={{ flexShrink: 1, fontSize: 14, color: tone.text }}>
                    {f.value}
                  </Text>
                  {f.copy ? <CopyButton value={f.value} label={f.label} tone={tone} /> : null}
                </View>
              </View>
            ))}
          </View>
        ) : null}
        {card.actions.length ? (
          <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8, marginTop: 8 }}>
            {card.actions.map((a, i) => (
              <ActionButton key={a.href + a.label} action={a} primary={i === 0} tone={tone} />
            ))}
          </View>
        ) : null}
      </View>
    </View>
  );
}

export function ChurchCards({ content, tone }: { content: D1CardContent; tone: CardTone }) {
  const { people, info } = content.cards;
  return (
    <>
      {(people ?? []).slice(0, MAX_CARDS).map((p) => (
        <PersonCard key={p.id} person={p} tone={tone} />
      ))}
      {(info ?? []).slice(0, MAX_CARDS).map((c) => (
        <InfoCard key={c.id} card={c} tone={tone} />
      ))}
    </>
  );
}
