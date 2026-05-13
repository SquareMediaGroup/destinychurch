"use client";

import React, { useCallback, memo } from "react";
import { useStudio } from "@/packages/studio-engine/src/store";
import type { StudioNode, NodeId } from "@/packages/studio-schema/src/types";
import { resolveNodeStyle } from "@/packages/studio-renderer/src/resolveStyle";
import { resolveNodeLayout } from "@/packages/studio-renderer/src/resolveLayout";
import { InlineEditor } from "./InlineEditor";

type NodeRendererProps = {
  nodeId: NodeId;
  editable?: boolean;
};

export const CanvasNodeRenderer = memo(function CanvasNodeRenderer({
  nodeId,
  editable = true,
}: NodeRendererProps) {
  const node = useStudio((s) => s.document.nodes[nodeId]);
  const tokens = useStudio((s) => s.document.tokens);
  const editingId = useStudio((s) => s.editingId);
  const activeBreakpoint = useStudio((s) => s.activeBreakpoint);

  const setHovered = useStudio((s) => s.setHovered);
  const setEditing = useStudio((s) => s.setEditing);

  const isEditing = editingId === nodeId;

  const handleDoubleClick = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation();
      if (node.type === "text" || node.type === "heading" || node.type === "richtext") {
        setEditing(nodeId);
      }
    },
    [nodeId, node?.type, setEditing]
  );

  const handleMouseEnter = useCallback(() => {
    if (editable) setHovered(nodeId);
  }, [nodeId, editable, setHovered]);

  const handleMouseLeave = useCallback(() => {
    if (editable) setHovered(null);
  }, [editable, setHovered]);

  if (!node) return null;

  const layoutStyle = resolveNodeLayout(node.layout, activeBreakpoint, node.responsive);
  const visualStyle = resolveNodeStyle(node.style, tokens, activeBreakpoint, node.responsive);

  const combinedStyle: React.CSSProperties = {
    ...layoutStyle,
    ...visualStyle,
    position: node.layout.mode === "absolute" ? "absolute" : "relative",
    boxSizing: "border-box",
    // Selection/hover visuals rendered by Overlay canvas — no inline outlines
    cursor: editable ? "default" : undefined,
    userSelect: isEditing ? "text" : "none",
    minHeight: node.children?.length === 0 ? 40 : undefined,
  };

  if (node.hidden) {
    combinedStyle.display = "none";
  }

  return (
    <div
      data-node-id={nodeId}
      data-node-type={node.type}
      className="studio-node"
      style={combinedStyle}
      onDoubleClick={editable ? handleDoubleClick : undefined}
      onMouseEnter={editable ? handleMouseEnter : undefined}
      onMouseLeave={editable ? handleMouseLeave : undefined}
    >
      <NodeContent node={node} isEditing={isEditing} />
      {node.children?.map((childId) => (
        <CanvasNodeRenderer
          key={childId}
          nodeId={childId}
          editable={editable}
        />
      ))}
    </div>
  );
});

const NodeContent = memo(function NodeContent({
  node,
  isEditing,
}: {
  node: StudioNode;
  isEditing: boolean;
}) {
  const closeEditor = () => useStudio.getState().setEditing(null);

  switch (node.props._type) {
    case "text":
      return isEditing ? (
        <InlineEditor
          nodeId={node.id}
          content={node.props.content}
          onClose={closeEditor}
        />
      ) : (
        <p style={{ margin: 0 }}>{node.props.content}</p>
      );

    case "heading": {
      const level = node.props.level;
      const headingStyle = { margin: 0 };
      if (isEditing) {
        return (
          <InlineEditor
            nodeId={node.id}
            content={node.props.content}
            onClose={closeEditor}
          />
        );
      }
      const textContent = node.props.content;
      if (level === 1) return <h1 style={headingStyle}>{textContent}</h1>;
      if (level === 2) return <h2 style={headingStyle}>{textContent}</h2>;
      if (level === 3) return <h3 style={headingStyle}>{textContent}</h3>;
      if (level === 4) return <h4 style={headingStyle}>{textContent}</h4>;
      if (level === 5) return <h5 style={headingStyle}>{textContent}</h5>;
      return <h6 style={headingStyle}>{textContent}</h6>;
    }

    case "richtext":
      return isEditing ? (
        <InlineEditor
          nodeId={node.id}
          content={node.props.html}
          isRichText
          onClose={closeEditor}
        />
      ) : (
        <div
          dangerouslySetInnerHTML={{ __html: node.props.html }}
          style={{ margin: 0 }}
        />
      );

    case "image":
      return (
        <img
          src={node.props.src}
          alt={node.props.alt ?? ""}
          style={{
            width: "100%",
            height: "100%",
            objectFit: node.props.objectFit ?? "cover",
            objectPosition: node.props.objectPosition,
            display: "block",
          }}
          draggable={false}
        />
      );

    case "button":
      return (
        <button
          style={{
            padding: "8px 16px",
            borderRadius: 6,
            border: node.props.variant === "outline" ? "1px solid currentColor" : "none",
            background:
              node.props.variant === "ghost" || node.props.variant === "outline" || node.props.variant === "link"
                ? "transparent"
                : "#2563eb",
            color:
              node.props.variant === "ghost" || node.props.variant === "outline"
                ? "#2563eb"
                : "#fff",
            cursor: "pointer",
            fontSize: node.props.size === "lg" ? 18 : node.props.size === "sm" ? 13 : 15,
            fontWeight: 500,
            textDecoration: node.props.variant === "link" ? "underline" : "none",
            pointerEvents: "none",
          }}
        >
          {node.props.label}
        </button>
      );

    case "icon":
      return (
        <span
          className={
            node.props.icon.lib === "material"
              ? "material-symbols-rounded"
              : undefined
          }
          style={{
            fontSize: node.props.icon.size ?? 24,
            lineHeight: 1,
          }}
        >
          {node.props.icon.name}
        </span>
      );

    case "spacer":
      return (
        <div
          style={{
            height: node.props.size,
            width: "100%",
            background: "repeating-linear-gradient(45deg, transparent, transparent 4px, rgba(100,100,100,0.1) 4px, rgba(100,100,100,0.1) 5px)",
          }}
        />
      );

    case "divider":
      return (
        <hr
          style={{
            border: "none",
            borderTop: "1px solid rgba(0,0,0,0.1)",
            margin: 0,
            width: "100%",
          }}
        />
      );

    case "card":
      return null;

    case "frame":
      return null;

    default:
      return null;
  }
});

// EditableText replaced by InlineEditor (TipTap)
