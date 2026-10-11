// The bridge to the native shell (src-tauri/src/lib.rs) and its plugins.
//
// Every call has a browser fallback so `npm run dev` also works in a plain
// browser for UI work (no Keychain, no Touch ID, no menu bar there). The real
// app always runs inside Tauri.

import { invoke } from "@tauri-apps/api/core";

export const inTauri = typeof window !== "undefined" && "__TAURI_INTERNALS__" in window;

/**
 * fetch for our own API. Inside Tauri it goes through the HTTP plugin (Rust
 * side), so there's no CORS to configure on the website and the token can
 * only go to hosts in capabilities/default.json.
 */
export const apiFetch: typeof fetch = async (input, init) => {
  if (!inTauri) return fetch(input, init);
  const { fetch: tauriFetch } = await import("@tauri-apps/plugin-http");
  return tauriFetch(input, init);
};

// ── Keychain ──
const FALLBACK_PREFIX = "d1admin.dev.";

export const keychain = {
  async get(key: string): Promise<string | null> {
    if (!inTauri) return localStorage.getItem(FALLBACK_PREFIX + key);
    return invoke<string | null>("keychain_get", { key });
  },
  async set(key: string, value: string): Promise<void> {
    if (!inTauri) return localStorage.setItem(FALLBACK_PREFIX + key, value);
    await invoke("keychain_set", { key, value });
  },
  async remove(key: string): Promise<void> {
    if (!inTauri) return localStorage.removeItem(FALLBACK_PREFIX + key);
    await invoke("keychain_delete", { key });
  },
};

/** Touch ID, or the Mac's password where there's no Touch ID. */
export async function authenticate(reason: string): Promise<boolean> {
  if (!inTauri) return true;
  return invoke<boolean>("authenticate", { reason });
}

export async function setTrayCount(count: number): Promise<void> {
  if (inTauri) await invoke("set_tray_count", { count }).catch(() => undefined);
}

export async function showMain(): Promise<void> {
  if (inTauri) await invoke("show_main");
}

export async function hideMenubar(): Promise<void> {
  if (inTauri) await invoke("hide_menubar");
}

export async function quitApp(): Promise<void> {
  if (inTauri) await invoke("quit");
}

export async function openExternal(url: string): Promise<void> {
  if (!inTauri) {
    window.open(url, "_blank", "noopener");
    return;
  }
  const { openUrl } = await import("@tauri-apps/plugin-opener");
  await openUrl(url);
}

// ── Notifications ──
let notifyAllowed: boolean | null = null;

export async function notify(title: string, body: string): Promise<void> {
  if (!inTauri) return;
  const n = await import("@tauri-apps/plugin-notification");
  if (notifyAllowed === null) {
    notifyAllowed = await n.isPermissionGranted();
    if (!notifyAllowed) notifyAllowed = (await n.requestPermission()) === "granted";
  }
  if (notifyAllowed) n.sendNotification({ title, body });
}

// ── Open at login ──
export async function setOpenAtLogin(on: boolean): Promise<void> {
  if (!inTauri) return;
  const a = await import("@tauri-apps/plugin-autostart");
  if (on) await a.enable();
  else await a.disable();
}

export async function isOpenAtLogin(): Promise<boolean> {
  if (!inTauri) return false;
  const a = await import("@tauri-apps/plugin-autostart");
  return a.isEnabled();
}

// ── Talking between the main window and the menu bar popover ──
export async function emitTo<T>(event: string, payload: T): Promise<void> {
  if (!inTauri) return;
  const { emit } = await import("@tauri-apps/api/event");
  await emit(event, payload);
}

export async function listenTo<T>(event: string, handler: (payload: T) => void): Promise<() => void> {
  if (!inTauri) return () => undefined;
  const { listen } = await import("@tauri-apps/api/event");
  return listen<T>(event, (e) => handler(e.payload));
}
