// Whether this phone has shown a member the one-time Setup screen (theme and
// read receipts). Per member id, so each account on a shared phone sees it once.

import AsyncStorage from "@react-native-async-storage/async-storage";

const key = (memberId: string) => `d1.setupSeen.v1.${memberId}`;

/** Unreadable storage counts as seen, so a storage fault can never trap someone on Setup. */
export async function hasSeenSetup(memberId: string): Promise<boolean> {
  try {
    return (await AsyncStorage.getItem(key(memberId))) === "1";
  } catch {
    return true;
  }
}

export async function markSetupSeen(memberId: string): Promise<void> {
  try {
    await AsyncStorage.setItem(key(memberId), "1");
  } catch {
    // worst case they see it once more
  }
}
