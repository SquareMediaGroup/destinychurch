// DestinyAI's answer while it's being written (lib/assistantStream.ts): what
// it's doing (animated dots and a label), then the words as they arrive with
// a blinking bar. Sits where its finished message will land.

import { Avatar } from "@/components/ui";

export function AssistantStreaming({ label, text }: { label: string | null; text: string }) {
  return (
    <div role="status" aria-live="polite" style={{ display: "flex", gap: 10, paddingTop: 14 }}>
      <div style={{ marginTop: 2 }}><Avatar name="DestinyAI" size={32} /></div>
      <div style={{ maxWidth: "72%", minWidth: 0 }}>
        <div style={{ borderRadius: 16, background: "var(--bubble-in)", color: "var(--text)", padding: "8px 12px 9px", minHeight: 38, display: "flex", alignItems: "center" }}>
          {text ? (
            <div style={{ fontSize: 14, lineHeight: "20px", whiteSpace: "pre-wrap", overflowWrap: "anywhere" }}>
              {text}
              <span className="caret" aria-hidden="true">|</span>
            </div>
          ) : (
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <span className="dots" aria-hidden="true"><i /><i /><i /></span>
              <span className="muted" style={{ fontSize: 13 }}>{label ? `${label}…` : "Thinking…"}</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
