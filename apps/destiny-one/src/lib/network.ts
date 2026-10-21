// Which kind of connection the phone is on right now: Wi-Fi or mobile data.
// One listener for the whole app (not one per chat bubble), as a tiny
// external store so photo bubbles re-check auto-download the moment it
// changes. Ethernet counts as Wi-Fi; anything unknown counts as mobile data,
// so the cautious choice wins until the phone says otherwise.

import { useSyncExternalStore } from "react";
import * as Network from "expo-network";

export type Connection = "wifi" | "mobile" | "offline";

let current: Connection = "mobile";
let started = false;
const listeners = new Set<() => void>();

function toConnection(state: Network.NetworkState): Connection {
  if (state.isConnected === false) return "offline";
  return state.type === Network.NetworkStateType.WIFI || state.type === Network.NetworkStateType.ETHERNET ? "wifi" : "mobile";
}

function update(next: Connection) {
  if (next === current) return;
  current = next;
  for (const l of listeners) l();
}

/** Starts listening. Safe to call more than once. */
export function startNetworkTracking() {
  if (started) return;
  started = true;
  Network.getNetworkStateAsync().then((s) => update(toConnection(s)), () => undefined);
  Network.addNetworkStateListener((s) => update(toConnection(s)));
}

export function connection(): Connection {
  startNetworkTracking();
  return current;
}

export function useConnection(): Connection {
  startNetworkTracking();
  return useSyncExternalStore(
    (l) => {
      listeners.add(l);
      return () => listeners.delete(l);
    },
    () => current,
    () => current,
  );
}
