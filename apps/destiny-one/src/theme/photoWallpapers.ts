// The stock wallpaper photos, bundled with the app (assets/wallpapers). Kept
// apart from appearance.ts, which is plain data the unit tests import: a
// require() of an image only works inside the app bundle.
//
// Each photo ships twice: full size for the chat, and a small thumbnail for the
// picker so ten photos don't all have to be decoded at chat size.
//
// Source: Unsplash (https://unsplash.com/license), 900x1800 crops.

import type { ImageSourcePropType } from "react-native";
import { customWallpaperUri } from "@/lib/customWallpaper";
import { CUSTOM_WALLPAPER, photoWallpaper } from "@/theme/appearance";

interface Files {
  full: ImageSourcePropType;
  thumb: ImageSourcePropType;
}

const FILES: Record<string, Files> = {
  woodland: { full: require("../../assets/wallpapers/woodland.jpg"), thumb: require("../../assets/wallpapers/woodland-thumb.jpg") },
  alpine: { full: require("../../assets/wallpapers/alpine.jpg"), thumb: require("../../assets/wallpapers/alpine-thumb.jpg") },
  valley: { full: require("../../assets/wallpapers/valley.jpg"), thumb: require("../../assets/wallpapers/valley-thumb.jpg") },
  meadow: { full: require("../../assets/wallpapers/meadow.jpg"), thumb: require("../../assets/wallpapers/meadow-thumb.jpg") },
  dusk: { full: require("../../assets/wallpapers/dusk.jpg"), thumb: require("../../assets/wallpapers/dusk-thumb.jpg") },
  sunrise: { full: require("../../assets/wallpapers/sunrise.jpg"), thumb: require("../../assets/wallpapers/sunrise-thumb.jpg") },
  lake: { full: require("../../assets/wallpapers/lake.jpg"), thumb: require("../../assets/wallpapers/lake-thumb.jpg") },
  clouds: { full: require("../../assets/wallpapers/clouds.jpg"), thumb: require("../../assets/wallpapers/clouds-thumb.jpg") },
  shoreline: { full: require("../../assets/wallpapers/shoreline.jpg"), thumb: require("../../assets/wallpapers/shoreline-thumb.jpg") },
  stars: { full: require("../../assets/wallpapers/stars.jpg"), thumb: require("../../assets/wallpapers/stars-thumb.jpg") },
};

export function photoFiles(key: string): Files | undefined {
  return FILES[key];
}

/** The image to draw behind a chat for this wallpaper choice, or null if it isn't a photo (or the file has gone). */
export function photoSource(wallpaperId: string, customFile: string | null): ImageSourcePropType | null {
  if (wallpaperId === CUSTOM_WALLPAPER) {
    const uri = customWallpaperUri(customFile);
    return uri ? { uri } : null;
  }
  const stock = photoWallpaper(wallpaperId);
  return stock ? (photoFiles(stock.key)?.full ?? null) : null;
}
