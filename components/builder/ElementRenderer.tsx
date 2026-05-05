"use client";

import Image from "next/image";
import type { BuilderElement } from "@/lib/builder/types";
import { layoutToClasses } from "@/lib/builder/layout";
import { BRAND_COMPONENTS } from "./BrandComponentRegistry";

type Props = {
  element: BuilderElement;
  selectedId?: string | null;
  onSelect?: (id: string) => void;
  editing?: boolean;
};

export default function ElementRenderer({ element, selectedId, onSelect, editing }: Props) {
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
            ? "outline outline-2 outline-destiny-orange outline-offset-2"
            : "hover:outline hover:outline-2 hover:outline-destiny-orange/40 hover:outline-offset-2"
        } ${layoutClass}`,
      }
    : { className: layoutClass };

  const inner = renderInner(element, selectedId, onSelect, editing);

  return (
    <div {...wrapperProps} data-element-id={element.id}>
      {editing && isSelected && (
        <span className="pointer-events-none absolute -top-6 left-0 z-10 rounded-md bg-destiny-orange px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-white">
          {element.type}
        </span>
      )}
      {inner}
    </div>
  );
}

function renderInner(
  element: BuilderElement,
  selectedId?: string | null,
  onSelect?: (id: string) => void,
  editing?: boolean,
): React.ReactNode {
  const { type, props, children = [] } = element;

  // Brand components — render as-is (read-only in canvas)
  const BrandComp = BRAND_COMPONENTS[type];
  if (BrandComp) {
    if (editing) {
      // Wrap in pointer-events:none so clicks reach the wrapper for selection
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
      return <Tag className={`${sizes[level] || sizes[2]} text-destiny-grey`}>{content}</Tag>;
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
      const bgClass =
        bg === "grey" ? "bg-[#f5f7fa]" : bg === "dark" ? "bg-destiny-grey text-white" : "bg-white";
      return (
        <section className={`w-full px-6 py-10 ${bgClass}`}>
          <div className="mx-auto flex max-w-6xl flex-col gap-4">
            {children.length === 0 && editing ? (
              <div className="flex h-24 items-center justify-center rounded-xl border-2 border-dashed border-black/10 text-sm text-destiny-grey/40">
                Drop elements here
              </div>
            ) : (
              children.map((child) => (
                <ElementRenderer
                  key={child.id}
                  element={child}
                  selectedId={selectedId}
                  onSelect={onSelect}
                  editing={editing}
                />
              ))
            )}
          </div>
        </section>
      );
    }

    case "container":
      return (
        <div className="flex flex-col gap-3 p-2">
          {children.length === 0 && editing ? (
            <div className="flex h-16 items-center justify-center rounded-lg border-2 border-dashed border-black/10 text-xs text-destiny-grey/40">
              Empty container
            </div>
          ) : (
            children.map((child) => (
              <ElementRenderer
                key={child.id}
                element={child}
                selectedId={selectedId}
                onSelect={onSelect}
                editing={editing}
              />
            ))
          )}
        </div>
      );

    case "columns": {
      const gap = (props.gap as number) || 4;
      return (
        <div className={`flex flex-col md:flex-row gap-${gap}`}>
          {children.map((child) => (
            <div key={child.id} className="flex-1">
              <ElementRenderer
                element={child}
                selectedId={selectedId}
                onSelect={onSelect}
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
