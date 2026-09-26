// Placeholder until the real screens are designed.

import { StyleSheet, Text, View } from "react-native";
import { GlassSurface } from "@/components/GlassSurface";

export default function Index() {
  return (
    <View style={styles.screen}>
      <GlassSurface style={styles.card}>
        <Text style={styles.title}>Destiny One</Text>
        <Text style={styles.subtitle}>Backend ready. Screens coming next.</Text>
      </GlassSurface>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, alignItems: "center", justifyContent: "center", padding: 24 },
  card: { borderRadius: 24, paddingVertical: 28, paddingHorizontal: 32, alignItems: "center", gap: 8 },
  title: { fontSize: 28, fontWeight: "700" },
  subtitle: { fontSize: 15, opacity: 0.7, textAlign: "center" },
});
