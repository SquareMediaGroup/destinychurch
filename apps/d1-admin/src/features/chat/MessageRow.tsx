// One message, as drawn in the design: avatar and name on the first of a run,
// bubbles, reply quote, file card, reactions, and hover actions.

import type { D1Message } from "@destiny/shared";
import { Icon } from "@/components/Icon";
import { Avatar } from "@/components/ui";
import { clockTime, fileSize } from "@/lib/format";
import type { Point } from "@/components/Floating";
import { QUICK_REACTIONS } from "@/lib/emoji";
import { openExternal } from "@/lib/native";

/** The hover bar shows these; the right-click menu and the picker offer the rest. */
const BAR_REACTIONS = QUICK_REACTIONS.slice(0, 4);

interface Props {
  m: D1Message;
  first: boolean;
  replyTo: D1Message | null;
  senderIsAdmin: boolean;
  canDelete: boolean;
  onReact: (emoji: string) => void;
  onReply: () => void;
  onReport: () => void;
  onDelete: () => void;
  onContextMenu: (at: Point) => void;
  onMoreReactions: (at: Point) => void;
}

function contentLine(m: D1Message): string | null {
  const c = m.content;
  if (!c) return null;
  if (c.kind === "poll") return `Poll: ${c.poll.question} (${c.poll.totalVoters} voted)`;
  if (c.kind === "event") return `Event: ${c.event.name}`;
  if (c.kind === "sermon") return `Sermon: ${c.sermon.title}`;
  return null;
}

export function MessageRow({ m, first, replyTo, senderIsAdmin, canDelete, onReact, onReply, onReport, onDelete, onContextMenu, onMoreReactions }: Props) {
  const mine = m.mine;
  const name = mine ? "You" : m.sender?.displayName ?? "Former member";
  const att = m.attachment;
  const isImage = !!att?.mimeType.startsWith("image/") && !!att.url;
  const extra = contentLine(m);

  return (
    <div
      className="msg"
      onContextMenu={(e) => {
        if (m.deleted) return;
        e.preventDefault();
        onContextMenu({ x: e.clientX, y: e.clientY });
      }}
      style={{ position: "relative", display: "flex", gap: 10, paddingTop: first ? 14 : 3, flexDirection: mine ? "row-reverse" : "row" }}
    >
      {!mine && (first ? <div style={{ marginTop: 2 }}><Avatar name={name} size={32} /></div> : <div style={{ width: 32, flex: "none" }} />)}
      <div style={{ display: "flex", flexDirection: "column", alignItems: mine ? "flex-end" : "flex-start", gap: 4, minWidth: 0, maxWidth: "72%" }}>
        {first && !mine && (
          <div style={{ display: "flex", alignItems: "center", gap: 6, padding: "0 4px" }}>
            <span style={{ fontSize: 12, fontWeight: 600, color: "var(--text2)" }}>{name}</span>
            {senderIsAdmin && <span className="tag-admin">Admin</span>}
            <span className="subtle" style={{ fontSize: 11 }}>{clockTime(m.createdAt)}</span>
          </div>
        )}

        {m.deleted ? (
          <div style={{ borderRadius: 16, border: "1px dashed var(--sep)", padding: "6px 12px", fontSize: 13, fontStyle: "italic", color: "var(--muted)" }}>Message deleted</div>
        ) : (
          <div
            className="selectable"
            style={{ borderRadius: 16, background: mine ? "var(--orange)" : "var(--bubble-in)", color: mine ? "var(--on-orange)" : "var(--text)", padding: "8px 12px 9px", display: "flex", flexDirection: "column", gap: 6, maxWidth: "100%" }}
          >
            {m.forwarded && <span style={{ fontSize: 11, fontWeight: 600, opacity: 0.75 }}>Forwarded</span>}
            {replyTo && (
              <div style={{ margin: "0 -4px", padding: "6px 10px", borderRadius: 10, background: mine ? "rgba(255,255,255,0.35)" : "var(--bg)", display: "flex", flexDirection: "column", gap: 1, border: "0.5px solid var(--glass-line)" }}>
                <span style={{ fontSize: 12, fontWeight: 600, color: mine ? "var(--on-orange)" : "var(--tint)" }}>{replyTo.mine ? "You" : replyTo.sender?.displayName ?? "Former member"}</span>
                <span style={{ fontSize: 13, lineHeight: "17px", opacity: 0.85, display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" }}>
                  {replyTo.deleted ? "Message deleted" : replyTo.body ?? (replyTo.attachment ? "File" : "")}
                </span>
              </div>
            )}
            {att && isImage && (
              <button onClick={() => att.url && void openExternal(att.url)} aria-label="Open photo" style={{ margin: "0 -4px", padding: 0, border: 0, borderRadius: 10, overflow: "hidden", background: "transparent", maxWidth: 320 }}>
                <img src={att.url!} alt="" style={{ display: "block", maxWidth: "100%", maxHeight: 280, objectFit: "cover" }} />
              </button>
            )}
            {att && !isImage && (
              <button
                onClick={() => att.url && void openExternal(att.url)}
                style={{ margin: "0 -4px", padding: 8, borderRadius: 10, background: "var(--bg)", border: "0.5px solid var(--glass-line)", display: "flex", alignItems: "center", gap: 10, minWidth: 230, textAlign: "left" }}
              >
                <span className="av" style={{ width: 36, height: 36, borderRadius: 8 }}><Icon name="file" size={18} /></span>
                <span style={{ display: "flex", flexDirection: "column", gap: 1 }}>
                  <span style={{ fontSize: 13, fontWeight: 600 }}>{att.mimeType === "application/pdf" ? "PDF" : "File"}</span>
                  <span className="subtle" style={{ fontSize: 11 }}>{[fileSize(att.sizeBytes), "Open"].filter(Boolean).join(" · ")}</span>
                </span>
              </button>
            )}
            {extra && <div style={{ fontSize: 13, fontWeight: 600 }}>{extra}</div>}
            {m.body && <div style={{ fontSize: 14, lineHeight: "20px", whiteSpace: "pre-wrap", overflowWrap: "anywhere" }}>{m.body}</div>}
            {m.linkPreview && (
              <button onClick={() => void openExternal(m.linkPreview!.url)} style={{ margin: "0 -4px", padding: "6px 10px", borderRadius: 10, background: mine ? "rgba(255,255,255,0.35)" : "var(--bg)", border: "0.5px solid var(--glass-line)", textAlign: "left", display: "flex", flexDirection: "column", gap: 2 }}>
                <span style={{ fontSize: 12, fontWeight: 600 }}>{m.linkPreview.title}</span>
                {m.linkPreview.siteName && <span style={{ fontSize: 11, opacity: 0.75 }}>{m.linkPreview.siteName}</span>}
              </button>
            )}
            {m.editedAt && <span style={{ fontSize: 11, opacity: 0.7 }}>Edited</span>}
          </div>
        )}

        {!m.deleted && m.reactions.length > 0 && (
          <div style={{ display: "flex", gap: 4, marginTop: -2 }}>
            {m.reactions.map((r) => (
              <button
                key={r.emoji}
                onClick={() => onReact(r.emoji)}
                aria-pressed={r.mine}
                aria-label={`${r.emoji} ${r.count}`}
                style={{ height: 24, borderRadius: 12, border: 0, background: r.mine ? "var(--accent-soft)" : "var(--card)", boxShadow: `inset 0 0 0 1px ${r.mine ? "var(--orange)" : "var(--glass-line)"}`, display: "flex", alignItems: "center", gap: 4, padding: "0 8px", fontSize: 12, fontWeight: 600 }}
              >
                <span style={{ fontSize: 13 }}>{r.emoji}</span>
                {r.count}
              </button>
            ))}
          </div>
        )}
      </div>

      {!m.deleted && (
        <div className="acts" style={{ alignSelf: "center", display: "flex", alignItems: "center", gap: 1, padding: 3, borderRadius: 10, background: "var(--sheet)", boxShadow: "var(--shadow)", border: "0.5px solid var(--glass-line)" }}>
          {BAR_REACTIONS.map((e) => (
            <button key={e} className="ib sm" onClick={() => onReact(e)} aria-label={`React ${e}`} style={{ fontSize: 15 }}>{e}</button>
          ))}
          <button
            className="ib sm"
            aria-label="More reactions"
            onClick={(e) => {
              const r = e.currentTarget.getBoundingClientRect();
              onMoreReactions({ x: r.left, y: r.bottom + 4 });
            }}
          >
            <Icon name="smile" size={15} stroke={2} />
          </button>
          <div style={{ width: 0.5, height: 18, background: "var(--sep)", margin: "0 3px" }} />
          <button className="ib sm" onClick={onReply} aria-label="Reply"><Icon name="reply" size={15} stroke={2} /></button>
          {!mine && <button className="ib sm" onClick={onReport} aria-label="Report"><Icon name="flag" size={15} stroke={2} /></button>}
          {canDelete && <button className="ib sm" onClick={onDelete} aria-label="Delete" style={{ color: "var(--danger)" }}><Icon name="trash" size={15} stroke={2} /></button>}
        </div>
      )}
    </div>
  );
}
