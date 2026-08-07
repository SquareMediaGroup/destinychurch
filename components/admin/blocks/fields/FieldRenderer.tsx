"use client";

import type { FieldSchema, RepeaterItem, Tone } from "@/components/blocks/types";
import {
  NumberField,
  SelectField,
  TextAreaField,
  TextField,
  ToggleField,
  ToneField,
  UrlField,
} from "./BasicFields";
import { IconField } from "./IconField";
import { ImageField } from "./ImageField";
import { RepeaterField } from "./RepeaterField";

/**
 * Renders one inspector field from its schema.
 *
 * This switch is the only place field kinds are turned into UI, which is what
 * lets a block declare its settings declaratively instead of shipping a bespoke
 * form. Adding a field kind means a case here and a member of the FieldSchema
 * union — nothing per block.
 */
export function FieldRenderer({
  field,
  value,
  onChange,
  depth = 0,
}: {
  field: FieldSchema;
  value: unknown;
  onChange: (next: unknown) => void;
  depth?: number;
}) {
  switch (field.kind) {
    case "text":
      return (
        <TextField
          label={field.label}
          help={field.help}
          placeholder={field.placeholder}
          maxLength={field.maxLength}
          value={asString(value)}
          onChange={onChange}
        />
      );

    case "textarea":
      return (
        <TextAreaField
          label={field.label}
          help={field.help}
          placeholder={field.placeholder}
          rows={field.rows}
          maxLength={field.maxLength}
          value={asString(value)}
          onChange={onChange}
        />
      );

    case "url":
      return (
        <UrlField
          label={field.label}
          help={field.help}
          placeholder={field.placeholder}
          value={asString(value)}
          onChange={onChange}
        />
      );

    case "number":
      return (
        <NumberField
          label={field.label}
          help={field.help}
          min={field.min}
          max={field.max}
          step={field.step}
          value={typeof value === "number" ? value : 0}
          onChange={onChange}
        />
      );

    case "toggle":
      return (
        <ToggleField
          label={field.label}
          help={field.help}
          value={value === true}
          onChange={onChange}
        />
      );

    case "select":
      return (
        <SelectField
          label={field.label}
          help={field.help}
          options={field.options}
          value={asString(value)}
          onChange={onChange}
        />
      );

    case "tone":
      return (
        <ToneField
          label={field.label}
          help={field.help}
          options={field.options as Tone[]}
          value={asString(value)}
          onChange={onChange}
        />
      );

    case "icon":
      return (
        <IconField
          label={field.label}
          help={field.help}
          value={asString(value)}
          onChange={onChange}
        />
      );

    case "image":
      return (
        <ImageField
          label={field.label}
          help={field.help}
          value={asString(value)}
          onChange={onChange}
        />
      );

    case "repeater":
      // Guarded rather than typed away: the FieldSchema union already forbids
      // nesting, but a hand-built schema object could still get here.
      if (depth > 0) {
        throw new Error(
          `Nested repeaters are not supported (field "${field.name}").`,
        );
      }
      return (
        <RepeaterField
          field={field}
          value={Array.isArray(value) ? (value as RepeaterItem[]) : []}
          onChange={onChange as (next: RepeaterItem[]) => void}
        />
      );
  }
}

function asString(value: unknown): string {
  return typeof value === "string" ? value : "";
}
