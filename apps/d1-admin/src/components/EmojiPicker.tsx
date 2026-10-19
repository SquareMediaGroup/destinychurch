// Pick any emoji: used for reactions and for the composer. Category tabs
// along the bottom, a grid above, arrow keys move between emoji.

import { useRef, useState } from "react";
import { EMOJI_GROUPS } from "@/lib/emoji";
import { Floating, type Point } from "@/components/Floating";

export function EmojiPicker({ at, label = "Choose an emoji", onPick, onClose }: { at: Point; label?: string; onPick: (emoji: string) => void; onClose: () => void }) {
  const [group, setGroup] = useState(EMOJI_GROUPS[0].id);
  const grid = useRef<HTMLDivElement>(null);
  const current = EMOJI_GROUPS.find((g) => g.id === group) ?? EMOJI_GROUPS[0];

  const move = (e: React.KeyboardEvent) => {
    const keys: Record<string, number> = { ArrowRight: 1, ArrowLeft: -1, ArrowDown: 8, ArrowUp: -8 };
    const step = keys[e.key];
    if (!step) return;
    const buttons = [...(grid.current?.querySelectorAll<HTMLButtonElement>("button") ?? [])];
    const i = buttons.indexOf(document.activeElement as HTMLButtonElement);
    const next = buttons[Math.max(0, Math.min(buttons.length - 1, (i < 0 ? 0 : i) + step))];
    if (next) {
      e.preventDefault();
      next.focus();
    }
  };

  return (
    <Floating at={at} label={label} onClose={onClose} width={296}>
      <div ref={grid} onKeyDown={move} className="scroll" style={{ display: "grid", gridTemplateColumns: "repeat(8, 1fr)", gap: 2, padding: 8, height: 188, overflowY: "auto", alignContent: "start" }}>
        {current.emoji.map((e, i) => (
          <button
            key={e}
            className="ib"
            autoFocus={i === 0}
            onClick={() => {
              onPick(e);
              onClose();
            }}
            aria-label={e}
            style={{ width: "100%", height: 32, fontSize: 20 }}
          >
            {e}
          </button>
        ))}
      </div>
      <div role="tablist" aria-label="Emoji categories" style={{ display: "flex", borderTop: "0.5px solid var(--sep)", padding: 4, gap: 2 }}>
        {EMOJI_GROUPS.map((g) => (
          <button
            key={g.id}
            role="tab"
            aria-selected={g.id === group}
            aria-label={g.label}
            title={g.label}
            className="ib sm"
            onClick={() => setGroup(g.id)}
            style={{ flex: 1, width: "auto", fontSize: 15, background: g.id === group ? "var(--fill2)" : "transparent" }}
          >
            {g.icon}
          </button>
        ))}
      </div>
    </Floating>
  );
}
