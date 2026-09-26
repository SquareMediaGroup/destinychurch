// Supabase session storage backed by the iOS Keychain / Android Keystore
// (expo-secure-store), rather than plain SQLite/AsyncStorage: the session
// holds a long-lived refresh token, which is a credential.
//
// SecureStore values are size-limited on Android (~2 KB), and a Supabase
// session is usually bigger, so values are split into chunks stored under
// `<key>.0`, `<key>.1`, … with the chunk count under `<key>`.

import * as SecureStore from "expo-secure-store";

const CHUNK = 1800;
const OPTIONS: SecureStore.SecureStoreOptions = {
  keychainAccessible: SecureStore.AFTER_FIRST_UNLOCK_THIS_DEVICE_ONLY,
};

// SecureStore keys may only contain [A-Za-z0-9._-].
const safe = (key: string) => key.replace(/[^A-Za-z0-9._-]/g, "_");

export const secureStorage = {
  async getItem(key: string): Promise<string | null> {
    const k = safe(key);
    const count = Number(await SecureStore.getItemAsync(k, OPTIONS));
    if (!Number.isInteger(count) || count <= 0) return null;
    const parts: string[] = [];
    for (let i = 0; i < count; i++) {
      const part = await SecureStore.getItemAsync(`${k}.${i}`, OPTIONS);
      if (part === null) return null;
      parts.push(part);
    }
    return parts.join("");
  },

  async setItem(key: string, value: string): Promise<void> {
    const k = safe(key);
    await secureStorage.removeItem(key);
    const count = Math.ceil(value.length / CHUNK) || 1;
    for (let i = 0; i < count; i++) {
      await SecureStore.setItemAsync(`${k}.${i}`, value.slice(i * CHUNK, (i + 1) * CHUNK), OPTIONS);
    }
    await SecureStore.setItemAsync(k, String(count), OPTIONS);
  },

  async removeItem(key: string): Promise<void> {
    const k = safe(key);
    const count = Number(await SecureStore.getItemAsync(k, OPTIONS));
    await SecureStore.deleteItemAsync(k, OPTIONS);
    for (let i = 0; Number.isInteger(count) && i < count; i++) {
      await SecureStore.deleteItemAsync(`${k}.${i}`, OPTIONS);
    }
  },
};
