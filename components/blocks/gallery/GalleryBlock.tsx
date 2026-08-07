import type { BlockRenderContext } from "../types";
import { BODY_MUTED, safeUrl } from "../tokens";

export interface GalleryImage {
  id: string;
  src: string;
  alt: string;
}

export interface GalleryProps {
  items: GalleryImage[];
  /** String, not number — a <select> always yields a string. */
  columns: "2" | "3";
  crop: "square" | "landscape" | "natural";
  caption: string;
}

const RATIO = {
  square: "aspect-square",
  landscape: "aspect-[4/3]",
  natural: "",
} as const;

/** A small image mosaic. */
export default function GalleryBlock({
  items,
  columns,
  crop,
  caption,
  mode,
}: GalleryProps & BlockRenderContext) {
  const usable = items.filter((item) => safeUrl(item.src));
  if (usable.length === 0) {
    return mode === "edit" ? (
      <div className="rounded-2xl border border-dashed border-black/15 px-5 py-6 text-center text-sm text-destiny-grey/45">
        Add an image in the settings panel.
      </div>
    ) : null;
  }

  return (
    <figure>
      <div
        className={`grid gap-2.5 ${
          columns === "3" ? "grid-cols-2 @xl:grid-cols-3" : "grid-cols-2"
        }`}
      >
        {usable.map((item) => (
          // Plain <img>: the upload route returns a URL with no intrinsic
          // dimensions, which next/image requires. loading/decoding keep it
          // off the critical path anyway.
          // eslint-disable-next-line @next/next/no-img-element
          <img
            key={item.id}
            src={safeUrl(item.src) as string}
            alt={item.alt}
            loading="lazy"
            decoding="async"
            className={`w-full rounded-xl object-cover ${RATIO[crop]}`}
          />
        ))}
      </div>
      {caption && <figcaption className={`mt-3 ${BODY_MUTED}`}>{caption}</figcaption>}
    </figure>
  );
}
