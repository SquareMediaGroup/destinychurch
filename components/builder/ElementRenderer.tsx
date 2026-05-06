"use client";

import Image from "next/image";
import { useEffect, useRef, useState } from "react";
import type { BuilderElement, ElementType } from "@/lib/builder/types";
import { layoutToClasses } from "@/lib/builder/layout";
import { BRAND_COMPONENTS } from "./BrandComponentRegistry";

const GAP_CLASS: Record<number, string> = {
  0: "gap-0", 1: "gap-1", 2: "gap-2", 3: "gap-3", 4: "gap-4",
  5: "gap-5", 6: "gap-6", 7: "gap-7", 8: "gap-8", 9: "gap-9",
  10: "gap-10", 11: "gap-11", 12: "gap-12",
};

type Props = {
  element: BuilderElement;
  selectedId?: string | null;
  onSelect?: (id: string) => void;
  onDropInto?: (parentId: string, type: ElementType) => void;
  onUpdate?: (id: string, patch: Partial<BuilderElement>) => void;
  onDelete?: (id: string) => void;
  onDuplicate?: (id: string) => void;
  editing?: boolean;
};

export default function ElementRenderer({
  element,
  selectedId,
  onSelect,
  onDropInto,
  onUpdate,
  onDelete,
  onDuplicate,
  editing,
}: Props) {
  const isSelected = editing && selectedId === element.id;
  const layoutClass = layoutToClasses(element.layout);

  const wrapperProps = editing
    ? {
        onClick: (e: React.MouseEvent) => {
          e.stopPropagation();
          onSelect?.(element.id);
        },
        className: `relative cursor-pointer transition-all ${
          isSelected
            ? "outline outline-1 outline-destiny-orange outline-offset-[-1px]"
            : "hover:outline hover:outline-1 hover:outline-destiny-orange/30 hover:outline-offset-[-1px]"
        } ${layoutClass}`,
      }
    : { className: layoutClass };

  const inner = renderInner(element, selectedId, onSelect, onDropInto, onUpdate, onDelete, onDuplicate, editing);

  return (
    <div {...wrapperProps} data-element-id={element.id}>
      {editing && isSelected && (
        <FloatingActions
          label={element.type}
          onDuplicate={() => onDuplicate?.(element.id)}
          onDelete={() => onDelete?.(element.id)}
        />
      )}
      {inner}
    </div>
  );
}

function FloatingActions({
  label,
  onDuplicate,
  onDelete,
}: {
  label: string;
  onDuplicate: () => void;
  onDelete: () => void;
}) {
  return (
    <div className="pointer-events-auto absolute -top-7 left-0 z-20 flex items-center gap-px rounded-md bg-destiny-orange text-white shadow-lg">
      <span className="px-2 py-1 text-[10px] font-bold uppercase tracking-wide">{label}</span>
      <div className="h-4 w-px bg-white/20" />
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          onDuplicate();
        }}
        className="flex h-6 w-6 items-center justify-center hover:bg-white/15"
        title="Duplicate"
      >
        <span className="material-symbols-rounded text-[14px]">content_copy</span>
      </button>
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          onDelete();
        }}
        className="flex h-6 w-6 items-center justify-center rounded-r-md hover:bg-white/15"
        title="Delete"
      >
        <span className="material-symbols-rounded text-[14px]">delete</span>
      </button>
    </div>
  );
}

function InlineEditable({
  value,
  onChange,
  className,
  multiline,
  isSelected,
  asTag,
}: {
  value: string;
  onChange: (v: string) => void;
  className?: string;
  multiline?: boolean;
  isSelected: boolean;
  asTag?: "h1" | "h2" | "h3" | "h4" | "p";
}) {
  const ref = useRef<HTMLElement | null>(null);
  const [editingNow, setEditingNow] = useState(false);

  useEffect(() => {
    if (editingNow && ref.current) {
      ref.current.focus();
      // Move cursor to end
      const range = document.createRange();
      range.selectNodeContents(ref.current);
      range.collapse(false);
      const sel = window.getSelection();
      sel?.removeAllRanges();
      sel?.addRange(range);
    }
  }, [editingNow]);

  function handleBlur() {
    if (!ref.current) return;
    const next = multiline ? ref.current.innerText : ref.current.innerText.replace(/\n+/g, " ");
    if (next !== value) onChange(next);
    setEditingNow(false);
  }

  function handleKey(e: React.KeyboardEvent) {
    if (!multiline && e.key === "Enter") {
      e.preventDefault();
      ref.current?.blur();
    }
    if (e.key === "Escape") {
      e.preventDefault();
      if (ref.current) ref.current.innerText = value;
      ref.current?.blur();
    }
  }

  const Tag = (asTag || "p") as keyof React.JSX.IntrinsicElements;

  return (
    <Tag
      ref={ref as React.Ref<never>}
      contentEditable={editingNow}
      suppressContentEditableWarning
      onDoubleClick={(e: React.MouseEvent) => {
        if (!isSelected) return;
        e.stopPropagation();
        setEditingNow(true);
      }}
      onBlur={handleBlur}
      onKeyDown={handleKey}
      className={`${className || ""} ${editingNow ? "outline-none ring-1 ring-destiny-orange/50 rounded" : ""}`}
    >
      {value}
    </Tag>
  );
}

function renderInner(
  element: BuilderElement,
  selectedId: string | null | undefined,
  onSelect: ((id: string) => void) | undefined,
  onDropInto: ((parentId: string, type: ElementType) => void) | undefined,
  onUpdate: ((id: string, patch: Partial<BuilderElement>) => void) | undefined,
  onDelete: ((id: string) => void) | undefined,
  onDuplicate: ((id: string) => void) | undefined,
  editing?: boolean,
): React.ReactNode {
  const { type, props, children = [] } = element;
  const isSelected = editing && selectedId === element.id;

  // Brand components — render as-is (read-only in canvas)
  const BrandComp = BRAND_COMPONENTS[type];
  if (BrandComp) {
    if (editing) {
      return (
        <div className="pointer-events-none">
          <BrandComp {...(props as Record<string, unknown>)} />
        </div>
      );
    }
    return <BrandComp {...(props as Record<string, unknown>)} />;
  }

  switch (type) {
    case "text": {
      const content = (props.content as string) || "";
      if (editing) {
        return (
          <InlineEditable
            value={content}
            onChange={(v) => onUpdate?.(element.id, { props: { ...props, content: v } })}
            className="whitespace-pre-line text-base leading-relaxed text-destiny-grey/80"
            multiline
            isSelected={!!isSelected}
            asTag="p"
          />
        );
      }
      return (
        <p className="whitespace-pre-line text-base leading-relaxed text-destiny-grey/80">
          {content}
        </p>
      );
    }

    case "heading": {
      const content = (props.content as string) || "";
      const level = (props.level as number) || 2;
      const sizes: Record<number, string> = {
        1: "text-4xl md:text-5xl font-black",
        2: "text-3xl md:text-4xl font-black",
        3: "text-2xl md:text-3xl font-bold",
        4: "text-xl md:text-2xl font-bold",
      };
      const Tag = `h${level}` as "h1" | "h2" | "h3" | "h4";
      const cls = `${sizes[level] || sizes[2]} text-destiny-grey`;
      if (editing) {
        return (
          <InlineEditable
            value={content}
            onChange={(v) => onUpdate?.(element.id, { props: { ...props, content: v } })}
            className={cls}
            isSelected={!!isSelected}
            asTag={Tag}
          />
        );
      }
      return <Tag className={cls}>{content}</Tag>;
    }

    case "image": {
      const src = (props.src as string) || "";
      const alt = (props.alt as string) || "";
      const aspect = (props.aspect as string) || "16/9";
      if (!src) {
        return (
          <div
            className="flex items-center justify-center rounded-xl border-2 border-dashed border-black/15 bg-[#f5f7fa] text-destiny-grey/40"
            style={{ aspectRatio: aspect }}
          >
            <span className="material-symbols-rounded text-4xl">image</span>
          </div>
        );
      }
      return (
        <div className="relative overflow-hidden rounded-xl bg-[#f5f7fa]" style={{ aspectRatio: aspect }}>
          <Image src={src} alt={alt} fill unoptimized className="object-cover" />
        </div>
      );
    }

    case "button": {
      const label = (props.label as string) || "Button";
      const href = (props.href as string) || "#";
      const variant = (props.variant as string) || "primary";
      const cls =
        variant === "primary"
          ? "bg-destiny-orange text-white shadow-sm shadow-destiny-orange/20 hover:brightness-110"
          : variant === "secondary"
            ? "bg-destiny-grey text-white hover:brightness-110"
            : "border-2 border-destiny-grey text-destiny-grey hover:bg-destiny-grey hover:text-white";
      return (
        <a
          href={href}
          onClick={editing ? (e) => e.preventDefault() : undefined}
          className={`inline-flex items-center gap-2 rounded-xl px-6 py-2.5 text-sm font-bold transition ${cls}`}
        >
          {label}
          <span className="material-symbols-rounded text-base">arrow_forward</span>
        </a>
      );
    }

    case "spacer": {
      const height = (props.height as number) || 32;
      return <div style={{ height: `${height}px` }} />;
    }

    case "divider":
      return <hr className="border-t border-black/10" />;

    case "section": {
      const bg = (props.background as string) || "white";
      const align = (props.align as string) || "stretch";
      const bgClass =
        bg === "grey" ? "bg-[#f5f7fa]" : bg === "dark" ? "bg-destiny-grey text-white" : "bg-white";
      const alignClass =
        align === "center" ? "items-center" : align === "end" ? "items-end" : "items-stretch";
      return (
        <section className={`w-full px-6 py-10 ${bgClass}`}>
          <div className={`mx-auto flex max-w-6xl flex-col gap-4 ${alignClass}`}>
            <DropZone parentId={element.id} onDropInto={onDropInto} editing={editing}>
              {children.length === 0 && editing ? (
                <EmptyDropHint label="Drop elements into section" />
              ) : (
                children.map((child) => (
                  <ElementRenderer
                    key={child.id}
                    element={child}
                    selectedId={selectedId}
                    onSelect={onSelect}
                    onDropInto={onDropInto}
                    onUpdate={onUpdate}
                    onDelete={onDelete}
                    onDuplicate={onDuplicate}
                    editing={editing}
                  />
                ))
              )}
            </DropZone>
          </div>
        </section>
      );
    }

    case "container":
      return (
        <DropZone parentId={element.id} onDropInto={onDropInto} editing={editing}>
          <div className="flex flex-col gap-3 p-2">
            {children.length === 0 && editing ? (
              <EmptyDropHint label="Empty container" small />
            ) : (
              children.map((child) => (
                <ElementRenderer
                  key={child.id}
                  element={child}
                  selectedId={selectedId}
                  onSelect={onSelect}
                  onDropInto={onDropInto}
                  onUpdate={onUpdate}
                  onDelete={onDelete}
                  onDuplicate={onDuplicate}
                  editing={editing}
                />
              ))
            )}
          </div>
        </DropZone>
      );

    case "columns": {
      const gap = (props.gap as number) || 4;
      const direction = (props.direction as string) || "row";
      const align = (props.align as string) || "stretch";
      const justify = (props.justify as string) || "start";
      const dirClass = direction === "column" ? "flex-col" : "flex-col md:flex-row";
      const alignClass =
        align === "center" ? "items-center" : align === "end" ? "items-end" : "items-stretch";
      const justifyClass =
        justify === "center"
          ? "justify-center"
          : justify === "end"
            ? "justify-end"
            : justify === "between"
              ? "justify-between"
              : justify === "around"
                ? "justify-around"
                : "justify-start";
      const gapClass = GAP_CLASS[gap] || "gap-4";
      return (
        <div className={`flex ${dirClass} ${gapClass} ${alignClass} ${justifyClass}`}>
          {children.map((child) => (
            <div key={child.id} className="flex-1">
              <ElementRenderer
                element={child}
                selectedId={selectedId}
                onSelect={onSelect}
                onDropInto={onDropInto}
                onUpdate={onUpdate}
                onDelete={onDelete}
                onDuplicate={onDuplicate}
                editing={editing}
              />
            </div>
          ))}
        </div>
      );
    }

    default:
      return (
        <div className="rounded-lg bg-yellow-50 px-4 py-2 text-xs text-yellow-700">
          Unknown element: {type}
        </div>
      );
  }
}

function DropZone({
  parentId,
  onDropInto,
  editing,
  children,
}: {
  parentId: string;
  onDropInto?: (parentId: string, type: ElementType) => void;
  editing?: boolean;
  children: React.ReactNode;
}) {
  const [hover, setHover] = useState(false);

  if (!editing || !onDropInto) return <>{children}</>;

  function handleDragOver(e: React.DragEvent) {
    if (!e.dataTransfer.types.includes("application/x-builder-element")) return;
    e.preventDefault();
    e.stopPropagation();
    e.dataTransfer.dropEffect = "copy";
    setHover(true);
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    e.stopPropagation();
    setHover(false);
    const type = e.dataTransfer.getData("application/x-builder-element") as ElementType;
    if (type) onDropInto!(parentId, type);
  }

  return (
    <div
      onDragOver={handleDragOver}
      onDragLeave={() => setHover(false)}
      onDrop={handleDrop}
      className={hover ? "rounded-lg outline outline-2 outline-destiny-orange/60 outline-dashed" : ""}
    >
      {children}
    </div>
  );
}

function EmptyDropHint({ label, small }: { label: string; small?: boolean }) {
  return (
    <div
      className={`flex items-center justify-center rounded-xl border-2 border-dashed border-black/10 text-destiny-grey/40 ${
        small ? "h-16 text-xs" : "h-24 text-sm"
      }`}
    >
      {label}
    </div>
  );
}
