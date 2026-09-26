// Root layout. Screens are not built yet — this skeleton only proves the
// project, routing, config and native modules are wired together. UI work
// starts here.

import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";

export default function RootLayout() {
  return (
    <>
      <StatusBar style="auto" />
      <Stack screenOptions={{ headerShown: false }} />
    </>
  );
}
