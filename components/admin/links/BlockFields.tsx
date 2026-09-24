"use client";

// The settings for one block, by type. Built from the same field components
// the post editor's block inspector uses (components/admin/blocks/fields/), so
// the two editors look and behave alike.

import {
  NumberField,
  SelectField,
  TextAreaField,
  TextField,
  ToggleField,
} from "@/components/admin/blocks/fields/BasicFields";
import { IconField } from "@/components/admin/blocks/fields/IconField";
import { ImageField } from "@/components/admin/blocks/fields/ImageField";
import { FieldShell, fieldInputClass } from "@/components/admin/blocks/fields/BasicFields";
import EventPicker, { formatPickerDate, type PickerEvent } from "@/components/admin/EventPicker";
import { EMBED_HELP, safeHref, toEmbed } from "@/lib/linkPages/urls";
import { isEmbeddable } from "@/lib/nfcTiles";
import { FORM_FIELD_KINDS, newFieldId, type FormFieldKind } from "@/lib/linkPages/types";
import type { EditorBlock } from "./editorTypes";
import ColorField from "./ColorField";
import { Segmented } from "./controls";

type Patch = (data: Record<string, unknown>) => void;

const str = (v: unknown) => (typeof v === "string" ? v : "");

function HrefField({
  label,
  value,
  onChange,
  help,
  optional,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  help?: string;
  optional?: boolean;
}) {
  const rejected = value.trim() !== "" && safeHref(value) === null;
  return (
    <FieldShell label={label} help={help}>
      <input
        className={`${fieldInputClass} ${rejected ? "border-destiny-red/50" : ""}`}
        value={value}
        placeholder={optional ? "Optional — https://…  or  /page" : "https://…  /page  mailto:  tel:"}
        onChange={(e) => onChange(e.target.value)}
      />
      {rejected && (
        <p className="mt-1.5 text-xs font-medium text-destiny-red">
          Links must start with https://, http://, mailto:, tel: or /
        </p>
      )}
    </FieldShell>
  );
}

/**
 * A colour that can be left to the theme. Blank shows a "Theme colour" button;
 * once set, the picker plus a way back to the theme.
 */
function OverrideColor({
  label,
  value,
  fallback,
  onChange,
}: {
  label: string;
  value: string;
  /** Where the picker starts when an override is first added. */
  fallback: string;
  onChange: (next: string) => void;
}) {
  if (!value) {
    return (
      <FieldShell label={label}>
        <button
          type="button"
          onClick={() => onChange(fallback)}
          className={`${fieldInputClass} flex items-center gap-2 text-left text-destiny-grey/55 dark:text-white/55`}
        >
          <span className="material-symbols-rounded text-lg" aria-hidden="true">format_paint</span>
          Theme colour — tap to change
        </button>
      </FieldShell>
    );
  }
  return (
    <div>
      <ColorField label={label} value={value} onChange={onChange} />
      <button
        type="button"
        onClick={() => onChange("")}
        className="mt-1.5 text-xs font-bold text-destiny-grey/55 hover:text-destiny-orange dark:text-white/55"
      >
        Use the theme colour
      </button>
    </div>
  );
}

function LinkFields({ d, set }: { d: Record<string, unknown>; set: Patch }) {
  const url = str(d.url);
  const canPopup = isEmbeddable(url);
  const open = str(d.open) || "same";
  const custom = Boolean(str(d.bg) || str(d.color) || (str(d.align) && str(d.align) !== "theme") || d.hideIcon === true);
  return (
    <>
      <TextField label="Button text" value={str(d.title)} maxLength={80} onChange={(v) => set({ title: v })} />
      <TextField
        label="Subtitle"
        value={str(d.subtitle)}
        maxLength={120}
        placeholder="Optional — a short line under the title"
        onChange={(v) => set({ subtitle: v })}
      />
      <HrefField label="Link" value={url} onChange={(v) => set({ url: v })} />
      <Segmented
        label="Opens"
        value={open === "popup" && !canPopup ? "same" : open}
        options={[
          { value: "same", label: "Same tab" },
          { value: "new", label: "New tab" },
          ...(canPopup ? [{ value: "popup", label: "Popup" }] : []),
        ]}
        onChange={(v) => set({ open: v })}
        help={canPopup ? "ChurchSuite links can open in a popup without leaving the page." : undefined}
      />
      <div className="grid gap-4 @xl:grid-cols-2">
        <Segmented
          label="Shape"
          value={str(d.style) || "button"}
          options={[
            { value: "button", label: "Button" },
            { value: "featured", label: "Big image card" },
          ]}
          onChange={(v) => set({ style: v })}
        />
        <Segmented
          label="Spotlight"
          value={str(d.highlight) || "none"}
          options={[
            { value: "none", label: "None" },
            { value: "pulse", label: "Pulse" },
            { value: "shake", label: "Wiggle" },
            { value: "glow", label: "Glow" },
          ]}
          onChange={(v) => set({ highlight: v })}
        />
      </div>
      <div className="grid gap-4 @xl:grid-cols-2">
        <IconField label="Icon" value={str(d.icon)} onChange={(v) => set({ icon: v })} help="Shown when there's no thumbnail." />
        <ImageField
          label={str(d.style) === "featured" ? "Card image" : "Thumbnail"}
          value={str(d.thumbnail)}
          onChange={(v) => set({ thumbnail: v })}
        />
      </div>

      <details open={custom} className="group rounded-xl border border-black/8 dark:border-white/10">
        <summary className="flex cursor-pointer list-none items-center gap-2 px-3.5 py-3 text-sm font-bold text-destiny-grey dark:text-white">
          <span className="material-symbols-rounded text-lg text-destiny-orange" aria-hidden="true">tune</span>
          Customise this button
          {custom && (
            <span className="rounded-full bg-destiny-orange/10 px-2 py-0.5 text-[11px] font-bold text-destiny-orange">Custom</span>
          )}
          <span className="material-symbols-rounded ml-auto text-lg text-destiny-grey/40 transition-transform group-open:rotate-180 dark:text-white/40" aria-hidden="true">
            expand_more
          </span>
        </summary>
        <div className="space-y-4 border-t border-black/5 px-3.5 pb-4 pt-4 dark:border-white/8">
          <div className="grid gap-4 @xl:grid-cols-2">
            <OverrideColor label="Button colour" value={str(d.bg)} fallback="#f58021" onChange={(v) => set({ bg: v })} />
            <OverrideColor label="Text colour" value={str(d.color)} fallback="#ffffff" onChange={(v) => set({ color: v })} />
          </div>
          <Segmented
            label="Text align"
            value={str(d.align) || "theme"}
            options={[
              { value: "theme", label: "Theme" },
              { value: "left", label: "Left", icon: "format_align_left" },
              { value: "center", label: "Centre", icon: "format_align_center" },
            ]}
            onChange={(v) => set({ align: v })}
          />
          <ToggleField label="Hide the icon" value={d.hideIcon === true} onChange={(v) => set({ hideIcon: v })} />
        </div>
      </details>
    </>
  );
}

function EventFields({
  d,
  set,
  events,
  loading,
}: {
  d: Record<string, unknown>;
  set: Patch;
  events: PickerEvent[] | null;
  loading: boolean;
}) {
  const mode = str(d.mode) || "upcoming";
  const categories = [...new Set((events ?? []).map((e) => e.category).filter(Boolean))] as string[];
  const endsAt = str(d.event_ends_at);
  return (
    <>
      <Segmented
        label="Show"
        value={mode}
        options={[
          { value: "upcoming", label: "Next few, automatically" },
          { value: "single", label: "One I choose" },
        ]}
        onChange={(v) => set({ mode: v })}
      />
      {mode === "single" ? (
        <EventPicker
          events={events}
          loading={loading}
          selectedIdentifier={str(d.event_identifier)}
          selectedName={str(d.event_name)}
          selectedNote={endsAt ? `Hides itself after ${formatPickerDate(endsAt)}` : null}
          onPick={(ev) =>
            set({
              event_identifier: ev.identifier ?? "",
              event_sequence: ev.sequence,
              event_name: ev.name,
              event_ends_at: ev.endsAt,
            })
          }
          help="Shown as a large card. Events that take signups in ChurchSuite open the form in a popup; the rest link to their What's On page. The card disappears by itself once the event is over."
        />
      ) : (
        <>
          <TextField
            label="Heading"
            value={str(d.heading)}
            maxLength={80}
            placeholder="Optional — e.g. Coming up"
            onChange={(v) => set({ heading: v })}
          />
          <div className="grid gap-4 @md:grid-cols-2">
            <NumberField
              label="How many"
              value={Number(d.count ?? 3)}
              min={1}
              max={8}
              onChange={(v) => set({ count: Math.max(1, Math.min(8, Math.round(v))) })}
            />
            <SelectField
              label="Category"
              value={str(d.category)}
              options={[
                { value: "", label: "All events" },
                ...categories.map((c) => ({ value: c, label: c })),
                ...(str(d.category) && !categories.includes(str(d.category))
                  ? [{ value: str(d.category), label: str(d.category) }]
                  : []),
              ]}
              onChange={(v) => set({ category: v })}
            />
          </div>
          <p className="text-xs text-destiny-grey/45 dark:text-white/45">
            Straight from the ChurchSuite calendar — always the next events coming up, no upkeep.
          </p>
        </>
      )}
    </>
  );
}

function EmbedFields({ d, set }: { d: Record<string, unknown>; set: Patch }) {
  const url = str(d.url);
  const target = toEmbed(url);
  return (
    <>
      <FieldShell label="Link to embed" help={EMBED_HELP}>
        <input
          className={`${fieldInputClass} ${url.trim() && !target ? "border-destiny-red/50" : ""}`}
          value={url}
          placeholder="https://youtu.be/…"
          onChange={(e) => set({ url: e.target.value })}
        />
        {url.trim() && !target && (
          <p className="mt-1.5 text-xs font-medium text-destiny-red">
            That link can&apos;t be embedded. For Google Maps, use Share → Embed a map and paste the link from the code.
          </p>
        )}
        {target && (
          <p className="mt-1.5 text-xs font-bold text-destiny-green">
            Recognised: {target.kind.replace("-", " ")}
          </p>
        )}
      </FieldShell>
      <TextField label="Title" value={str(d.title)} maxLength={80} placeholder="Optional" onChange={(v) => set({ title: v })} />
      <Segmented
        label="Display"
        value={str(d.display) || "inline"}
        options={[
          { value: "inline", label: "On the page" },
          { value: "popup", label: "Button + popup" },
        ]}
        onChange={(v) => set({ display: v })}
      />
    </>
  );
}

const FIELD_KIND_LABELS: Record<FormFieldKind, string> = {
  name: "Name",
  email: "Email",
  phone: "Phone",
  text: "Short answer",
  textarea: "Long answer",
  checkbox: "Tick box",
};

interface FormFieldRow {
  id: string;
  kind: FormFieldKind;
  label: string;
  required: boolean;
}

function FormFields({ d, set }: { d: Record<string, unknown>; set: Patch }) {
  const fields = (Array.isArray(d.fields) ? d.fields : []) as FormFieldRow[];
  const setFields = (next: FormFieldRow[]) => set({ fields: next });
  const update = (i: number, patch: Partial<FormFieldRow>) =>
    setFields(fields.map((f, j) => (j === i ? { ...f, ...patch } : f)));
  const move = (i: number, delta: number) => {
    const j = i + delta;
    if (j < 0 || j >= fields.length) return;
    const next = [...fields];
    [next[i], next[j]] = [next[j], next[i]];
    setFields(next);
  };

  return (
    <>
      <TextField label="Form title" value={str(d.title)} maxLength={80} onChange={(v) => set({ title: v })} />
      <TextAreaField
        label="Description"
        value={str(d.description)}
        maxLength={300}
        rows={2}
        placeholder="Optional — what happens when someone fills this in"
        onChange={(v) => set({ description: v })}
      />

      <FieldShell label="Fields">
        <div className="space-y-2">
          {fields.map((field, i) => (
            <div key={field.id} className="rounded-xl border border-black/10 p-3 dark:border-white/10">
              <div className="flex flex-wrap items-center gap-2">
                <select
                  className={`${fieldInputClass} w-auto cursor-pointer`}
                  value={field.kind}
                  aria-label="Field type"
                  onChange={(e) => update(i, { kind: e.target.value as FormFieldKind })}
                >
                  {FORM_FIELD_KINDS.map((k) => (
                    <option key={k} value={k}>
                      {FIELD_KIND_LABELS[k]}
                    </option>
                  ))}
                </select>
                <input
                  className={`${fieldInputClass} min-w-0 flex-1`}
                  value={field.label}
                  maxLength={120}
                  aria-label="Field label"
                  placeholder={field.kind === "checkbox" ? "e.g. Keep me posted about events" : "Label"}
                  onChange={(e) => update(i, { label: e.target.value })}
                />
              </div>
              <div className="mt-2 flex items-center justify-between gap-2">
                <label className="flex items-center gap-2 text-xs font-bold text-destiny-grey/60 dark:text-white/60">
                  <input
                    type="checkbox"
                    checked={field.required}
                    onChange={(e) => update(i, { required: e.target.checked })}
                    className="h-4 w-4 accent-destiny-orange"
                  />
                  Required
                </label>
                <div className="flex gap-1">
                  <IconButton icon="arrow_upward" label="Move field up" onClick={() => move(i, -1)} disabled={i === 0} />
                  <IconButton icon="arrow_downward" label="Move field down" onClick={() => move(i, 1)} disabled={i === fields.length - 1} />
                  <IconButton
                    icon="delete"
                    label="Remove field"
                    onClick={() => setFields(fields.filter((_, j) => j !== i))}
                    disabled={fields.length <= 1}
                  />
                </div>
              </div>
            </div>
          ))}
        </div>
        {fields.length < 10 && (
          <button
            type="button"
            onClick={() => setFields([...fields, { id: newFieldId(), kind: "text", label: "", required: false }])}
            className="mt-2 inline-flex items-center gap-1 text-sm font-bold text-destiny-orange"
          >
            <span className="material-symbols-rounded text-lg" aria-hidden="true">add</span>
            Add a field
          </button>
        )}
      </FieldShell>

      <div className="grid gap-4 @md:grid-cols-2">
        <TextField label="Button text" value={str(d.submitLabel)} maxLength={30} onChange={(v) => set({ submitLabel: v })} />
        <TextField
          label="Email responses to"
          value={str(d.notifyEmail)}
          placeholder="Optional — e.g. office@destinytees.uk"
          onChange={(v) => set({ notifyEmail: v })}
        />
      </div>
      <TextField
        label="Thank-you message"
        value={str(d.successMessage)}
        maxLength={200}
        onChange={(v) => set({ successMessage: v })}
      />
      <ToggleField
        label="Start collapsed"
        help="Shows as a button until tapped, so the form doesn't push everything else down."
        value={d.collapsed !== false}
        onChange={(v) => set({ collapsed: v })}
      />
      <p className="text-xs text-destiny-grey/45 dark:text-white/45">
        Responses are kept in the Responses tab. Only ask for what you need — a privacy note linking to the Privacy
        Policy is added under the form automatically.
      </p>
    </>
  );
}

function IconButton({
  icon,
  label,
  onClick,
  disabled,
}: {
  icon: string;
  label: string;
  onClick: () => void;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      onClick={onClick}
      disabled={disabled}
      className="flex h-9 w-9 items-center justify-center rounded-lg text-destiny-grey/50 transition hover:bg-black/5 hover:text-destiny-grey disabled:opacity-30 dark:text-white/50 dark:hover:bg-white/10"
    >
      <span className="material-symbols-rounded text-lg" aria-hidden="true">
        {icon}
      </span>
    </button>
  );
}

/** datetime-local wants "YYYY-MM-DDTHH:mm" in local time. */
function toLocalInput(iso: string | null): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export function ScheduleFields({
  block,
  onChange,
}: {
  block: EditorBlock;
  onChange: (patch: Partial<EditorBlock>) => void;
}) {
  const bad = block.starts_at && block.ends_at && Date.parse(block.starts_at) >= Date.parse(block.ends_at);
  return (
    <div>
      <div className="grid gap-4 @md:grid-cols-2">
        <FieldShell label="Show from">
          <input
            type="datetime-local"
            className={fieldInputClass}
            value={toLocalInput(block.starts_at)}
            onChange={(e) => onChange({ starts_at: e.target.value ? new Date(e.target.value).toISOString() : null })}
          />
        </FieldShell>
        <FieldShell label="Hide after">
          <input
            type="datetime-local"
            className={fieldInputClass}
            value={toLocalInput(block.ends_at)}
            onChange={(e) => onChange({ ends_at: e.target.value ? new Date(e.target.value).toISOString() : null })}
          />
        </FieldShell>
      </div>
      <p className={`mt-1.5 text-xs ${bad ? "font-bold text-destiny-red" : "text-destiny-grey/45 dark:text-white/45"}`}>
        {bad ? "“Hide after” must be later than “Show from”." : "Optional. Leave both blank to show it all the time."}
      </p>
    </div>
  );
}

export default function BlockFields({
  block,
  onData,
  events,
  eventsLoading,
}: {
  block: EditorBlock;
  onData: Patch;
  events: PickerEvent[] | null;
  eventsLoading: boolean;
}) {
  const d = block.data;
  switch (block.type) {
    case "link":
      return <LinkFields d={d} set={onData} />;
    case "header":
      return (
        <>
          <TextField label="Heading" value={str(d.text)} maxLength={80} onChange={(v) => onData({ text: v })} />
          <div className="grid gap-4 @xl:grid-cols-2">
            <Segmented
              label="Size"
              value={str(d.size) || "md"}
              options={[
                { value: "sm", label: "Label" },
                { value: "md", label: "Medium" },
                { value: "lg", label: "Large" },
              ]}
              onChange={(v) => onData({ size: v })}
            />
            <Segmented
              label="Align"
              value={str(d.align) || "center"}
              options={[
                { value: "center", label: "Centre", icon: "format_align_center" },
                { value: "left", label: "Left", icon: "format_align_left" },
              ]}
              onChange={(v) => onData({ align: v })}
            />
          </div>
          <OverrideColor label="Colour" value={str(d.color)} fallback="#f58021" onChange={(v) => onData({ color: v })} />
        </>
      );
    case "text":
      return (
        <>
          <TextAreaField label="Text" value={str(d.body)} rows={4} maxLength={1000} onChange={(v) => onData({ body: v })} />
          <Segmented
            label="Align"
            value={str(d.align) || "center"}
            options={[
              { value: "center", label: "Centre" },
              { value: "left", label: "Left" },
            ]}
            onChange={(v) => onData({ align: v })}
          />
        </>
      );
    case "image":
      return (
        <>
          <ImageField label="Image" value={str(d.url)} onChange={(v) => onData({ url: v })} />
          <TextField
            label="Description (alt text)"
            value={str(d.alt)}
            maxLength={200}
            placeholder="What's in the picture, for screen readers"
            onChange={(v) => onData({ alt: v })}
          />
          <HrefField label="Link" optional value={str(d.link)} onChange={(v) => onData({ link: v })} />
          <Segmented
            label="Shape"
            value={str(d.aspect) || "auto"}
            options={[
              { value: "auto", label: "Original" },
              { value: "square", label: "Square" },
              { value: "wide", label: "Wide" },
              { value: "portrait", label: "Portrait" },
            ]}
            onChange={(v) => onData({ aspect: v })}
          />
        </>
      );
    case "divider":
      return (
        <Segmented
          label="Style"
          value={str(d.style) || "line"}
          options={[
            { value: "line", label: "Line" },
            { value: "dots", label: "Dots" },
            { value: "space", label: "Space" },
          ]}
          onChange={(v) => onData({ style: v })}
        />
      );
    case "event":
      return <EventFields d={d} set={onData} events={events} loading={eventsLoading} />;
    case "embed":
      return <EmbedFields d={d} set={onData} />;
    case "form":
      return <FormFields d={d} set={onData} />;
  }
}
