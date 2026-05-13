"use client";

import React, { useCallback, useEffect, useRef } from "react";
import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Placeholder from "@tiptap/extension-placeholder";
import { useStudio } from "@/packages/studio-engine/src/store";
import type { NodeId } from "@/packages/studio-schema/src/types";

type InlineEditorProps = {
  nodeId: NodeId;
  content: string;
  isRichText?: boolean;
  onClose: () => void;
};

/**
 * TipTap-based inline text editor that replaces contentEditable.
 * Supports rich text formatting with a floating toolbar.
 */
export function InlineEditor({
  nodeId,
  content,
  isRichText = false,
  onClose,
}: InlineEditorProps) {
  const updateNode = useStudio((s) => s.updateNode);
  const transact = useStudio((s) => s.transact);
  const toolbarRef = useRef<HTMLDivElement>(null);

  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: isRichText ? { levels: [1, 2, 3, 4, 5, 6] } : false,
        bulletList: isRichText ? {} : false,
        orderedList: isRichText ? {} : false,
        blockquote: isRichText ? {} : false,
        codeBlock: false,
        horizontalRule: false,
      }),
      Placeholder.configure({
        placeholder: "Type something...",
      }),
    ],
    content: isRichText ? content : `<p>${content}</p>`,
    autofocus: "end",
    editorProps: {
      attributes: {
        style: "outline: none; min-width: 4px; cursor: text;",
      },
      handleKeyDown: (_view, event) => {
        // Stop propagation so keyboard shortcuts don't fire
        event.stopPropagation();

        if (event.key === "Escape") {
          commitAndClose();
          return true;
        }

        // For plain text, Enter commits
        if (!isRichText && event.key === "Enter" && !event.shiftKey) {
          commitAndClose();
          return true;
        }

        return false;
      },
    },
    onBlur: () => {
      // Small delay to allow clicking toolbar buttons
      setTimeout(() => {
        if (!toolbarRef.current?.contains(document.activeElement)) {
          commitAndClose();
        }
      }, 150);
    },
  });

  const commitAndClose = useCallback(() => {
    if (!editor) return;

    const node = useStudio.getState().document.nodes[nodeId];
    if (!node) return;

    if (isRichText) {
      // Store as HTML
      const html = editor.getHTML();
      transact(
        (nodes) => {
          const n = nodes[nodeId];
          if (n && n.props._type === "richtext") {
            n.props.html = html;
          }
        },
        { label: "Edit rich text" }
      );
    } else {
      // Store as plain text
      const text = editor.getText();
      transact(
        (nodes) => {
          const n = nodes[nodeId];
          if (n && "content" in n.props) {
            (n.props as { content: string }).content = text;
          }
        },
        { label: "Edit text" }
      );
    }

    onClose();
  }, [editor, nodeId, isRichText, transact, onClose]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      editor?.destroy();
    };
  }, [editor]);

  if (!editor) return null;

  return (
    <div
      style={{ position: "relative" }}
      onPointerDown={(e) => e.stopPropagation()}
    >
      {/* Floating format toolbar for rich text */}
      {isRichText && (
        <div
          ref={toolbarRef}
          style={{
            position: "absolute",
            bottom: "calc(100% + 6px)",
            left: 0,
            display: "flex",
            gap: 1,
            background: "#1e1e1e",
            border: "1px solid #333",
            borderRadius: 6,
            padding: 2,
            zIndex: 1000,
            boxShadow: "0 4px 12px rgba(0,0,0,0.4)",
          }}
        >
          <FormatButton
            icon="format_bold"
            active={editor.isActive("bold")}
            onClick={() => editor.chain().focus().toggleBold().run()}
            title="Bold (Cmd+B)"
          />
          <FormatButton
            icon="format_italic"
            active={editor.isActive("italic")}
            onClick={() => editor.chain().focus().toggleItalic().run()}
            title="Italic (Cmd+I)"
          />
          <FormatButton
            icon="strikethrough_s"
            active={editor.isActive("strike")}
            onClick={() => editor.chain().focus().toggleStrike().run()}
            title="Strikethrough"
          />

          <div style={{ width: 1, background: "#333", margin: "2px 2px" }} />

          <FormatButton
            icon="format_list_bulleted"
            active={editor.isActive("bulletList")}
            onClick={() => editor.chain().focus().toggleBulletList().run()}
            title="Bullet list"
          />
          <FormatButton
            icon="format_list_numbered"
            active={editor.isActive("orderedList")}
            onClick={() => editor.chain().focus().toggleOrderedList().run()}
            title="Numbered list"
          />
          <FormatButton
            icon="format_quote"
            active={editor.isActive("blockquote")}
            onClick={() => editor.chain().focus().toggleBlockquote().run()}
            title="Blockquote"
          />
        </div>
      )}

      <EditorContent editor={editor} />
    </div>
  );
}

function FormatButton({
  icon,
  active,
  onClick,
  title,
}: {
  icon: string;
  active: boolean;
  onClick: () => void;
  title: string;
}) {
  return (
    <button
      onClick={(e) => {
        e.preventDefault();
        e.stopPropagation();
        onClick();
      }}
      onMouseDown={(e) => e.preventDefault()} // prevent blur
      title={title}
      style={{
        width: 28,
        height: 28,
        borderRadius: 4,
        border: "none",
        background: active ? "#4f8eff" : "transparent",
        color: active ? "#fff" : "#aaa",
        cursor: "pointer",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 0,
      }}
    >
      <span className="material-symbols-rounded" style={{ fontSize: 16 }}>
        {icon}
      </span>
    </button>
  );
}
