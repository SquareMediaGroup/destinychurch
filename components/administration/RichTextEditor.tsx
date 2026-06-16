"use client";

import { useEditor, EditorContent, type Editor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Placeholder from "@tiptap/extension-placeholder";
import Youtube from "@tiptap/extension-youtube";
import Link from "@tiptap/extension-link";
import TextAlign from "@tiptap/extension-text-align";
import Underline from "@tiptap/extension-underline";
import Highlight from "@tiptap/extension-highlight";
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
  advanced,
}: {
  editor: Editor;
  enableYouTube?: boolean;
  enableHtmlEmbed?: boolean;
  advanced?: boolean;
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

  function setLink() {
    if (editor.isActive("link")) {
      editor.chain().focus().extendMarkRange("link").unsetLink().run();
      return;
    }
    const prev = (editor.getAttributes("link").href as string) || "";
    const url = window.prompt("Link URL", prev);
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
        label="Quote"
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
  advanced,
  fill,
}: {
  value: string;
  onChange: (html: string) => void;
  placeholder?: string;
  enableYouTube?: boolean;
  enableHtmlEmbed?: boolean;
  advanced?: boolean;
  fill?: boolean;
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
    <div
      className={`overflow-hidden border border-black/10 bg-white focus-within:border-destiny-orange/50 focus-within:ring-2 focus-within:ring-destiny-orange/15 ${
        fill
          ? "flex h-full flex-col rounded-2xl"
          : "rounded-xl"
      }`}
    >
      <div className={fill ? "sticky top-0 z-10" : undefined}>
        <Toolbar
          editor={editor}
          enableYouTube={enableYouTube}
          enableHtmlEmbed={enableHtmlEmbed}
          advanced={advanced}
        />
      </div>
      <EditorContent
        editor={editor}
        className={fill ? "flex min-h-0 flex-1 flex-col" : undefined}
      />
    </div>
  );
}
