// The person's own wallpaper photo. It never leaves the phone: it's shrunk,
// stripped of hidden details (GPS location and the like) and copied into the
// app's private documents folder, and nothing is uploaded.
//
// Only the file NAME is remembered (state/appearance.ts). iOS can move the app's
// folder between launches and updates, so the full path is worked out fresh
// each time from Paths.document rather than saved.

import * as ImagePicker from "expo-image-picker";
import { ImageManipulator, SaveFormat } from "expo-image-manipulator";
import { File, Paths } from "expo-file-system";

/** Shorter side, in pixels. Plenty behind a blur and a dim, and keeps the file small. */
const SHORT_SIDE = 1200;
const JPEG_QUALITY = 0.75;

// Every message bubble reads the theme, and each read asks for this, so the answer is remembered
// rather than asking the file system dozens of times per screen. A new photo always has a new name.
let known: { name: string; uri: string } | null = null;

/** Where a saved wallpaper lives right now, or null if it's gone (cleared storage, restored phone). */
export function customWallpaperUri(name: string | null | undefined): string | null {
  if (!name) return null;
  if (known?.name === name) return known.uri;
  const file = new File(Paths.document, name);
  if (!file.exists) return null;
  known = { name, uri: file.uri };
  return file.uri;
}

/** Delete a saved wallpaper file. Missing is fine. */
export function deleteCustomWallpaper(name: string | null | undefined): void {
  if (!name) return;
  if (known?.name === name) known = null;
  try {
    const file = new File(Paths.document, name);
    if (file.exists) file.delete();
  } catch {
    // nothing useful to do; a stray file is only a few hundred KB
  }
}

/**
 * Let the person choose a photo and save a wallpaper-sized copy. Resolves to
 * the new file name, or null if they cancelled. Throws if the photo can't be read.
 */
export async function pickCustomWallpaper(): Promise<string | null> {
  const picked = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ["images"], allowsMultipleSelection: false, quality: 1 });
  if (picked.canceled || !picked.assets[0]) return null;

  const original = await ImageManipulator.manipulate(picked.assets[0].uri).renderAsync();
  let image = original;
  if (Math.min(original.width, original.height) > SHORT_SIDE) {
    const context = ImageManipulator.manipulate(original);
    context.resize(original.width <= original.height ? { width: SHORT_SIDE } : { height: SHORT_SIDE });
    image = await context.renderAsync();
  }
  const saved = await image.saveAsync({ format: SaveFormat.JPEG, compress: JPEG_QUALITY });

  // A new name each time so the image cache can never show the previous photo.
  const name = `wallpaper-${Date.now()}.jpg`;
  const temp = new File(saved.uri);
  await temp.copy(new File(Paths.document, name));
  try {
    temp.delete();
  } catch {
    // it's in the cache folder, which the system clears anyway
  }
  return name;
}
