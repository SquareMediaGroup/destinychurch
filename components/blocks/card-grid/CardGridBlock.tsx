import type { BlockRenderContext, Tone } from "../types";
import {
  BODY_MUTED,
  CARD_HOVER,
  CARD_SHELL,
  CARD_TITLE,
  EYEBROW,
  FONT_ANTON,
  FONT_ROBOTO,
  HEADING,
  TONE_ACCENT,
  TONE_SURFACE,
  safeUrl,
} from "../tokens";

export interface CardItem {
  id: string;
  icon: string;
  title: string;
  body: string;
  href: string;
}

export interface CardGridProps {
  eyebrow: string;
  heading: string;
  items: CardItem[];
  /** String, not number: a <select> always yields a string. */
  columns: "2" | "3";
  marker: "icon" | "number" | "none";
  tone: Tone;
}

/**
 * A grid of small cards — the FeatureGrid pattern re-cut for a reading column.
 *
 * Columns collapse via @container, not viewport breakpoints, because this block
 * renders in four different column widths (posts, training, jobs, shop) and a
 * viewport breakpoint would be wrong in at least three of them.
 */
export default function CardGridBlock({
  eyebrow,
  heading,
  items,
  columns,
  marker,
  tone,
  mode,
}: CardGridProps & BlockRenderContext) {
  const usable = items.filter((item) => item.title.trim() || item.body.trim());
  if (usable.length === 0) {
    return mode === "edit" ? (
      <div className="rounded-2xl border border-dashed border-black/15 px-5 py-6 text-center text-sm text-destiny-grey/45">
        Add a card in the settings panel.
      </div>
    ) : null;
  }

  return (
    <section>
      {(eyebrow || heading) && (
        <div className="mb-6">
          {eyebrow && <p className={`mb-3 ${EYEBROW}`}>{eyebrow}</p>}
          {heading && (
            <h2 className={HEADING} style={{ fontFamily: FONT_ROBOTO }}>
              {heading}
            </h2>
          )}
        </div>
      )}

      <div
        className={`grid gap-4 ${
          columns === "3"
            ? "@md:grid-cols-2 @2xl:grid-cols-3"
            : "@md:grid-cols-2"
        }`}
      >
        {usable.map((item, index) => {
          const href = safeUrl(item.href);
          const Tag = href ? "a" : "div";
          return (
            <Tag
              key={item.id}
              {...(href ? { href } : {})}
              className={`block p-5 ${TONE_SURFACE[tone]} ${CARD_SHELL} ${href ? CARD_HOVER : ""}`}
            >
              {marker === "icon" && item.icon && (
                <span
                  aria-hidden
                  className={`material-symbols-rounded mb-3 block text-[24px] ${TONE_ACCENT[tone]}`}
                >
                  {item.icon}
                </span>
              )}
              {marker === "number" && (
                <span
                  aria-hidden
                  className={`mb-3 block text-lg ${TONE_ACCENT[tone]}`}
                  style={{ fontFamily: FONT_ANTON }}
                >
                  {String(index + 1).padStart(2, "0")}
                </span>
              )}
              {item.title && (
                <h3 className={CARD_TITLE} style={{ fontFamily: FONT_ROBOTO }}>
                  {item.title}
                </h3>
              )}
              {item.body && <p className={`mt-1.5 ${BODY_MUTED}`}>{item.body}</p>}
            </Tag>
          );
        })}
      </div>
    </section>
  );
}
