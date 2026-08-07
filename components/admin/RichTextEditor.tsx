"use client";

import { useEditor, EditorContent, type Editor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Placeholder from "@tiptap/extension-placeholder";
import Youtube from "@tiptap/extension-youtube";
import Link from "@tiptap/extension-link";
import TextAlign from "@tiptap/extension-text-align";
import Underline from "@tiptap/extension-underline";
import Highlight from "@tiptap/extension-highlight";
import Image from "@tiptap/extension-image";
import { Node, type CommandProps } from "@tiptap/core";
import { useEffect, useMemo, useRef, useState } from "react";
import { useDialog } from "@/components/DialogProvider";
import { useToast } from "@/components/ToastProvider";
import type { AnyBlockDefinition } from "@/components/blocks/types";
import { createBlockNode } from "./blocks/createBlockNode";
import { UnknownBlock } from "./blocks/UnknownBlockNode";
import { BlockDocument } from "./blocks/BlockDocument";
import { blockDropHandler } from "./blocks/insertBlock";

declare module "@tiptap/core" {
  interface Commands<ReturnType> {
    htmlEmbed: {
      /** Insert a raw-HTML embed block. */
      setHtmlEmbed: (options: { html: string }) => ReturnType;
    };
  }
}

const HtmlEmbed = Node.create({
  name: "htmlEmbed",
  group: "block",
  atom: true,

  addAttributes() {
    return {
      html: {
        default: "",
      },
    };
  },

  parseHTML() {
    return [
      {
        tag: "div[data-html-embed]",
        getAttrs: (element) => ({
          html: (element as HTMLElement).innerHTML,
        }),
      },
    ];
  },

  renderHTML({ node }) {
    if (typeof document !== "undefined") {
      const div = document.createElement("div");
      div.setAttribute("data-html-embed", "true");
      div.innerHTML = node.attrs.html;
      return div;
    }
    return ["div", { "data-html-embed": "true", "data-fallback-html": node.attrs.html }];
  },

  addNodeView() {
    return ({ node }) => {
      const dom = document.createElement("div");
      dom.setAttribute("data-html-embed", "true");
      dom.className =
        "relative my-4 rounded-xl border-2 border-dashed border-destiny-orange/30 bg-destiny-orange/5 p-4 before:content-['HTML_Embed'] before:absolute before:-top-3 before:left-4 before:bg-white before:px-1 before:text-[10px] before:font-bold before:text-destiny-orange/60";
      dom.innerHTML = node.attrs.html;
      return { dom };
    };
  },

  addCommands() {
    return {
      setHtmlEmbed:
        (options: { html: string }) =>
        ({ commands }: CommandProps) =>
          commands.insertContent({
            type: this.name,
            attrs: options,
          }),
    };
  },
});

// A friendly what-you-see-is-what-you-get editor so staff never have to write
// Markdown by hand. Outputs HTML, which is rendered on the public job/training
// pages. With `enableYouTube`, staff can embed YouTube videos inline.

function ToolbarButton({
  onClick,
  active,
  label,
  icon,
}: {
  onClick: () => void;
  active?: boolean;
  label: string;
  icon: string;
}) {
  return (
    <button
      type="button"
      onMouseDown={(e) => e.preventDefault()}
      onClick={onClick}
      aria-label={label}
      title={label}
      className={`flex h-8 min-w-8 items-center justify-center rounded-lg px-2 text-sm font-bold transition ${
        active
          ? "bg-destiny-orange/15 text-destiny-orange"
          : "text-destiny-grey/60 hover:bg-black/5"
      }`}
    >
      <span className="material-symbols-rounded text-[20px]">{icon}</span>
    </button>
  );
}

function Toolbar({
  editor,
  enableImages,
  advanced,
}: {
  editor: Editor;
  enableImages?: boolean;
  advanced?: boolean;
}) {
  const div = "mx-1 h-5 w-px bg-black/10";
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const { prompt } = useDialog();
  const toast = useToast();

  async function onPickImage(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = ""; // allow re-picking the same file
    if (!file) return;
    setUploading(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      const res = await fetch("/api/admin/posts/upload", {
        method: "POST",
        body: formData,
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data.url) {
        toast.error(data.error || "Image upload failed.");
        return;
      }
      editor.chain().focus().setImage({ src: data.url }).run();
    } finally {
      setUploading(false);
    }
  }

  async function setLink() {
    if (editor.isActive("link")) {
      editor.chain().focus().extendMarkRange("link").unsetLink().run();
      return;
    }
    const prev = (editor.getAttributes("link").href as string) || "";
    const url = await prompt({
      title: "Add link",
      message: "Link URL",
      placeholder: "https://...",
      defaultValue: prev,
    });
    if (url === null) return; // cancelled
    if (url.trim() === "") {
      editor.chain().focus().extendMarkRange("link").unsetLink().run();
      return;
    }
    editor
      .chain()
      .focus()
      .extendMarkRange("link")
      .setLink({ href: url.trim() })
      .run();
  }

  return (
    <div className="flex flex-wrap items-center gap-0.5 border-b border-black/10 bg-[#f9fafb] px-2 py-1.5">
      <ToolbarButton
        label="Bold"
        icon="format_bold"
        active={editor.isActive("bold")}
        onClick={() => editor.chain().focus().toggleBold().run()}
      />
      <ToolbarButton
        label="Italic"
        icon="format_italic"
        active={editor.isActive("italic")}
        onClick={() => editor.chain().focus().toggleItalic().run()}
      />
      <span className={div} />
      <ToolbarButton
        label="Heading"
        icon="title"
        active={editor.isActive("heading", { level: 2 })}
        onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
      />
      <ToolbarButton
        label="Subheading"
        icon="text_fields"
        active={editor.isActive("heading", { level: 3 })}
        onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}
      />
      <span className={div} />
      <ToolbarButton
        label="Bulleted list"
        icon="format_list_bulleted"
        active={editor.isActive("bulletList")}
        onClick={() => editor.chain().focus().toggleBulletList().run()}
      />
      <ToolbarButton
        label="Numbered list"
        icon="format_list_numbered"
        active={editor.isActive("orderedList")}
        onClick={() => editor.chain().focus().toggleOrderedList().run()}
      />
      <ToolbarButton
        // "Blockquote", not "Quote" — the Blocks sidebar has a Pull quote block,
        // and these do different things. This reformats the current paragraph.
        label="Blockquote"
        icon="format_quote"
        active={editor.isActive("blockquote")}
        onClick={() => editor.chain().focus().toggleBlockquote().run()}
      />
      {advanced && (
        <>
          <span className={div} />
          <ToolbarButton
            label="Underline"
            icon="format_underlined"
            active={editor.isActive("underline")}
            onClick={() => editor.chain().focus().toggleUnderline().run()}
          />
          <ToolbarButton
            label="Strikethrough"
            icon="strikethrough_s"
            active={editor.isActive("strike")}
            onClick={() => editor.chain().focus().toggleStrike().run()}
          />
          <ToolbarButton
            label="Highlight"
            icon="ink_highlighter"
            active={editor.isActive("highlight")}
            onClick={() => editor.chain().focus().toggleHighlight().run()}
          />
          <ToolbarButton
            label="Link"
            icon="link"
            active={editor.isActive("link")}
            onClick={setLink}
          />
          <span className={div} />
          <ToolbarButton
            label="Align left"
            icon="format_align_left"
            active={editor.isActive({ textAlign: "left" })}
            onClick={() => editor.chain().focus().setTextAlign("left").run()}
          />
          <ToolbarButton
            label="Align center"
            icon="format_align_center"
            active={editor.isActive({ textAlign: "center" })}
            onClick={() => editor.chain().focus().setTextAlign("center").run()}
          />
          <ToolbarButton
            label="Align right"
            icon="format_align_right"
            active={editor.isActive({ textAlign: "right" })}
            onClick={() => editor.chain().focus().setTextAlign("right").run()}
          />
        </>
      )}
      {enableImages && (
        <>
          <span className={div} />
          <input
            ref={fileInputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp,image/gif"
            className="hidden"
            onChange={onPickImage}
          />
          <ToolbarButton
            label={uploading ? "Uploading image…" : "Insert image"}
            icon={uploading ? "hourglass_top" : "add_photo_alternate"}
            onClick={() => !uploading && fileInputRef.current?.click()}
          />
        </>
      )}
      {/*
        The YouTube, ChurchSuite and HTML buttons that used to sit here are now
        blocks in the Blocks sidebar (Video, ChurchSuite form, Custom embed).

        They never belonged in this toolbar: everything else here reformats text
        you've selected, whereas those three inserted a new object from nothing —
        which is exactly what the sidebar is for. As blocks they also became
        editable after insertion (the old ChurchSuite button baked the form code
        into the markup, so fixing a typo meant deleting and starting again), and
        the video and form embeds now sit behind the site's cookie-consent gate
        instead of loading third-party iframes unprompted.

        The `youtube` and `htmlEmbed` NODES are still registered below, so pages
        authored with the old buttons keep parsing and rendering unchanged.
      */}
      <span className={div} />
      <ToolbarButton
        label="Undo"
        icon="undo"
        onClick={() => editor.chain().focus().undo().run()}
      />
      <ToolbarButton
        label="Redo"
        icon="redo"
        onClick={() => editor.chain().focus().redo().run()}
      />
    </div>
  );
}

export default function RichTextEditor({
  value,
  onChange,
  placeholder,
  enableYouTube,
  enableHtmlEmbed,
  enableImages,
  advanced,
  fill,
  blocks,
  onEditor,
}: {
  value: string;
  onChange: (html: string) => void;
  placeholder?: string;
  enableYouTube?: boolean;
  enableHtmlEmbed?: boolean;
  enableImages?: boolean;
  advanced?: boolean;
  fill?: boolean;
  /**
   * Content blocks to admit. Adds schema and drop handling only — the blocks
   * UI is a separate sidebar owned by the parent, deliberately NOT part of this
   * toolbar. The toolbar's job is inline formatting; blocks are page furniture,
   * and mixing them makes both harder to find.
   *
   * Undefined (the default) leaves the editor byte-identical to before, which
   * is what keeps the non-post surfaces unaffected.
   */
  blocks?: AnyBlockDefinition[];
  /** Hands the editor instance to the parent, for the sidebar and inspector. */
  onEditor?: (editor: Editor | null) => void;
}) {
  // Nodes are built once per definition set. Rebuilding them would recreate the
  // schema and blow away the document.
  const blockExtensions = useMemo(() => {
    if (!blocks || blocks.length === 0) return [];
    return [BlockDocument, ...blocks.map(createBlockNode), UnknownBlock];
  }, [blocks]);

  const editor = useEditor({
    immediatelyRender: false,
    extensions: [
      StarterKit.configure({
        heading: { levels: [2, 3] },
        // BlockDocument replaces it — see components/admin/blocks/BlockDocument.ts
        ...(blockExtensions.length > 0 ? { document: false as const } : {}),
      }),
      ...blockExtensions,
      Placeholder.configure({
        placeholder: placeholder || "Describe the role…",
      }),
      ...(enableYouTube
        ? [
            Youtube.configure({
              controls: true,
              nocookie: true,
              modestBranding: true,
              width: 640,
              height: 360,
            }),
          ]
        : []),
      ...(enableHtmlEmbed ? [HtmlEmbed] : []),
      ...(enableImages
        ? [
            Image.configure({
              inline: false,
              allowBase64: false,
              HTMLAttributes: { class: "rounded-xl" },
            }),
          ]
        : []),
      ...(advanced
        ? [
            Underline,
            Highlight,
            Link.configure({
              openOnClick: false,
              autolink: true,
              HTMLAttributes: { rel: "noopener noreferrer", target: "_blank" },
            }),
            TextAlign.configure({ types: ["heading", "paragraph"] }),
          ]
        : []),
    ],
    content: value || "",
    editorProps: {
      attributes: {
        class: `rte-content overflow-auto px-4 py-3 text-sm text-destiny-grey/80 focus:outline-none ${
          fill ? "min-h-full flex-1" : "min-h-[220px] max-h-[420px]"
        }`,
      },
      // Returns false for anything that isn't a palette drag, leaving
      // ProseMirror's own drop handling (node moves, text) untouched.
      ...(blockExtensions.length > 0 ? { handleDrop: blockDropHandler } : {}),
    },
    onUpdate: ({ editor }) => {
      const html = editor.getHTML();
      // TipTap emits "<p></p>" for an empty doc — normalise to "".
      onChange(html === "<p></p>" ? "" : html);
    },
  });

  // Seed the editor once, when it is first created (e.g. opening the modal on a
  // different role).
  //
  // DO NOT add `value` to the dependency array, and do not "fix" the missing
  // dep. The parent re-renders with a new `value` on every keystroke — that's
  // what `onChange` above feeds it — so a `value` dep is an infinite loop, and
  // even a guarded version would call `setContent` mid-edit. `setContent`
  // rebuilds the whole document: it destroys and recreates every React node
  // view, drops the current selection, and wipes undo history. This effect
  // running exactly once per editor instance is the behaviour we want.
  //
  // If genuine external sync is ever needed, gate it on a ref holding the last
  // HTML emitted by `onUpdate` rather than comparing against `value`.
  useEffect(() => {
    if (editor && value !== editor.getHTML() && value !== "") {
      editor.commands.setContent(value);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editor]);

  // Publish the instance so a parent can drive the blocks sidebar and inspector.
  // Kept in an effect (not render) so the parent's setState never fires during
  // this component's render pass.
  const onEditorRef = useRef(onEditor);
  onEditorRef.current = onEditor;
  useEffect(() => {
    onEditorRef.current?.(editor ?? null);
    return () => onEditorRef.current?.(null);
  }, [editor]);

  if (!editor) {
    return (
      <div className="min-h-[260px] rounded-xl border border-black/10 bg-white" />
    );
  }

  return (
    <div
      className={`overflow-hidden border border-black/10 bg-white focus-within:border-destiny-orange/50 focus-within:ring-2 focus-within:ring-destiny-orange/15 ${
        fill
          ? "flex h-full flex-col rounded-2xl"
          : "rounded-xl"
      }`}
    >
      <div className={fill ? "sticky top-0 z-10" : undefined}>
        <Toolbar editor={editor} enableImages={enableImages} advanced={advanced} />
      </div>
      <EditorContent
        editor={editor}
        className={fill ? "flex min-h-0 flex-1 flex-col" : undefined}
      />
    </div>
  );
}
