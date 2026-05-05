"use client";

import type { BuilderElement, LayoutProps } from "@/lib/builder/types";
import { getElementMeta } from "@/lib/builder/registry";

type Props = {
  element: BuilderElement | null;
  onUpdate: (id: string, patch: Partial<BuilderElement>) => void;
  onDelete: (id: string) => void;
  onDuplicate: (id: string) => void;
};

export default function PropertiesPanel({ element, onUpdate, onDelete, onDuplicate }: Props) {
  if (!element) {
    return (
      <div className="flex h-full flex-col items-center justify-center p-6 text-center">
        <span className="material-symbols-rounded text-3xl text-destiny-grey/20">
          tune
        </span>
        <p className="mt-2 text-sm font-bold text-destiny-grey/40">No element selected</p>
        <p className="mt-1 text-xs text-destiny-grey/40">
          Click an element on the canvas to edit
        </p>
      </div>
    );
  }

  const meta = getElementMeta(element.type);

  function setProp(key: string, value: unknown) {
    onUpdate(element!.id, { props: { ...element!.props, [key]: value } });
  }

  function setLayout(key: keyof LayoutProps, value: unknown) {
    onUpdate(element!.id, {
      layout: { ...(element!.layout || {}), [key]: value },
    });
  }

  return (
    <div className="flex h-full flex-col bg-white">
      <div className="border-b border-black/5 px-4 py-3">
        <p className="text-[10px] font-bold uppercase tracking-widest text-destiny-grey/40">
          Properties
        </p>
        <div className="mt-1 flex items-center gap-2">
          <span className="material-symbols-rounded text-base text-destiny-orange">
            {meta?.icon || "tune"}
          </span>
          <p className="text-sm font-bold text-destiny-grey">{meta?.label || element.type}</p>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4">
        {/* Content props */}
        <ContentEditor element={element} setProp={setProp} />

        {/* Layout */}
        <div className="mt-6 border-t border-black/5 pt-4">
          <p className="mb-3 text-[10px] font-bold uppercase tracking-widest text-destiny-grey/40">
            Layout
          </p>
          <Field label="Width">
            <select
              value={element.layout?.width ?? "full"}
              onChange={(e) => setLayout("width", e.target.value)}
              className={inputCls}
            >
              <option value="full">Full</option>
              <option value="3/4">3/4</option>
              <option value="2/3">2/3</option>
              <option value="1/2">1/2</option>
              <option value="1/3">1/3</option>
              <option value="1/4">1/4</option>
              <option value="auto">Auto</option>
            </select>
          </Field>
          <Field label="Align">
            <select
              value={element.layout?.align ?? "left"}
              onChange={(e) => setLayout("align", e.target.value)}
              className={inputCls}
            >
              <option value="left">Left</option>
              <option value="center">Center</option>
              <option value="right">Right</option>
            </select>
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Margin top">
              <NumberStepper
                value={element.layout?.marginTop ?? 0}
                onChange={(v) => setLayout("marginTop", v)}
                step={1}
                max={24}
              />
            </Field>
            <Field label="Margin bottom">
              <NumberStepper
                value={element.layout?.marginBottom ?? 0}
                onChange={(v) => setLayout("marginBottom", v)}
                step={1}
                max={24}
              />
            </Field>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Padding X">
              <NumberStepper
                value={element.layout?.paddingX ?? 0}
                onChange={(v) => setLayout("paddingX", v)}
                step={1}
                max={12}
              />
            </Field>
            <Field label="Padding Y">
              <NumberStepper
                value={element.layout?.paddingY ?? 0}
                onChange={(v) => setLayout("paddingY", v)}
                step={1}
                max={12}
              />
            </Field>
          </div>
        </div>

        {/* Actions */}
        <div className="mt-6 border-t border-black/5 pt-4">
          <div className="flex flex-col gap-2">
            <button
              type="button"
              onClick={() => onDuplicate(element.id)}
              className="flex items-center gap-2 rounded-lg border border-black/10 px-3 py-2 text-sm font-bold text-destiny-grey transition hover:bg-[#f5f7fa]"
            >
              <span className="material-symbols-rounded text-base">content_copy</span>
              Duplicate
            </button>
            <button
              type="button"
              onClick={() => onDelete(element.id)}
              className="flex items-center gap-2 rounded-lg border border-red-200 px-3 py-2 text-sm font-bold text-red-600 transition hover:bg-red-50"
            >
              <span className="material-symbols-rounded text-base">delete</span>
              Delete
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function ContentEditor({
  element,
  setProp,
}: {
  element: BuilderElement;
  setProp: (k: string, v: unknown) => void;
}) {
  const props = element.props;

  switch (element.type) {
    case "text":
      return (
        <Field label="Content">
          <textarea
            value={(props.content as string) || ""}
            onChange={(e) => setProp("content", e.target.value)}
            rows={4}
            className={`${inputCls} resize-none`}
          />
        </Field>
      );
    case "heading":
      return (
        <>
          <Field label="Heading text">
            <input
              type="text"
              value={(props.content as string) || ""}
              onChange={(e) => setProp("content", e.target.value)}
              className={inputCls}
            />
          </Field>
          <Field label="Level">
            <select
              value={(props.level as number) || 2}
              onChange={(e) => setProp("level", Number(e.target.value))}
              className={inputCls}
            >
              <option value={1}>H1</option>
              <option value={2}>H2</option>
              <option value={3}>H3</option>
              <option value={4}>H4</option>
            </select>
          </Field>
        </>
      );
    case "image":
      return (
        <>
          <Field label="Image URL">
            <input
              type="text"
              value={(props.src as string) || ""}
              onChange={(e) => setProp("src", e.target.value)}
              placeholder="https://… or /img/…"
              className={inputCls}
            />
          </Field>
          <Field label="Alt text">
            <input
              type="text"
              value={(props.alt as string) || ""}
              onChange={(e) => setProp("alt", e.target.value)}
              className={inputCls}
            />
          </Field>
          <Field label="Aspect ratio">
            <select
              value={(props.aspect as string) || "16/9"}
              onChange={(e) => setProp("aspect", e.target.value)}
              className={inputCls}
            >
              <option value="16/9">16:9</option>
              <option value="4/3">4:3</option>
              <option value="1/1">1:1 Square</option>
              <option value="3/4">3:4 Portrait</option>
              <option value="21/9">21:9 Cinematic</option>
            </select>
          </Field>
        </>
      );
    case "button":
      return (
        <>
          <Field label="Label">
            <input
              type="text"
              value={(props.label as string) || ""}
              onChange={(e) => setProp("label", e.target.value)}
              className={inputCls}
            />
          </Field>
          <Field label="Link">
            <input
              type="text"
              value={(props.href as string) || ""}
              onChange={(e) => setProp("href", e.target.value)}
              placeholder="/visit"
              className={inputCls}
            />
          </Field>
          <Field label="Style">
            <select
              value={(props.variant as string) || "primary"}
              onChange={(e) => setProp("variant", e.target.value)}
              className={inputCls}
            >
              <option value="primary">Primary (orange)</option>
              <option value="secondary">Secondary (grey)</option>
              <option value="outline">Outline</option>
            </select>
          </Field>
        </>
      );
    case "spacer":
      return (
        <Field label="Height (px)">
          <NumberStepper
            value={(props.height as number) || 32}
            onChange={(v) => setProp("height", v)}
            step={8}
            max={240}
          />
        </Field>
      );
    case "section":
      return (
        <Field label="Background">
          <select
            value={(props.background as string) || "white"}
            onChange={(e) => setProp("background", e.target.value)}
            className={inputCls}
          >
            <option value="white">White</option>
            <option value="grey">Light grey</option>
            <option value="dark">Dark</option>
          </select>
        </Field>
      );
    case "columns":
      return (
        <Field label="Gap">
          <NumberStepper
            value={(props.gap as number) || 4}
            onChange={(v) => setProp("gap", v)}
            step={1}
            max={12}
          />
        </Field>
      );
    case "divider":
    case "container":
      return (
        <p className="text-xs text-destiny-grey/50">No content properties for this element.</p>
      );
    default:
      // Brand component — pre-styled, fixed content
      return (
        <div className="rounded-lg bg-destiny-orange/5 px-3 py-2.5 text-xs text-destiny-grey/70">
          <span className="font-bold">Brand component</span> — content is managed
          by the underlying component. Use layout controls to position it.
        </div>
      );
  }
}

const inputCls =
  "w-full rounded-lg border border-black/10 px-3 py-2 text-sm text-destiny-grey placeholder:text-destiny-grey/30 focus:border-destiny-orange/50 focus:outline-none focus:ring-2 focus:ring-destiny-orange/20";

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="mb-3 block">
      <span className="mb-1 block text-xs font-bold text-destiny-grey/60">{label}</span>
      {children}
    </label>
  );
}

function NumberStepper({
  value,
  onChange,
  step = 1,
  max = 99,
}: {
  value: number;
  onChange: (v: number) => void;
  step?: number;
  max?: number;
}) {
  return (
    <div className="flex items-center rounded-lg border border-black/10">
      <button
        type="button"
        onClick={() => onChange(Math.max(0, value - step))}
        className="flex h-9 w-9 items-center justify-center text-destiny-grey/60 hover:bg-[#f5f7fa]"
      >
        <span className="material-symbols-rounded text-base">remove</span>
      </button>
      <input
        type="number"
        value={value}
        onChange={(e) => onChange(Math.max(0, Math.min(max, Number(e.target.value) || 0)))}
        className="w-full flex-1 border-x border-black/10 bg-transparent px-2 py-1.5 text-center text-sm text-destiny-grey focus:outline-none"
      />
      <button
        type="button"
        onClick={() => onChange(Math.min(max, value + step))}
        className="flex h-9 w-9 items-center justify-center text-destiny-grey/60 hover:bg-[#f5f7fa]"
      >
        <span className="material-symbols-rounded text-base">add</span>
      </button>
    </div>
  );
}
