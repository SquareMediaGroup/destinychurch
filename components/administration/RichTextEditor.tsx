"use client";

import { useEditor, EditorContent, type Editor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Placeholder from "@tiptap/extension-placeholder";
import Youtube from "@tiptap/extension-youtube";
import { Node } from "@tiptap/core";
import { useEffect } from "react";

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
        ({ commands }: any) => {
          return commands.insertContent({
            type: this.name,
            attrs: options,
          });
        },
    } as any;
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
  enableYouTube,
  enableHtmlEmbed,
}: {
  editor: Editor;
  enableYouTube?: boolean;
  enableHtmlEmbed?: boolean;
}) {
  const div = "mx-1 h-5 w-px bg-black/10";

  function addYouTube() {
    const url = window.prompt("Paste a YouTube video URL");
    if (!url) return;
    editor.commands.setYoutubeVideo({ src: url.trim() });
  }

  function addHtmlEmbed() {
    const html = window.prompt("Paste HTML embed code:");
    if (!html) return;
    (editor.commands as any).setHtmlEmbed({ html: html.trim() });
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
        label="Quote"
        icon="format_quote"
        active={editor.isActive("blockquote")}
        onClick={() => editor.chain().focus().toggleBlockquote().run()}
      />
      {enableYouTube && (
        <>
          <span className={div} />
          <ToolbarButton
            label="Embed YouTube video"
            icon="smart_display"
            active={editor.isActive("youtube")}
            onClick={addYouTube}
          />
        </>
      )}
      {enableHtmlEmbed && (
        <>
          <span className={div} />
          <ToolbarButton
            label="Embed HTML"
            icon="code"
            active={editor.isActive("htmlEmbed")}
            onClick={addHtmlEmbed}
          />
        </>
      )}
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
}: {
  value: string;
  onChange: (html: string) => void;
  placeholder?: string;
  enableYouTube?: boolean;
  enableHtmlEmbed?: boolean;
}) {
  const editor = useEditor({
    immediatelyRender: false,
    extensions: [
      StarterKit.configure({
        heading: { levels: [2, 3] },
      }),
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
    ],
    content: value || "",
    editorProps: {
      attributes: {
        class:
          "rte-content min-h-[220px] max-h-[420px] overflow-auto px-4 py-3 text-sm text-destiny-grey/80 focus:outline-none",
      },
    },
    onUpdate: ({ editor }) => {
      const html = editor.getHTML();
      // TipTap emits "<p></p>" for an empty doc — normalise to "".
      onChange(html === "<p></p>" ? "" : html);
    },
  });

  // Keep the editor in sync if the value is replaced from outside (e.g. opening
  // the modal on a different role).
  useEffect(() => {
    if (editor && value !== editor.getHTML() && value !== "") {
      editor.commands.setContent(value);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editor]);

  if (!editor) {
    return (
      <div className="min-h-[260px] rounded-xl border border-black/10 bg-white" />
    );
  }

  return (
    <div className="overflow-hidden rounded-xl border border-black/10 bg-white focus-within:border-destiny-orange/50 focus-within:ring-2 focus-within:ring-destiny-orange/15">
      <Toolbar editor={editor} enableYouTube={enableYouTube} enableHtmlEmbed={enableHtmlEmbed} />
      <EditorContent editor={editor} />
    </div>
  );
}
