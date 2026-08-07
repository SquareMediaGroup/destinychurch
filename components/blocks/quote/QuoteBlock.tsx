import type { BlockRenderContext } from "../types";
import { FONT_ROBOTO } from "../tokens";

export interface QuoteProps {
  quote: string;
  attribution: string;
  role: string;
  align: "left" | "center";
}

/**
 * A pull quote or testimonial.
 *
 * No equivalent exists elsewhere on the site, so this leans on the established
 * vocabulary — orange accent rule, Roboto, tight tracking — rather than
 * inventing a new one.
 */
export default function QuoteBlock({
  quote,
  attribution,
  role,
  align,
  mode,
}: QuoteProps & BlockRenderContext) {
  if (!quote.trim()) {
    return mode === "edit" ? (
      <div className="rounded-2xl border border-dashed border-black/15 px-5 py-6 text-center text-sm text-destiny-grey/45">
        Add the quote in the settings panel.
      </div>
    ) : null;
  }

  const centred = align === "center";

  return (
    <figure
      className={
        centred
          ? "text-center"
          : "border-l-[3px] border-destiny-orange pl-5 sm:pl-6"
      }
    >
      <blockquote
        className="text-[clamp(1.125rem,1rem_+_0.9cqi,1.375rem)] font-medium leading-snug tracking-[-0.015em] text-destiny-grey"
        style={{ fontFamily: FONT_ROBOTO }}
      >
        {/* Typographic quotes, not the straight ones a keyboard produces. */}
        &ldquo;{quote}&rdquo;
      </blockquote>
      {(attribution || role) && (
        <figcaption
          className={`mt-3 text-sm ${centred ? "" : ""}`}
        >
          {attribution && (
            <span className="font-bold text-destiny-grey">{attribution}</span>
          )}
          {attribution && role && (
            <span aria-hidden className="text-destiny-grey/30">
              {" · "}
            </span>
          )}
          {role && <span className="text-destiny-grey/55">{role}</span>}
        </figcaption>
      )}
    </figure>
  );
}
