// Optional "update available" prompt. Staff set the newest version in the
// stores, and what's in it, at /admin/destiny-one/settings; it arrives with the
// public config (see appGate.ts). An app on an older X.X is offered it once per
// version, with Update and Not now. Patch releases (X.X.X) never prompt, and
// it never blocks anyone: forcing an update is the gate's job (minBuild).

import AsyncStorage from "@react-native-async-storage/async-storage";
import Constants from "expo-constants";
import { optionalUpdate, type D1AppConfig } from "@destiny/shared";

const KEY = "d1.updatePrompt.seen.v1";

export const INSTALLED_VERSION = Constants.expoConfig?.version ?? null;

/** The version to offer this app, whether or not it's been seen. */
export function offeredVersion(config: D1AppConfig | null | undefined): string | null {
  return optionalUpdate(config, INSTALLED_VERSION);
}

/** The version to prompt for right now, or null (none, or already seen on this phone). */
export async function pendingUpdatePrompt(config: D1AppConfig | null | undefined): Promise<string | null> {
  const version = offeredVersion(config);
  if (!version) return null;
  try {
    return (await AsyncStorage.getItem(KEY)) === version ? null : version;
  } catch {
    return null;
  }
}

/** Called as the prompt opens: Update, Not now and swiping it away all count. */
export async function markUpdatePromptSeen(version: string): Promise<void> {
  try {
    await AsyncStorage.setItem(KEY, version);
  } catch {
    // Worst case it shows once more.
  }
}
