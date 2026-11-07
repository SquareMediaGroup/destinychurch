// Network usage: photos, voice messages and files sent and received on this
// phone since counting started, and how much of it was on mobile data.
// Counted by the app (src/state/networkUsage.ts); reset at the bottom.

import { Alert, ScrollView, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Card, CardButton, FloatingBack, LargeTitle, SectionLabel, Separator } from "@/components/ui";
import { formatBytes, plural } from "@/lib/format";
import { haptic } from "@/lib/haptics";
import type { MediaKind } from "@/state/dataSettings";
import { networkUsage, useNetworkUsage } from "@/state/networkUsage";
import { useTheme } from "@/theme/tokens";

const KINDS: { kind: MediaKind; label: string; one: string }[] = [
  { kind: "photos", label: "Photos", one: "photo" },
  { kind: "voice", label: "Voice messages", one: "voice message" },
  { kind: "files", label: "Documents", one: "document" },
];

export default function NetworkUsage() {
  const t = useTheme();
  const insets = useSafeAreaInsets();
  const usage = useNetworkUsage();
  const rows = KINDS.map((k) => ({ ...k, row: usage.kinds[k.kind] }));
  const sent = rows.reduce((n, r) => n + r.row.sentBytes, 0);
  const received = rows.reduce((n, r) => n + r.row.receivedBytes, 0);
  const since = new Date(usage.since).toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" });

  function confirmReset() {
    Alert.alert("Reset statistics?", "Counting starts again from now.", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Reset",
        style: "destructive",
        onPress: () => {
          networkUsage.reset();
          haptic.success();
        },
      },
    ]);
  }

  return (
    <View style={{ flex: 1, backgroundColor: t.grouped }}>
      <ScrollView contentContainerStyle={{ paddingTop: insets.top + 56, paddingHorizontal: 16, paddingBottom: 48, gap: 22 }}>
        <LargeTitle style={{ paddingHorizontal: 4 }}>Network usage</LargeTitle>

        <View style={{ gap: 7 }}>
          <Card style={{ flexDirection: "row", paddingVertical: 16 }}>
            <Total label="Sent" bytes={sent} />
            <View style={{ width: 1, backgroundColor: t.sep }} />
            <Total label="Received" bytes={received} />
          </Card>
          <Text style={{ paddingHorizontal: 16, fontSize: 13, color: t.subtle }}>Since {since}</Text>
        </View>

        <View style={{ gap: 7 }}>
          <SectionLabel>Connection</SectionLabel>
          <Card>
            <Line label="Wi-Fi" value={formatBytes(usage.wifiBytes)} />
            <Separator />
            <Line label="Mobile data" value={formatBytes(usage.mobileBytes)} />
          </Card>
        </View>

        {rows.map((r) => (
          <View key={r.kind} style={{ gap: 7 }}>
            <SectionLabel>{r.label}</SectionLabel>
            <Card>
              <Line label="Sent" detail={plural(r.row.sentCount, r.one)} value={formatBytes(r.row.sentBytes)} />
              <Separator />
              <Line label="Received" detail={plural(r.row.receivedCount, r.one)} value={formatBytes(r.row.receivedBytes)} />
            </Card>
          </View>
        ))}

        <View style={{ gap: 8 }}>
          <CardButton label="Reset statistics" onPress={confirmReset} />
          <Text style={{ paddingHorizontal: 16, fontSize: 13, lineHeight: 18, color: t.subtle }}>
            Counts media sent and loaded in Destiny One on this phone. Messages themselves use very little data and aren&apos;t included.
          </Text>
        </View>
      </ScrollView>
      <FloatingBack background={t.grouped} />
    </View>
  );
}

function Total({ label, bytes }: { label: string; bytes: number }) {
  const t = useTheme();
  return (
    <View style={{ flex: 1, alignItems: "center", gap: 2 }}>
      <Text style={{ fontSize: 13, color: t.muted }}>{label}</Text>
      <Text style={{ fontSize: 24, fontWeight: "700", color: t.text }}>{formatBytes(bytes)}</Text>
    </View>
  );
}

function Line({ label, detail, value }: { label: string; detail?: string; value: string }) {
  const t = useTheme();
  return (
    <View style={{ flexDirection: "row", alignItems: "center", gap: 12, paddingVertical: 12, paddingHorizontal: 16 }}>
      <View style={{ flex: 1, gap: 1 }}>
        <Text style={{ fontSize: 17, color: t.text }}>{label}</Text>
        {detail ? <Text style={{ fontSize: 13, color: t.subtle }}>{detail}</Text> : null}
      </View>
      <Text style={{ fontSize: 17, color: t.muted }}>{value}</Text>
    </View>
  );
}
