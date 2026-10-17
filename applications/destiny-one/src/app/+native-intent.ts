// Incoming links before Expo Router sees them. Something shared into Destiny
// One from another app (the share extension / share intent, expo-sharing)
// arrives as an expo-sharing://… link: send it to the "Share to a group"
// screen. Everything else goes where it was going.

export function redirectSystemPath({ path }: { path: string; initial: boolean }): string {
  try {
    if (new URL(path).hostname === "expo-sharing") return "/share";
  } catch {
    // A plain path, not a URL: leave it alone.
  }
  return path;
}
