// The right-click menu for a message: quick reactions across the top, then
// the actions. Arrow keys and Return work; Escape or a click elsewhere closes.

import { useRef } from "react";
import { Icon, type IconName } from "@/components/Icon";
import { Floating, type Point } from "@/components/Floating";
import { QUICK_REACTIONS } from "@/lib/emoji";

export interface MenuItem {
  label: string;
  icon?: IconName;
  danger?: boolean;
  onSelect: () => void;
}

export function ContextMenu({
  at,
  items,
  onReact,
  onMoreReactions,
  onClose,
}: {
  at: Point;
  items: MenuItem[];
  onReact?: (emoji: string) => void;
  onMoreReactions?: (at: Point) => void;
  onClose: () => void;
}) {
  const list = useRef<HTMLDivElement>(null);

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key !== "ArrowDown" && e.key !== "ArrowUp") return;
    const buttons = [...(list.current?.querySelectorAll<HTMLButtonElement>("button[role=menuitem]") ?? [])];
    const i = buttons.indexOf(document.activeElement as HTMLButtonElement);
    const next = buttons[(i + (e.key === "ArrowDown" ? 1 : -1) + buttons.length) % buttons.length];
    e.preventDefault();
    next?.focus();
  };

  return (
    <Floating at={at} label="Message actions" onClose={onClose} width={236}>
      <div onKeyDown={onKeyDown}>
        {onReact && (
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: 6, borderBottom: "0.5px solid var(--sep)" }}>
            {QUICK_REACTIONS.map((e) => (
              <button
                key={e}
                className="ib sm"
                onClick={() => {
                  onReact(e);
                  onClose();
                }}
                aria-label={`React ${e}`}
                style={{ fontSize: 17 }}
              >
                {e}
              </button>
            ))}
            {onMoreReactions && (
              <button className="ib sm" onClick={() => onMoreReactions(at)} aria-label="More reactions">
                <Icon name="plus" size={15} stroke={2.2} />
              </button>
            )}
          </div>
        )}
        <div ref={list} style={{ padding: 4, display: "flex", flexDirection: "column" }}>
          {items.map((it, i) => (
            <button
              key={it.label}
              role="menuitem"
              className="row"
              autoFocus={!onReact && i === 0}
              onClick={() => {
                it.onSelect();
                onClose();
              }}
              style={{ height: 30, border: 0, borderRadius: 6, background: "transparent", display: "flex", alignItems: "center", gap: 10, padding: "0 10px", fontSize: 13, color: it.danger ? "var(--danger)" : "var(--text)", textAlign: "left" }}
            >
              {it.icon && <Icon name={it.icon} size={15} stroke={2} />}
              <span>{it.label}</span>
            </button>
          ))}
        </div>
      </div>
    </Floating>
  );
}
