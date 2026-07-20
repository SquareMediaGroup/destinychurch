import { Linking, Pressable, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { theme } from "@/theme";

// Giving uses ChurchSuite's hosted donation flow (nonprofit carve-out; no IAP).
// This interim screen opens it in the system browser; it becomes an in-app
// WebView screen once react-native-webview is added (see the build plan).
const DONATE_URL = "https://destinytees.churchsuite.com/donate";

export default function GiveScreen() {
  return (
    <SafeAreaView style={styles.safe} edges={["top"]}>
      <View style={styles.header}>
        <Text style={styles.title}>Give</Text>
      </View>
      <View style={styles.body}>
        <Text style={styles.copy}>
          Thank you for supporting the work of Destiny Church. Giving is handled
          securely by ChurchSuite.
        </Text>
        <Pressable
          style={styles.button}
          onPress={() => Linking.openURL(DONATE_URL)}
          accessibilityRole="button"
          accessibilityLabel="Open the giving page"
        >
          <Text style={styles.buttonText}>Give Now</Text>
        </Pressable>
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
  body: { paddingHorizontal: theme.spacing(6), gap: theme.spacing(5) },
  copy: {
    fontFamily: theme.fonts.body,
    color: theme.colors.textMuted,
    fontSize: 15,
    lineHeight: 22,
  },
  button: {
    backgroundColor: theme.colors.accent,
    borderRadius: theme.radius.pill,
    paddingVertical: theme.spacing(3.5),
    alignItems: "center",
  },
  buttonText: {
    fontFamily: theme.fonts.bodyBold,
    color: theme.colors.white,
    fontSize: 16,
  },
});
