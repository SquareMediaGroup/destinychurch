import { StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { theme } from "@/theme";

export default function SermonsScreen() {
  return (
    <SafeAreaView style={styles.safe} edges={["top"]}>
      <View style={styles.header}>
        <Text style={styles.title}>Sermons &amp; Podcast</Text>
      </View>
      <View style={styles.body}>
        <Text style={styles.placeholder}>
          Coming soon: watch the latest sermons and listen to the DCTV podcast
          with a native player — background playback and lock-screen controls.
        </Text>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: theme.colors.background },
  header: { padding: theme.spacing(6), paddingBottom: theme.spacing(2) },
  title: {
    fontFamily: theme.fonts.bodyBlack,
    color: theme.colors.text,
    fontSize: 28,
  },
  body: { paddingHorizontal: theme.spacing(6) },
  placeholder: {
    fontFamily: theme.fonts.body,
    color: theme.colors.textMuted,
    fontSize: 15,
    lineHeight: 22,
  },
});
