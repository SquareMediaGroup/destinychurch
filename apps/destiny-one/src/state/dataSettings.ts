// Storage and data settings: how photos are sent, and which media loads by
// itself on Wi-Fi or mobile data. Kept on this phone only (AsyncStorage), as a
// tiny external store like appearance.ts, so every bubble re-renders the
// moment a setting changes.
//
// Also remembers which attachments have already been loaded on this phone,
// so a photo you've seen once keeps showing when you move off Wi-Fi.

import { useSyncExternalStore } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { connection, useConnection, type Connection } from "@/lib/network";
import { networkUsage } from "@/state/networkUsage";

/** When media loads without a tap. */
export type AutoDownload = "wifi" | "always" | "never";
export type UploadQuality = "standard" | "hd";
/** The kinds of media a chat can carry. Files (PDFs) only ever open on a tap, so they have no setting. */
export type MediaKind = "photos" | "voice" | "files";

export interface DataSettings {
  uploadQuality: UploadQuality;
  photos: AutoDownload;
  voice: AutoDownload;
}

export const AUTO_DOWNLOAD_OPTIONS: { key: AutoDownload; label: string }[] = [
  { key: "never", label: "Never" },
  { key: "wifi", label: "Wi-Fi" },
  { key: "always", label: "Wi-Fi and mobile data" },
];

export const UPLOAD_QUALITY_OPTIONS: { key: UploadQuality; label: string }[] = [
  { key: "standard", label: "Standard" },
  { key: "hd", label: "HD" },
];

export const DEFAULT_DATA_SETTINGS: DataSettings = { uploadQuality: "hd", photos: "always", voice: "wifi" };

const KEY = "d1.data.v1";
const DOWNLOADED_KEY = "d1.data.downloaded.v1";
/** Enough for months of chats; the oldest ids drop off first. */
const MAX_DOWNLOADED = 3000;

let current: DataSettings = DEFAULT_DATA_SETTINGS;
let downloaded = new Set<string>();
const listeners = new Set<() => void>();

function emit() {
  for (const l of listeners) l();
}

function subscribe(l: () => void) {
  listeners.add(l);
  return () => {
    listeners.delete(l);
  };
}

function save() {
  AsyncStorage.setItem(KEY, JSON.stringify(current)).catch(() => undefined); // not being saved is fine; it just resets next launch
}

let downloadedTimer: ReturnType<typeof setTimeout> | null = null;
function saveDownloaded() {
  // A chat full of photos marks dozens at once: write them in one go.
  if (downloadedTimer) return;
  downloadedTimer = setTimeout(() => {
    downloadedTimer = null;
    AsyncStorage.setItem(DOWNLOADED_KEY, JSON.stringify([...downloaded])).catch(() => undefined);
  }, 1000);
}

function pick<T extends string>(value: unknown, allowed: readonly { key: T }[], fallback: T): T {
  return allowed.some((o) => o.key === value) ? (value as T) : fallback;
}

function sanitise(raw: unknown): DataSettings {
  const r = (raw ?? {}) as Partial<DataSettings>;
  return {
    uploadQuality: pick(r.uploadQuality, UPLOAD_QUALITY_OPTIONS, DEFAULT_DATA_SETTINGS.uploadQuality),
    photos: pick(r.photos, AUTO_DOWNLOAD_OPTIONS, DEFAULT_DATA_SETTINGS.photos),
    voice: pick(r.voice, AUTO_DOWNLOAD_OPTIONS, DEFAULT_DATA_SETTINGS.voice),
  };
}

export function mediaKind(mimeType: string): MediaKind {
  return mimeType.startsWith("image/") ? "photos" : mimeType.startsWith("audio/") ? "voice" : "files";
}

export function autoDownloads(setting: AutoDownload, on: Connection): boolean {
  if (on === "offline") return false;
  return setting === "always" || (setting === "wifi" && on === "wifi");
}

export const dataSettings = {
  get: () => current,
  set(patch: Partial<DataSettings>) {
    current = sanitise({ ...current, ...patch });
    emit();
    save();
  },
  /** Back to the defaults for auto-download (upload quality is left alone, as the reset only covers auto-download). */
  resetAutoDownload() {
    current = { ...current, photos: DEFAULT_DATA_SETTINGS.photos, voice: DEFAULT_DATA_SETTINGS.voice };
    emit();
    save();
  },
  isDownloaded: (attachmentId: string) => downloaded.has(attachmentId),
  /** True the first time this attachment is marked, so the caller can count it once. */
  markDownloaded(attachmentId: string): boolean {
    if (downloaded.has(attachmentId)) return false;
    downloaded.add(attachmentId);
    if (downloaded.size > MAX_DOWNLOADED) downloaded = new Set([...downloaded].slice(-MAX_DOWNLOADED));
    emit();
    saveDownloaded();
    return true;
  },
  /** After clearing storage: media asks again before it loads. */
  forgetDownloaded() {
    downloaded = new Set();
    emit();
    AsyncStorage.removeItem(DOWNLOADED_KEY).catch(() => undefined);
  },
  /** Called once at launch. */
  async load() {
    try {
      const [raw, ids] = await Promise.all([AsyncStorage.getItem(KEY), AsyncStorage.getItem(DOWNLOADED_KEY)]);
      if (raw) current = sanitise(JSON.parse(raw));
      const list: unknown = ids ? JSON.parse(ids) : [];
      if (Array.isArray(list)) downloaded = new Set([...list.filter((x): x is string => typeof x === "string"), ...downloaded]);
      emit();
    } catch {
      // unreadable: keep the defaults
    }
  },
};

export function useDataSettings(): DataSettings {
  return useSyncExternalStore(subscribe, () => current, () => current);
}

/**
 * Whether an attachment should load without a tap: your own media, anything
 * already loaded on this phone, or the setting for its kind allows it on the
 * current connection.
 */
export function useAutoDownload(kind: MediaKind, attachmentId: string | undefined, mine: boolean): boolean {
  const settings = useDataSettings();
  const on = useConnection();
  // Only this attachment's own flag, so marking one photo doesn't re-render every bubble.
  const has = () => (attachmentId ? downloaded.has(attachmentId) : false);
  const seen = useSyncExternalStore(subscribe, has, has);
  if (mine || kind === "files" || seen) return true;
  return autoDownloads(kind === "photos" ? settings.photos : settings.voice, on);
}

/** For code outside React (uploads): which connection to count usage against. */
export function onWifi(): boolean {
  return connection() === "wifi";
}

/**
 * An attachment finished loading in a chat or the photo viewer: remember it
 * (so it keeps showing off Wi-Fi) and, the first time, count it as received.
 */
export function noteLoaded(attachment: { id: string; mimeType: string; sizeBytes: number | null }, mine: boolean) {
  if (dataSettings.markDownloaded(attachment.id) && !mine) networkUsage.record("received", mediaKind(attachment.mimeType), attachment.sizeBytes, onWifi());
}
