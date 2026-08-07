import type { BlockRenderContext } from "../types";

export interface EmbedProps {
  html: string;
}

/**
 * Raw HTML, for anything the other blocks don't cover.
 *
 * The escape hatch, and deliberately the last resort — the toolbar's old
 * "Embed HTML" button is now this. Its trust model is unchanged: only signed-in
 * admins can reach an editor, and whatever they paste is rendered as-is. It is
 * the one block that can inject scripts or third-party iframes, so it stays out
 * of the way in the sidebar's Advanced group.
 *
 * Unlike the video and ChurchSuite blocks, this can't be routed through the
 * cookie-consent gate: we have no idea what's in it. Prefer those blocks for
 * YouTube and ChurchSuite so visitors get the consent prompt.
 */
export default function EmbedBlock({ html, mode }: EmbedProps & BlockRenderContext) {
  if (!html.trim()) {
    return mode === "edit" ? (
      <div className="rounded-2xl border border-dashed border-black/15 px-5 py-6 text-center text-sm text-destiny-grey/45">
        Paste the embed code in the settings panel.
      </div>
    ) : null;
  }

  if (mode === "edit") {
    // Show the code rather than running it. Rendering arbitrary markup inside
    // the editor lets a stray <script> or a height:100vh iframe wreck the
    // authoring surface, and the click shield can't help with layout.
    return (
      <div className="rounded-2xl border border-black/10 bg-[#f5f7fa] p-4">
        <p className="mb-2 text-[11px] font-bold uppercase tracking-wider text-destiny-grey/40">
          Custom embed
        </p>
        <pre className="max-h-40 overflow-auto whitespace-pre-wrap break-all font-mono text-[11px] leading-relaxed text-destiny-grey/60">
          {html}
        </pre>
      </div>
    );
  }

  return <div dangerouslySetInnerHTML={{ __html: html }} />;
}
