import type { BlockRenderContext, Tone } from "../types";
import { BODY, FONT_ROBOTO, TONE_ACCENT, TONE_BORDER, TONE_SURFACE } from "../tokens";

export interface CalloutProps {
  icon: string;
  heading: string;
  body: string;
  tone: Tone;
}

/** A tinted notice panel — good for "please note", opening times, requirements. */
export default function CalloutBlock({
  icon,
  heading,
  body,
  tone,
}: CalloutProps & BlockRenderContext) {
  return (
    <aside
      className={`flex gap-4 rounded-2xl border p-5 ${TONE_SURFACE[tone]} ${TONE_BORDER[tone]}`}
    >
      {icon && (
        <span
          aria-hidden
          className={`material-symbols-rounded shrink-0 text-[22px] ${TONE_ACCENT[tone]}`}
        >
          {icon}
        </span>
      )}
      <div className="min-w-0 flex-1">
        {heading && (
          <h3
            className="text-base font-black tracking-[-0.01em] text-destiny-grey"
            style={{ fontFamily: FONT_ROBOTO }}
          >
            {heading}
          </h3>
        )}
        {body && <p className={`${BODY} ${heading ? "mt-1.5" : ""}`}>{body}</p>}
      </div>
    </aside>
  );
}
