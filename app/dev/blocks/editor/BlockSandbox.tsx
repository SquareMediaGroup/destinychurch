"use client";

import { useEffect, useState } from "react";
import type { Editor } from "@tiptap/react";
import RichTextEditor from "@/components/admin/RichTextEditor";
import { BlockPalette } from "@/components/admin/blocks/BlockPalette";
import { BlockInspector } from "@/components/admin/blocks/BlockInspector";
import { BlockTools } from "@/components/admin/blocks/BlockTools";
import { BLOCK_LIST } from "@/components/blocks/registry";
import RichContent from "@/components/content/RichContent";

/**
 * Development-only editor harness.
 *
 * Mounts the real editor with the real Blocks sidebar and inspector, using the
 * same three-column layout as the post editor — but with no auth, no database
 * and no save. That makes the block editing experience testable without a
 * login, which matters because /login is gated by Cloudflare Turnstile.
 *
 * It also surfaces two things the real editor deliberately hides: the stored
 * HTML, and a live public-side render of it via RichContent. Being able to see
 * the wire format change as you edit is the fastest way to catch serialisation
 * problems.
 */
export default function BlockSandbox() {
  const [html, setHtml] = useState("");
  const [editor, setEditor] = useState<Editor | null>(null);
  const [tab, setTab] = useState<"preview" | "html">("preview");

  // Expose the editor for console poking — schema inspection, running commands
  // by hand, checking what a transaction actually did. This page is
  // development-only, so there's no production surface to worry about.
  useEffect(() => {
    (window as unknown as { editor?: Editor | null }).editor = editor;
  }, [editor]);

  return (
    /*
      Fixed overlay rather than a normal page.

      Six components (ChurchHeader, SiteBanner, LiveBanner, FooterGate,
      FloatingSmartSearch…) gate the site chrome on /admin, each with slightly
      different rules. Adding /dev to all six to accommodate a dev-only tool
      would mean touching six live components for no user-facing benefit — so
      the sandbox covers the chrome instead. It also gives the harness the same
      chrome-free, non-scrolling frame the real admin editor has.
    */
    <div className="fixed inset-0 z-[100] flex flex-col overflow-hidden bg-[#f5f7fa]">
      <header className="flex shrink-0 items-center gap-3 border-b border-black/8 bg-white px-4 py-2.5">
        <span className="material-symbols-rounded text-[19px] text-destiny-orange">
          science
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-black text-destiny-grey">Block sandbox</p>
          <p className="text-xs text-destiny-grey/45">
            Development only. Nothing here is saved.
          </p>
        </div>
        <button
          type="button"
          onClick={() => editor?.commands.clearContent()}
          className="rounded-lg border border-black/10 px-2.5 py-1 text-xs font-bold text-destiny-grey/60 transition hover:bg-[#f5f7fa]"
        >
          Clear
        </button>
      </header>

      <div className="flex min-h-0 flex-1">
        <aside className="hidden w-60 shrink-0 border-r border-black/8 bg-white lg:block">
          <BlockPalette editor={editor} />
        </aside>

        <div className="flex min-w-0 flex-1 flex-col overflow-hidden p-2 lg:p-4">
          <div className="mx-auto flex h-full w-full max-w-3xl flex-col">
            {/* Below `lg` the two sidebars are gone, so the sheets are the only
                way in — same as the real modal editors. */}
            <div className="mb-2 flex justify-end lg:hidden">
              <BlockTools editor={editor} />
            </div>
            <RichTextEditor
              value={html}
              onChange={setHtml}
              placeholder="Type here, or add a block from the sidebar."
              advanced
              fill
              enableYouTube
              enableHtmlEmbed
              enableImages
              blocks={BLOCK_LIST}
              onEditor={setEditor}
            />
          </div>
        </div>

        <aside className="hidden w-80 shrink-0 border-l border-black/8 bg-white lg:block">
          <BlockInspector editor={editor} />
        </aside>
      </div>

      {/* Wire format + public render, side by side with the editor above. */}
      <section className="h-72 shrink-0 border-t border-black/8 bg-white">
        <div className="flex gap-1 border-b border-black/8 px-3 py-1.5">
          {(["preview", "html"] as const).map((id) => (
            <button
              key={id}
              type="button"
              onClick={() => setTab(id)}
              className={`rounded-lg px-2.5 py-1 text-xs font-bold transition ${
                tab === id
                  ? "bg-destiny-orange/10 text-destiny-orange"
                  : "text-destiny-grey/50 hover:bg-[#f5f7fa]"
              }`}
            >
              {id === "preview" ? "Public preview" : "Stored HTML"}
            </button>
          ))}
        </div>
        <div className="h-[calc(100%-2.35rem)] overflow-auto px-4 py-3">
          {tab === "html" ? (
            <pre className="whitespace-pre-wrap break-all font-mono text-[11px] leading-relaxed text-destiny-grey/70">
              {html || "(empty)"}
            </pre>
          ) : (
            <RichContent
              html={html}
              className="rte-content mx-auto max-w-3xl text-[0.97rem] text-destiny-grey/80"
              // The page already renders whatever the editor produces; a second
              // JSON-LD script here would just be noise.
              jsonLd={false}
            />
          )}
        </div>
      </section>
    </div>
  );
}
