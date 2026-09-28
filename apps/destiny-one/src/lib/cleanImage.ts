// Every image is re-encoded on the phone before it's uploaded. Drawing the
// pixels into a new file drops everything else the original carried — above
// all the GPS location a phone camera writes into a photo, which could show
// where a child lives. It also turns HEIC into JPEG (which every screen can
// show) and scales very large photos down so uploads are quick.
//
// PDFs are left alone: they aren't photos, and re-encoding would destroy them.

import { ImageManipulator, SaveFormat } from "expo-image-manipulator";

/** Longest side, in pixels, of an image we upload. Plenty for a phone screen. */
const MAX_SIDE = 2048;
const JPEG_QUALITY = 0.85;

export interface CleanImage {
  uri: string;
  name: string;
  mimeType: "image/jpeg" | "image/png";
  width: number;
  height: number;
}

/** A fresh copy of the image at `uri` with no metadata. PNGs stay PNG (screenshots stay sharp); everything else becomes JPEG. */
export async function cleanImage(uri: string, name: string, mimeType: string): Promise<CleanImage> {
  const original = await ImageManipulator.manipulate(uri).renderAsync();
  let image = original;
  const longest = Math.max(original.width, original.height);
  if (longest > MAX_SIDE) {
    const context = ImageManipulator.manipulate(original);
    context.resize(original.width >= original.height ? { width: MAX_SIDE } : { height: MAX_SIDE });
    image = await context.renderAsync();
  }

  const png = mimeType === "image/png";
  const saved = await image.saveAsync(png ? { format: SaveFormat.PNG } : { format: SaveFormat.JPEG, compress: JPEG_QUALITY });
  const base = name.replace(/\.[^.]+$/, "") || "Photo";
  return {
    uri: saved.uri,
    name: `${base}.${png ? "png" : "jpg"}`,
    mimeType: png ? "image/png" : "image/jpeg",
    width: saved.width,
    height: saved.height,
  };
}
