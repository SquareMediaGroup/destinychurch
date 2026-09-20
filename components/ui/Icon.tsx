import { cn } from "@/lib/cn";

/**
 * A Material Symbols icon.
 *
 * The icon font is loaded as *ligatures* — the glyph is produced by putting the
 * literal text `play_arrow` inside an element styled with the icon font. That
 * is why `display=block` is used on the stylesheet in app/layout.tsx: with
 * `swap`, the raw word flashes on screen before the font arrives.
 *
 * The same mechanism has a quieter consequence. A screen reader does not load
 * the font, so it reads the text node — and the site had 573 of these spans,
 * of which 6 carried `aria-hidden`. Listening to /give currently means hearing
 * "volunteer_activism", "open_in_new", "contactless". That is what this
 * component exists to stop.
 *
 * Icons are decorative by default, because in almost every case the label is
 * already in the markup beside them. The two exceptions take `label`:
 *
 *   - the icon IS the control (an icon-only button, a carousel arrow)
 *   - the icon carries meaning no adjacent text repeats (a status tick)
 *
 * With `label` set it becomes `role="img"` with an accessible name; without it
 * the glyph is hidden and the surrounding text does the talking. Either way the
 * ligature text never reaches the accessibility tree.
 */

const SIZES = {
  xs: "text-sm",
  sm: "text-base",
  md: "text-lg",
  lg: "text-xl",
  xl: "text-2xl",
  "2xl": "text-3xl",
} as const;

export type IconSize = keyof typeof SIZES;

export default function Icon({
  name,
  size = "md",
  label,
  filled,
  className,
}: {
  /** Material Symbols ligature name, e.g. `play_arrow`. */
  name: string;
  size?: IconSize;
  /**
   * Accessible name. Omit for decorative icons — which is most of them.
   * Setting this on an icon whose label is already in the markup makes a
   * screen reader say it twice.
   */
  label?: string;
  /** Use the filled cut of the glyph rather than the outline. */
  filled?: boolean;
  className?: string;
}) {
  return (
    <span
      className={cn("material-symbols-rounded", SIZES[size], className)}
      style={filled ? { fontVariationSettings: '"FILL" 1' } : undefined}
      aria-hidden={label ? undefined : true}
      role={label ? "img" : undefined}
      aria-label={label}
      // The ligature text is content, not markup, and it must not be broken up
      // by a browser translation pass — a translated `play_arrow` stops being a
      // glyph and starts being a word on the page.
      translate="no"
    >
      {name}
    </span>
  );
}
