// Every image is re-encoded on the phone before it's uploaded. Drawing the
// pixels into a new file drops everything else the original carried — above
// all the GPS location a phone camera writes into a photo, which could show
// where a child lives. It also turns HEIC into JPEG (which every screen can
// show) and scales very large photos down so uploads are quick.
//
// PDFs are left alone: they aren't photos, and re-encoding would destroy them.

import { ImageManipulator, SaveFormat } from "expo-image-manipulator";
import type { UploadQuality } from "@/state/dataSettings";

/**
 * Longest side, in pixels, and JPEG quality of an image we upload, by the
 * Storage and data "Upload quality" setting. Standard (the default) is plenty for a phone
 * screen at roughly a third of the size; HD (avatars and group icons) is sharper.
 */
const QUALITY: Record<UploadQuality, { maxSide: number; jpeg: number }> = {
  hd: { maxSide: 2048, jpeg: 0.85 },
  standard: { maxSide: 1280, jpeg: 0.7 },
};

export interface CleanImage {
  uri: string;
  name: string;
  mimeType: "image/jpeg" | "image/png";
  width: number;
  height: number;
}

/** A fresh copy of the image at `uri` with no metadata. PNGs stay PNG (screenshots stay sharp); everything else becomes JPEG. */
export async function cleanImage(uri: string, name: string, mimeType: string, options: { square?: boolean; quality?: UploadQuality } = {}): Promise<CleanImage> {
  const { maxSide, jpeg } = QUALITY[options.quality ?? "hd"];
  let image = await ImageManipulator.manipulate(uri).renderAsync();
  if (options.square && image.width !== image.height) {
    // Centre crop, for avatars and icons.
    const side = Math.min(image.width, image.height);
    const context = ImageManipulator.manipulate(image);
    context.crop({ originX: Math.round((image.width - side) / 2), originY: Math.round((image.height - side) / 2), width: side, height: side });
    image = await context.renderAsync();
  }
  if (Math.max(image.width, image.height) > maxSide) {
    const context = ImageManipulator.manipulate(image);
    context.resize(image.width >= image.height ? { width: maxSide } : { height: maxSide });
    image = await context.renderAsync();
  }

  const png = mimeType === "image/png";
  const saved = await image.saveAsync(png ? { format: SaveFormat.PNG } : { format: SaveFormat.JPEG, compress: jpeg });
  const base = name.replace(/\.[^.]+$/, "") || "Photo";
  return {
    uri: saved.uri,
    name: `${base}.${png ? "png" : "jpg"}`,
    mimeType: png ? "image/png" : "image/jpeg",
    width: saved.width,
    height: saved.height,
  };
}
