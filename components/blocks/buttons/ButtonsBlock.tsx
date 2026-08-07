import type { BlockRenderContext } from "../types";
import { BTN_PRIMARY, BTN_SECONDARY, BTN_TEXT, safeUrl } from "../tokens";

export interface ButtonItem {
  id: string;
  label: string;
  href: string;
  style: "primary" | "secondary" | "text";
  icon: string;
}

export interface ButtonsProps {
  items: ButtonItem[];
  align: "left" | "center";
}

const STYLES = {
  primary: BTN_PRIMARY,
  secondary: BTN_SECONDARY,
  text: BTN_TEXT,
} as const;

/** A row of call-to-action links. */
export default function ButtonsBlock({
  items,
  align,
  mode,
}: ButtonsProps & BlockRenderContext) {
  const usable = items.filter((item) => item.label.trim());
  if (usable.length === 0) {
    return mode === "edit" ? (
      <div className="rounded-2xl border border-dashed border-black/15 px-5 py-6 text-center text-sm text-destiny-grey/45">
        Add a button in the settings panel.
      </div>
    ) : null;
  }

  return (
    <div
      className={`flex flex-wrap items-center gap-3 ${
        align === "center" ? "justify-center" : "justify-start"
      }`}
    >
      {usable.map((item) => {
        // safeUrl rejects javascript: and other schemes React would happily
        // place in an href. A rejected link renders as plain text rather than
        // vanishing, so the author can see and fix it.
        const href = safeUrl(item.href);
        const content = (
          <>
            {item.icon && (
              <span aria-hidden className="material-symbols-rounded text-[18px]">
                {item.icon}
              </span>
            )}
            {item.label}
          </>
        );
        return href ? (
          <a key={item.id} href={href} className={STYLES[item.style]}>
            {content}
          </a>
        ) : (
          <span key={item.id} className={`${STYLES[item.style]} opacity-60`}>
            {content}
          </span>
        );
      })}
    </div>
  );
}
