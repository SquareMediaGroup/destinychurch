// The vocabulary of the links pages: page and block shapes, and the zod
// schemas that check them.
//
// One schema per block type, used in both directions:
//   - the admin API parses every block before link_page_save() writes it, so
//     the jsonb in link_blocks.data is always a shape the renderer knows;
//   - the renderer safeParses on the way out and skips anything that fails,
//     so a bad row degrades to a missing block rather than a broken page.
//
// Client-safe — the editor imports these for defaults and live validation.

import { z } from "zod";
import { safeHref, safeMediaUrl, toEmbed } from "./urls";
import { ThemeSchema, isThemeColor, type Theme } from "./theme";
import { SOCIAL_KEYS, type SocialKey } from "./socials";

/* ── Shared field helpers ─────────────────────────────────────────────────── */

const text = (max: number) => z.string().trim().max(max, `Keep it under ${max} characters`).default("");
const required = (max: number, what: string) =>
  z.string().trim().min(1, `${what} is required`).max(max, `${what} must be ${max} characters or fewer`);
const href = z
  .string()
  .trim()
  .max(2000)
  .refine((v) => safeHref(v) !== null, "Links must start with https://, http://, mailto:, tel: or /");
const optionalHref = z
  .string()
  .trim()
  .max(2000)
  .refine((v) => v === "" || safeHref(v) !== null, "Links must start with https://, http://, mailto:, tel: or /")
  .default("");
const media = z
  .string()
  .trim()
  .max(2000)
  .refine((v) => v === "" || safeMediaUrl(v) !== null, "Images must be an upload or an https:// URL")
  .default("");
/** An optional colour override: blank means "use the theme". */
const colorOverride = z
  .string()
  .trim()
  .refine((v) => v === "" || isThemeColor(v), "Not a colour")
  .default("");

const icon = z
  .string()
  .trim()
  .max(40)
  .regex(/^[a-z0-9_]*$/, "Not a Material Symbols icon name")
  .default("");

/* ── Block data, one schema per type ──────────────────────────────────────── */

export const LinkDataSchema = z.object({
  title: required(80, "Button text"),
  subtitle: text(120),
  url: href,
  icon,
  /** A small image beside the text, or the artwork on a featured card. */
  thumbnail: media,
  /** `featured` is a large image card; `button` is the standard row. */
  style: z.enum(["button", "featured"]).default("button"),
  /** Linktree's "spotlight" — draws the eye to one link. */
  highlight: z.enum(["none", "pulse", "shake", "glow"]).default("none"),
  /** `popup` opens a ChurchSuite URL in the in-page modal; anything else falls back to a new tab. */
  open: z.enum(["same", "new", "popup"]).default("same"),
  /** Per-button overrides; blank = the theme's. */
  bg: colorOverride,
  color: colorOverride,
  align: z.enum(["theme", "left", "center"]).default("theme"),
  hideIcon: z.boolean().default(false),
});

export const HeaderDataSchema = z.object({
  text: required(80, "Heading"),
  size: z.enum(["sm", "md", "lg"]).default("md"),
  align: z.enum(["left", "center"]).default("center"),
  color: colorOverride,
});

export const TextDataSchema = z.object({
  body: required(1000, "Text"),
  align: z.enum(["left", "center"]).default("center"),
});

export const ImageDataSchema = z.object({
  url: z
    .string()
    .trim()
    .max(2000)
    .refine((v) => safeMediaUrl(v) !== null, "Upload an image first"),
  alt: text(200),
  link: optionalHref,
  aspect: z.enum(["auto", "square", "wide", "portrait"]).default("auto"),
});

export const DividerDataSchema = z.object({
  style: z.enum(["line", "dots", "space"]).default("line"),
});

export const EventDataSchema = z.object({
  /** `single` pins one ChurchSuite event; `upcoming` lists the next few automatically. */
  mode: z.enum(["single", "upcoming"]).default("single"),
  /** mode=single: the pointer, as /admin/nfc stores it. Everything else is derived. */
  event_identifier: text(64),
  event_sequence: z.number().int().nullable().default(null),
  /** Server-written on save: the name for the editor list, and when to hide. */
  event_name: text(200),
  event_ends_at: z.string().max(40).default(""),
  /** mode=upcoming */
  count: z.number().int().min(1).max(8).default(3),
  category: text(80),
  heading: text(80),
});

export const EmbedDataSchema = z.object({
  url: z
    .string()
    .trim()
    .max(2000)
    .refine((v) => toEmbed(v) !== null, "That link can't be embedded. Try YouTube, Vimeo, Spotify, Apple Podcasts, a Google Maps embed link or a ChurchSuite form."),
  title: text(80),
  /** `popup` shows a button that opens the player; `inline` shows it on the page. */
  display: z.enum(["inline", "popup"]).default("inline"),
});

export const FORM_FIELD_KINDS = ["name", "email", "phone", "text", "textarea", "checkbox"] as const;
export type FormFieldKind = (typeof FORM_FIELD_KINDS)[number];

export const FormFieldSchema = z.object({
  id: z.string().regex(/^[a-zA-Z0-9_-]{1,40}$/),
  kind: z.enum(FORM_FIELD_KINDS),
  label: required(120, "Field label"),
  required: z.boolean().default(false),
});

export const FormDataSchema = z
  .object({
    title: required(80, "Form title"),
    description: text(300),
    fields: z.array(FormFieldSchema).min(1, "Add at least one field").max(10, "Ten fields at most"),
    submitLabel: z.string().trim().max(30).default("Send"),
    successMessage: z.string().trim().max(200).default("Thank you — we'll be in touch soon."),
    /** Where to email each submission. Blank = stored only, read in the admin. */
    notifyEmail: z
      .string()
      .trim()
      .max(200)
      .refine((v) => v === "" || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v), "Not a valid email address")
      .default(""),
    /** Collapsed behind a button until tapped, so a long form doesn't dominate the page. */
    collapsed: z.boolean().default(true),
  })
  .refine((d) => new Set(d.fields.map((f) => f.id)).size === d.fields.length, "Field ids must be unique");

/* ── Blocks ───────────────────────────────────────────────────────────────── */

export const BLOCK_DATA_SCHEMAS = {
  link: LinkDataSchema,
  header: HeaderDataSchema,
  text: TextDataSchema,
  image: ImageDataSchema,
  divider: DividerDataSchema,
  event: EventDataSchema,
  embed: EmbedDataSchema,
  form: FormDataSchema,
} as const;

export type LinkBlockType = keyof typeof BLOCK_DATA_SCHEMAS;
export const LINK_BLOCK_TYPES = Object.keys(BLOCK_DATA_SCHEMAS) as LinkBlockType[];

export type BlockDataMap = { [K in LinkBlockType]: z.infer<(typeof BLOCK_DATA_SCHEMAS)[K]> };

const isoOrNull = z
  .string()
  .nullable()
  .default(null)
  .refine((v) => v === null || v === "" || !Number.isNaN(Date.parse(v)), "Not a valid date")
  .transform((v) => (v ? new Date(v).toISOString() : null));

const blockBase = {
  id: z.string().uuid(),
  active: z.boolean().default(true),
  starts_at: isoOrNull,
  ends_at: isoOrNull,
};

export const LinkBlockSchema = z
  .discriminatedUnion("type", [
    z.object({ ...blockBase, type: z.literal("link"), data: LinkDataSchema }),
    z.object({ ...blockBase, type: z.literal("header"), data: HeaderDataSchema }),
    z.object({ ...blockBase, type: z.literal("text"), data: TextDataSchema }),
    z.object({ ...blockBase, type: z.literal("image"), data: ImageDataSchema }),
    z.object({ ...blockBase, type: z.literal("divider"), data: DividerDataSchema }),
    z.object({ ...blockBase, type: z.literal("event"), data: EventDataSchema }),
    z.object({ ...blockBase, type: z.literal("embed"), data: EmbedDataSchema }),
    z.object({ ...blockBase, type: z.literal("form"), data: FormDataSchema }),
  ])
  .refine(
    (b) => !b.starts_at || !b.ends_at || b.starts_at < b.ends_at,
    "The schedule's end must be after its start",
  );

export type LinkBlock = z.infer<typeof LinkBlockSchema>;
export type LinkBlockOf<T extends LinkBlockType> = Extract<LinkBlock, { type: T }>;

/* ── Pages ────────────────────────────────────────────────────────────────── */

export const SLUG_RE = /^[a-z0-9]([a-z0-9-]{0,46}[a-z0-9])?$/;
/** The slug that renders at /links itself. */
export const MAIN_SLUG = "main";

export const SocialLinkSchema = z.object({
  platform: z.enum(SOCIAL_KEYS),
  url: href,
});

export const LinkPageSchema = z.object({
  slug: z.string().trim().toLowerCase().regex(SLUG_RE, "Use lowercase letters, numbers and dashes"),
  title: text(80),
  bio: text(300),
  avatar_url: media,
  theme: ThemeSchema,
  socials: z.array(SocialLinkSchema).max(16).default([]),
  socials_position: z.enum(["top", "bottom"]).default("top"),
  seo_title: text(70),
  seo_description: text(200),
  og_image_url: media,
  noindex: z.boolean().default(false),
  published: z.boolean().default(true),
});

export type LinkPage = z.infer<typeof LinkPageSchema>;
export type LinkPageWithId = LinkPage & { id: string };

export interface SocialLink {
  platform: SocialKey;
  url: string;
}

/* ── Resolved shapes (what the renderer is handed) ───────────────────────── */

/** One ChurchSuite event, flattened to what an event card shows. */
export interface EventCard {
  key: string;
  name: string;
  /** "WED 5 AUG · 10:00 AM" */
  kicker: string;
  image: string | null;
  location: string | null;
  /** A framable ChurchSuite signup URL (anchored to the form), or null. */
  signupUrl: string | null;
  /** The /whats-on detail page. */
  href: string;
}

/**
 * A block ready to render. Event blocks carry their resolved cards; a single
 * event that has finished or left the feed is dropped before it gets here.
 */
export type ResolvedBlock = LinkBlock & { events?: EventCard[] };

export interface ResolvedLinkPage {
  page: LinkPageWithId;
  theme: Theme;
  blocks: ResolvedBlock[];
}

/* ── Defaults for new blocks (editor) ────────────────────────────────────── */

export const BLOCK_META: Record<
  LinkBlockType,
  { label: string; icon: string; description: string }
> = {
  link: { label: "Link", icon: "link", description: "A button to any page or site." },
  header: { label: "Heading", icon: "title", description: "Split the page into sections." },
  text: { label: "Text", icon: "notes", description: "A short paragraph." },
  image: { label: "Image", icon: "image", description: "A picture, optionally linked." },
  divider: { label: "Divider", icon: "horizontal_rule", description: "A line or a gap." },
  event: { label: "Event", icon: "event", description: "A ChurchSuite event, or the next few." },
  embed: { label: "Embed", icon: "smart_display", description: "Video, music, podcast, map or form." },
  form: { label: "Form", icon: "contact_mail", description: "Collect names and emails." },
};

export function newFieldId(): string {
  return Math.random().toString(36).slice(2, 10);
}

/**
 * The starting data for a freshly added block. Not run through the schema —
 * required fields start blank so the editor shows them as to-do, and the save
 * rejects them if they're left that way.
 */
export function defaultBlockData(type: LinkBlockType): Record<string, unknown> {
  switch (type) {
    case "link":
      return { title: "", subtitle: "", url: "", icon: "", thumbnail: "", style: "button", highlight: "none", open: "same", bg: "", color: "", align: "theme", hideIcon: false };
    case "header":
      return { text: "", size: "md", align: "center", color: "" };
    case "text":
      return { body: "", align: "center" };
    case "image":
      return { url: "", alt: "", link: "", aspect: "auto" };
    case "divider":
      return { style: "line" };
    case "event":
      return { mode: "upcoming", event_identifier: "", event_sequence: null, event_name: "", event_ends_at: "", count: 3, category: "", heading: "" };
    case "embed":
      return { url: "", title: "", display: "inline" };
    case "form":
      return {
        title: "Stay in touch",
        description: "",
        fields: [
          { id: newFieldId(), kind: "name", label: "Your name", required: true },
          { id: newFieldId(), kind: "email", label: "Email address", required: true },
        ],
        submitLabel: "Send",
        successMessage: "Thank you — we'll be in touch soon.",
        notifyEmail: "",
        collapsed: true,
      };
  }
}

/** A short label for a block in lists, logs and the analytics table. */
export function blockLabel(block: { type: string; data: Record<string, unknown> }): string {
  const d = block.data ?? {};
  const pick = (k: string) => (typeof d[k] === "string" ? (d[k] as string).trim() : "");
  switch (block.type) {
    case "link":
      return pick("title") || "Untitled link";
    case "header":
      return pick("text") || "Heading";
    case "text":
      return pick("body").slice(0, 60) || "Text";
    case "image":
      return pick("alt") || "Image";
    case "divider":
      return "Divider";
    case "event":
      return d.mode === "single" ? pick("event_name") || "Event" : pick("heading") || "Upcoming events";
    case "embed":
      return pick("title") || "Embed";
    case "form":
      return pick("title") || "Form";
    default:
      return block.type;
  }
}

export type { Theme };
