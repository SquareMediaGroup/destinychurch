// Hand-off for the in-app camera (src/app/camera.tsx). A route can't return a
// value, so `takePhoto()` opens the screen and resolves with the photo's uri
// (or null if the person closed it). The screen calls `finishCamera`.

import { router } from "expo-router";

let pending: ((uri: string | null) => void) | null = null;

/** Open the camera; resolves with the photo's file uri, or null if cancelled. */
export function takePhoto(): Promise<string | null> {
  // A camera is already open: hand back nothing rather than stacking another.
  if (pending) return Promise.resolve(null);
  return new Promise((resolve) => {
    pending = resolve;
    router.push("/camera");
  });
}

export function finishCamera(uri: string | null) {
  const resolve = pending;
  pending = null;
  resolve?.(uri);
}
