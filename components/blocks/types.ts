import type { ComponentType } from "react";
import type { z } from "zod";

/**
 * Content blocks — the shared type vocabulary.
 *
 * A block is a configurable component an admin can drop into a page from the
 * Blocks sidebar in the post editor. One `BlockDefinition` per block drives all
 * four surfaces that need to know about it:
 *
 *   1. the Blocks sidebar          (label, icon, category, description)
 *   2. the settings inspector      (fields)
 *   3. the Tiptap node             (name, version, defaults, schema)
 *   4. the public renderer         (Component, jsonLd)
 *
 * Adding a block should mean adding one directory under `components/blocks/`
 * and one line in `registry.ts`. If it ever requires more, the abstraction has
 * leaked — fix that rather than working around it.
 *
 * Nothing in this file (or in any block component) may import client-only code.
 * Block components carry no "use client" directive, which makes them RSC
 * "shared" components: they server-render on the public page with zero client
 * JS, and the identical module renders inside the editor's React NodeView.
 * That is what makes the editor genuinely WYSIWYG.
 */

/** Section background / accent tones, mapped to real classes in `tokens.ts`. */
export type Tone = "light" | "muted" | "orange" | "blue" | "green" | "purple";

/**
 * How wide a block may render.
 *
 * There is deliberately no "full" (edge-to-edge). Post bodies render inside a
 * fixed reading column, and at ≥1600px `app/[slug]/page.tsx` puts that column
 * in an off-centre grid track alongside the promo rails — so the usual
 * `margin-inline: calc(50% - 50vw)` full-bleed trick would be wrong there.
 */
export type BlockWidth = "column" | "wide";

/** Fields the inspector knows how to render. Discriminated on `kind`. */
export type LeafFieldSchema =
  | {
      kind: "text";
      name: string;
      label: string;
      placeholder?: string;
      help?: string;
      maxLength?: number;
    }
  | {
      kind: "textarea";
      name: string;
      label: string;
      placeholder?: string;
      help?: string;
      rows?: number;
      maxLength?: number;
    }
  | {
      kind: "url";
      name: string;
      label: string;
      placeholder?: string;
      help?: string;
    }
  | {
      kind: "number";
      name: string;
      label: string;
      help?: string;
      min?: number;
      max?: number;
      step?: number;
    }
  | { kind: "toggle"; name: string; label: string; help?: string }
  /**
   * A dropdown. NOTE: the value is always a string — that's what a <select>
   * yields. A block whose schema expects a number here will fail to parse and
   * silently reset itself to defaults, so model numeric choices as a string
   * enum (`z.enum(["2","3"])`) and compare against strings in the component.
   */
  | {
      kind: "select";
      name: string;
      label: string;
      help?: string;
      options: { value: string; label: string }[];
    }
  | { kind: "tone"; name: string; label: string; help?: string; options: Tone[] }
  /** A Material Symbols Rounded ligature string, e.g. "calendar_month". */
  | { kind: "icon"; name: string; label: string; help?: string }
  /** A URL in the `post-media` bucket, or a pasted external URL. */
  | { kind: "image"; name: string; label: string; help?: string };

/**
 * A list of sub-objects — FAQ questions, cards, buttons.
 *
 * Repeaters cannot nest: `itemFields` is typed as leaf fields only. One level
 * covers every block we have, and nesting would make both the inspector UI and
 * the draft/debounce logic considerably harder for no real gain.
 */
export interface RepeaterFieldSchema {
  kind: "repeater";
  name: string;
  label: string;
  help?: string;
  /** Button label, e.g. "Add question". */
  addLabel: string;
  /** Shape of a new row. An `id` is added automatically. */
  itemDefaults: Record<string, unknown>;
  itemFields: LeafFieldSchema[];
  /** Row header in the collapsed state. */
  itemLabel: (item: Record<string, unknown>, index: number) => string;
  min?: number;
  max?: number;
}

export type FieldSchema = LeafFieldSchema | RepeaterFieldSchema;

/**
 * Every repeater row carries a stable id (from `nanoid()`) so React keys and
 * drag identity survive reordering.
 */
export interface RepeaterItem {
  id: string;
  [key: string]: unknown;
}

/**
 * Passed to every block component.
 *
 * `edit` means the block is rendering inside the editor's NodeView. Blocks
 * should use it to show themselves fully expanded (an FAQ opens every answer,
 * a carousel shows every slide) rather than in their collapsed public state —
 * the author needs to see the content they are editing.
 */
export interface BlockRenderContext {
  mode: "edit" | "view";
}

/*
 * Note the `object` constraint rather than `Record<string, unknown>`.
 *
 * A TypeScript `interface` has no implicit index signature, so an ordinary
 * `interface FaqProps { … }` fails a `Record<string, unknown>` constraint while
 * an equivalent `type` alias passes. That distinction is invisible and would
 * bite whoever writes the next block. `object` accepts both.
 */
export interface BlockDefinition<P extends object = Record<string, unknown>> {
  /**
   * kebab-case, unique.
   *
   * THIS IS THE WIRE FORMAT. It is written into `data-block` in every page that
   * uses the block, so it can never be renamed — only added to. Removing one
   * without a migration strands existing content (see UnknownBlockNode).
   */
  name: string;
  /**
   * Bumped whenever `P` changes shape incompatibly. Stored as
   * `data-block-version`, and read back by `migrate`.
   */
  version: number;
  label: string;
  /** Material Symbols Rounded ligature, for the sidebar tile. */
  icon: string;
  category: "content" | "layout" | "media" | "action";
  /** One line, shown under the label in the sidebar. */
  description: string;
  width: BlockWidth;
  /**
   * Every key MUST have a `.default()`.
   *
   * Props are parsed with `{ ...defaults, ...stored }`, so a block that gains a
   * field still parses content authored before that field existed. Without the
   * defaults, `safeParse` fails and `decodeProps` silently falls back to the
   * whole default object — losing everything the author wrote.
   */
  /*
   * Input is `unknown`, not `P`. Every key carries `.default()`, which makes
   * the schema's *input* type have optional keys while its *output* type is a
   * fully-populated `P` — so the default `z.ZodType<P>` (input === output)
   * would reject exactly the schemas we require.
   */
  schema: z.ZodType<P, z.ZodTypeDef, unknown>;
  defaults: P;
  fields: FieldSchema[];
  Component: ComponentType<P & BlockRenderContext>;
  /** Chrome label when the block is collapsed, e.g. "FAQ · 4 questions". */
  summary?: (props: P) => string;
  /** Contributes a schema.org entity to the page's JSON-LD. */
  jsonLd?: (props: P) => Record<string, unknown> | null;
  /**
   * Upgrade props stored at an older `version`. Runs before schema parsing, so
   * it receives raw JSON and may return anything the current schema accepts.
   */
  migrate?: (
    fromVersion: number,
    raw: Record<string, unknown>,
  ) => Record<string, unknown>;
}

/**
 * The registry is heterogeneous, so it stores definitions with their prop type
 * erased. Call sites re-narrow at the boundary (the NodeView and RichContent
 * both spread `props` into `def.Component`, which is where the erasure lands).
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type AnyBlockDefinition = BlockDefinition<any>;
