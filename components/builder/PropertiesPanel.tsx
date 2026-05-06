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
      <div className="flex h-full flex-col items-center justify-center bg-zinc-900 p-6 text-center text-white/40">
        <span className="material-symbols-rounded text-2xl opacity-40">tune</span>
        <p className="mt-2 text-xs font-medium">Nothing selected</p>
        <p className="mt-0.5 text-[11px] opacity-60">Click an element on the canvas</p>
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
    <div className="flex h-full flex-col bg-zinc-900 text-zinc-100">
      <div className="flex items-center gap-2 border-b border-white/5 px-3 py-2.5">
        <span className="material-symbols-rounded text-[16px] text-destiny-orange">
          {meta?.icon || "tune"}
        </span>
        <p className="text-xs font-semibold text-white">{meta?.label || element.type}</p>
        <div className="ml-auto flex items-center gap-0.5">
          <button
            type="button"
            onClick={() => onDuplicate(element.id)}
            className="flex h-7 w-7 items-center justify-center rounded text-white/50 hover:bg-white/5 hover:text-white"
            title="Duplicate"
          >
            <span className="material-symbols-rounded text-[15px]">content_copy</span>
          </button>
          <button
            type="button"
            onClick={() => onDelete(element.id)}
            className="flex h-7 w-7 items-center justify-center rounded text-white/50 hover:bg-red-500/20 hover:text-red-400"
            title="Delete"
          >
            <span className="material-symbols-rounded text-[15px]">delete</span>
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto">
        <Section title="Content">
          <ContentEditor element={element} setProp={setProp} />
        </Section>

        <Section title="Layout">
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
          <div className="grid grid-cols-2 gap-2">
            <Field label="Mt">
              <NumberStepper
                value={element.layout?.marginTop ?? 0}
                onChange={(v) => setLayout("marginTop", v)}
                step={1}
                max={24}
              />
            </Field>
            <Field label="Mb">
              <NumberStepper
                value={element.layout?.marginBottom ?? 0}
                onChange={(v) => setLayout("marginBottom", v)}
                step={1}
                max={24}
              />
            </Field>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <Field label="Px">
              <NumberStepper
                value={element.layout?.paddingX ?? 0}
                onChange={(v) => setLayout("paddingX", v)}
                step={1}
                max={12}
              />
            </Field>
            <Field label="Py">
              <NumberStepper
                value={element.layout?.paddingY ?? 0}
                onChange={(v) => setLayout("paddingY", v)}
                step={1}
                max={12}
              />
            </Field>
          </div>
        </Section>
      </div>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="border-b border-white/5 px-3 py-3">
      <p className="mb-2 text-[10px] font-semibold uppercase tracking-wider text-white/30">
        {title}
      </p>
      {children}
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
        <Field label="Text">
          <textarea
            value={(props.content as string) || ""}
            onChange={(e) => setProp("content", e.target.value)}
            rows={3}
            className={`${inputCls} resize-none`}
          />
        </Field>
      );
    case "heading":
      return (
        <>
          <Field label="Text">
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
          <Field label="URL">
            <input
              type="text"
              value={(props.src as string) || ""}
              onChange={(e) => setProp("src", e.target.value)}
              placeholder="https://…"
              className={inputCls}
            />
          </Field>
          <Field label="Alt">
            <input
              type="text"
              value={(props.alt as string) || ""}
              onChange={(e) => setProp("alt", e.target.value)}
              className={inputCls}
            />
          </Field>
          <Field label="Aspect">
            <select
              value={(props.aspect as string) || "16/9"}
              onChange={(e) => setProp("aspect", e.target.value)}
              className={inputCls}
            >
              <option value="16/9">16:9</option>
              <option value="4/3">4:3</option>
              <option value="1/1">1:1</option>
              <option value="3/4">3:4</option>
              <option value="21/9">21:9</option>
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
              <option value="primary">Primary</option>
              <option value="secondary">Secondary</option>
              <option value="outline">Outline</option>
            </select>
          </Field>
        </>
      );
    case "spacer":
      return (
        <Field label="Height">
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
        <>
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
          <Field label="Children">
            <select
              value={(props.align as string) || "stretch"}
              onChange={(e) => setProp("align", e.target.value)}
              className={inputCls}
            >
              <option value="stretch">Stretch</option>
              <option value="start">Start</option>
              <option value="center">Center</option>
              <option value="end">End</option>
            </select>
          </Field>
        </>
      );
    case "columns":
      return (
        <>
          <Field label="Direction">
            <select
              value={(props.direction as string) || "row"}
              onChange={(e) => setProp("direction", e.target.value)}
              className={inputCls}
            >
              <option value="row">Row</option>
              <option value="column">Column</option>
            </select>
          </Field>
          <Field label="Gap">
            <NumberStepper
              value={(props.gap as number) || 4}
              onChange={(v) => setProp("gap", v)}
              step={1}
              max={12}
            />
          </Field>
          <Field label="Justify">
            <select
              value={(props.justify as string) || "start"}
              onChange={(e) => setProp("justify", e.target.value)}
              className={inputCls}
            >
              <option value="start">Start</option>
              <option value="center">Center</option>
              <option value="end">End</option>
              <option value="between">Between</option>
              <option value="around">Around</option>
            </select>
          </Field>
          <Field label="Align">
            <select
              value={(props.align as string) || "stretch"}
              onChange={(e) => setProp("align", e.target.value)}
              className={inputCls}
            >
              <option value="stretch">Stretch</option>
              <option value="start">Start</option>
              <option value="center">Center</option>
              <option value="end">End</option>
            </select>
          </Field>
        </>
      );
    case "divider":
    case "container":
      return <p className="text-[11px] text-white/40">No content settings.</p>;
    default:
      return (
        <div className="rounded-md bg-destiny-orange/10 px-2.5 py-2 text-[11px] text-white/70">
          <span className="font-semibold text-destiny-orange">Brand component</span> — pre-styled. Use Layout to position.
        </div>
      );
  }
}

const inputCls =
  "w-full rounded-md border border-white/10 bg-white/[0.04] px-2 py-1.5 text-xs text-white placeholder:text-white/30 focus:border-white/20 focus:bg-white/[0.08] focus:outline-none";

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="mb-2 grid grid-cols-[60px_1fr] items-center gap-2">
      <span className="text-[11px] text-white/50">{label}</span>
      <div>{children}</div>
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
    <div className="flex items-center rounded-md border border-white/10 bg-white/[0.04]">
      <button
        type="button"
        onClick={() => onChange(Math.max(0, value - step))}
        className="flex h-7 w-6 items-center justify-center text-white/40 hover:bg-white/5 hover:text-white"
      >
        <span className="material-symbols-rounded text-[14px]">remove</span>
      </button>
      <input
        type="number"
        value={value}
        onChange={(e) => onChange(Math.max(0, Math.min(max, Number(e.target.value) || 0)))}
        className="w-full flex-1 border-x border-white/10 bg-transparent px-1 py-1 text-center text-xs text-white focus:outline-none"
      />
      <button
        type="button"
        onClick={() => onChange(Math.min(max, value + step))}
        className="flex h-7 w-6 items-center justify-center text-white/40 hover:bg-white/5 hover:text-white"
      >
        <span className="material-symbols-rounded text-[14px]">add</span>
      </button>
    </div>
  );
}
