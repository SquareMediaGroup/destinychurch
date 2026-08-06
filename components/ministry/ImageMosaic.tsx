import Image from "next/image";

/**
 * Offset photo mosaic — the replacement for the `grid-cols-2` collage
 * (one wide image spanning two columns above two squares) that appeared five
 * times across the ministry pages.
 *
 * Two things it fixes beyond the look: every tile sits in a fixed
 * aspect-ratio box with `fill` + a real `sizes`, so there's no layout shift
 * and no oversized download — the old collages used fixed width/height with
 * no `sizes` at all.
 *
 * Takes 3 or 4 images. The second column is nudged down on large screens;
 * that offset is doing most of the work of making the block feel composed
 * rather than stacked.
 */

export interface MosaicImage {
  src: string;
  /** Empty string for purely decorative photos. */
  alt: string;
}

interface Props {
  images: MosaicImage[];
  /** Widen the sizes hint when the mosaic sits in the wider column. */
  wide?: boolean;
}

const TALL = "aspect-[3/4]";
const WIDE = "aspect-[4/3]";

function Tile({
  image,
  ratio,
  sizes,
}: {
  image: MosaicImage;
  ratio: string;
  sizes: string;
}) {
  return (
    <div className={`relative ${ratio} overflow-hidden rounded-2xl bg-[#f5f7fa]`}>
      <Image
        src={image.src}
        alt={image.alt}
        fill
        sizes={sizes}
        className="object-cover"
      />
    </div>
  );
}

export default function ImageMosaic({ images, wide = false }: Props) {
  const sizes = wide
    ? "(min-width: 1024px) 29vw, (min-width: 640px) 45vw, 45vw"
    : "(min-width: 1024px) 21vw, (min-width: 640px) 45vw, 45vw";

  // Column one leads with the tall shot; column two is offset downward.
  const [first, second, third, fourth] = images;

  return (
    <div className="grid grid-cols-2 gap-3 sm:gap-4">
      <div className="space-y-3 sm:space-y-4">
        <Tile image={first} ratio={TALL} sizes={sizes} />
        {fourth && <Tile image={fourth} ratio={WIDE} sizes={sizes} />}
      </div>
      <div className="space-y-3 sm:space-y-4 lg:mt-10">
        {second && <Tile image={second} ratio={WIDE} sizes={sizes} />}
        {third && <Tile image={third} ratio={TALL} sizes={sizes} />}
      </div>
    </div>
  );
}
