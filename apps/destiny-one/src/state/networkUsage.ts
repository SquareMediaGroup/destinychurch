// Network usage: how much media this phone has sent and received, split by
// kind and by Wi-Fi or mobile data. Counted by the app itself (the phone's own
// counters aren't open to apps), from each attachment's size when it's
// uploaded or first loaded. Messages themselves are a few bytes and aren't
// counted. Kept on this phone only, until the person resets it.

import { useSyncExternalStore } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import type { MediaKind } from "@/state/dataSettings";

export interface UsageRow {
  sentCount: number;
  sentBytes: number;
  receivedCount: number;
  receivedBytes: number;
}

export interface NetworkUsage {
  /** ISO time counting started (first launch with this feature, or the last reset). */
  since: string;
  kinds: Record<MediaKind, UsageRow>;
  wifiBytes: number;
  mobileBytes: number;
}

const KEY = "d1.usage.v1";
const EMPTY_ROW: UsageRow = { sentCount: 0, sentBytes: 0, receivedCount: 0, receivedBytes: 0 };

function fresh(): NetworkUsage {
  return { since: new Date().toISOString(), kinds: { photos: { ...EMPTY_ROW }, voice: { ...EMPTY_ROW }, files: { ...EMPTY_ROW } }, wifiBytes: 0, mobileBytes: 0 };
}

let current: NetworkUsage = fresh();
let loaded = false;
const listeners = new Set<() => void>();

let timer: ReturnType<typeof setTimeout> | null = null;
function save() {
  if (timer) return;
  timer = setTimeout(() => {
    timer = null;
    AsyncStorage.setItem(KEY, JSON.stringify(current)).catch(() => undefined);
  }, 1000);
}

function emit() {
  for (const l of listeners) l();
}

function num(v: unknown): number {
  return typeof v === "number" && Number.isFinite(v) && v >= 0 ? v : 0;
}

function sanitise(raw: unknown): NetworkUsage {
  const r = (raw ?? {}) as Partial<NetworkUsage>;
  const base = fresh();
  const row = (x: unknown): UsageRow => {
    const o = (x ?? {}) as Partial<UsageRow>;
    return { sentCount: num(o.sentCount), sentBytes: num(o.sentBytes), receivedCount: num(o.receivedCount), receivedBytes: num(o.receivedBytes) };
  };
  return {
    since: typeof r.since === "string" && !Number.isNaN(Date.parse(r.since)) ? r.since : base.since,
    kinds: { photos: row(r.kinds?.photos), voice: row(r.kinds?.voice), files: row(r.kinds?.files) },
    wifiBytes: num(r.wifiBytes),
    mobileBytes: num(r.mobileBytes),
  };
}

export const networkUsage = {
  get: () => current,
  record(direction: "sent" | "received", kind: MediaKind, bytes: number | null | undefined, wifi: boolean) {
    const size = num(bytes);
    const row = current.kinds[kind];
    const next: UsageRow =
      direction === "sent" ? { ...row, sentCount: row.sentCount + 1, sentBytes: row.sentBytes + size } : { ...row, receivedCount: row.receivedCount + 1, receivedBytes: row.receivedBytes + size };
    current = {
      ...current,
      kinds: { ...current.kinds, [kind]: next },
      wifiBytes: current.wifiBytes + (wifi ? size : 0),
      mobileBytes: current.mobileBytes + (wifi ? 0 : size),
    };
    emit();
    save();
  },
  reset() {
    current = fresh();
    emit();
    AsyncStorage.setItem(KEY, JSON.stringify(current)).catch(() => undefined);
  },
  /** Called once at launch. Anything counted before the saved copy came back is added to it. */
  async load() {
    if (loaded) return;
    loaded = true;
    try {
      const raw = await AsyncStorage.getItem(KEY);
      if (!raw) {
        save(); // remember when counting started
        return;
      }
      const saved = sanitise(JSON.parse(raw));
      const early = current;
      const add = (a: UsageRow, b: UsageRow): UsageRow => ({ sentCount: a.sentCount + b.sentCount, sentBytes: a.sentBytes + b.sentBytes, receivedCount: a.receivedCount + b.receivedCount, receivedBytes: a.receivedBytes + b.receivedBytes });
      current = {
        since: saved.since,
        kinds: { photos: add(saved.kinds.photos, early.kinds.photos), voice: add(saved.kinds.voice, early.kinds.voice), files: add(saved.kinds.files, early.kinds.files) },
        wifiBytes: saved.wifiBytes + early.wifiBytes,
        mobileBytes: saved.mobileBytes + early.mobileBytes,
      };
      emit();
    } catch {
      // unreadable: start counting again
    }
  },
};

export function useNetworkUsage(): NetworkUsage {
  return useSyncExternalStore(
    (l) => {
      listeners.add(l);
      return () => listeners.delete(l);
    },
    () => current,
    () => current,
  );
}
