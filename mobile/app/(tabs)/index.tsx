import { ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { theme, PILLARS } from "@/theme";

const pillarOrder = [
  "magnify",
  "mission",
  "ministry",
  "membership",
  "maturity",
] as const;

export default function HomeScreen() {
  return (
    <SafeAreaView style={styles.safe} edges={["top"]}>
      <ScrollView contentContainerStyle={styles.content}>
        {/* Hero — Anton is the homepage/hero display face (brand rule). */}
        <Text style={styles.eyebrow}>WELCOME TO</Text>
        <Text style={styles.hero}>DESTINY{"\n"}CHURCH</Text>
        <Text style={styles.tagline}>
          Transforming lives through Faith, Hope &amp; Love for Jesus Christ.
        </Text>

        {/* Five pillars */}
        <Text style={styles.sectionHeading}>The Five Pillars</Text>
        <View style={styles.pillars}>
          {pillarOrder.map((key) => {
            const pillar = PILLARS[key];
            return (
              <View
                key={key}
                style={[styles.pillar, { backgroundColor: pillar.color }]}
              >
                <Text style={styles.pillarLabel}>
                  {pillar.label.toUpperCase()}
                </Text>
              </View>
            );
          })}
        </View>

        <Text style={styles.note}>
          Sermons, the podcast, what&apos;s on and giving — all in one place.
          Group chat is coming soon.
        </Text>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: theme.colors.background },
  content: { padding: theme.spacing(6), paddingBottom: theme.spacing(10) },
  eyebrow: {
    fontFamily: theme.fonts.bodyBold,
    color: theme.colors.accent,
    letterSpacing: 2,
    fontSize: 12,
    marginBottom: theme.spacing(1),
  },
  hero: {
    fontFamily: theme.fonts.display,
    color: theme.colors.text,
    fontSize: 52,
    lineHeight: 52,
  },
  tagline: {
    fontFamily: theme.fonts.serif,
    color: theme.colors.textMuted,
    fontSize: 18,
    marginTop: theme.spacing(3),
    lineHeight: 26,
  },
  sectionHeading: {
    fontFamily: theme.fonts.bodyBlack,
    color: theme.colors.text,
    fontSize: 22,
    marginTop: theme.spacing(8),
    marginBottom: theme.spacing(3),
  },
  pillars: { gap: theme.spacing(2.5) },
  pillar: {
    borderRadius: theme.radius.lg,
    paddingVertical: theme.spacing(4),
    paddingHorizontal: theme.spacing(5),
  },
  pillarLabel: {
    fontFamily: theme.fonts.bodyBlack,
    color: theme.colors.white,
    fontSize: 20,
    letterSpacing: 1,
  },
  note: {
    fontFamily: theme.fonts.body,
    color: theme.colors.textMuted,
    fontSize: 15,
    lineHeight: 22,
    marginTop: theme.spacing(8),
  },
});
