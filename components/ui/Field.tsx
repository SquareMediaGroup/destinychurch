"use client";

import { useId } from "react";
import type {
  ComponentPropsWithoutRef,
  ReactNode,
  SelectHTMLAttributes,
} from "react";
import { cn } from "@/lib/cn";
import Icon from "@/components/ui/Icon";

/**
 * Form fields: one input shape, wired up correctly.
 *
 * There were four competing input styles — `components/admin/AdminUI.tsx`'s
 * shared `inputClass`, a local redeclaration of it in `app/admin/nfc/page.tsx`
 * (with a different focus-ring opacity), a third in `app/jobs/ApplyForm.tsx`
 * (`rounded-xl bg-white`), and a fourth written inline four times in
 * `app/contact/ContactForm.tsx` (`rounded-2xl bg-surface-muted`). Two different
 * corner radii and two different backgrounds for the same control.
 *
 * The bigger problem was semantics. The codebase had 189 `<label>` elements and
 * 66 `htmlFor` attributes, so roughly two thirds of labels were not associated
 * with anything — clicking them does nothing and a screen reader announces the
 * field as unlabelled. And `aria-invalid` and `aria-describedby` appeared
 * nowhere at all, so a validation error was visible text next to a field that
 * did not know it was in an error state.
 *
 * `Field` generates the id, wires label → control → error → hint, and sets
 * `aria-invalid` when there is an error. Getting it wrong requires effort.
 */

const CONTROL =
  "w-full rounded-xl border bg-surface-muted px-4 py-3 text-sm text-destiny-grey transition placeholder:text-subtle focus:outline-none focus:ring-2 disabled:cursor-not-allowed disabled:opacity-60";

const CONTROL_OK =
  "border-hairline focus:border-destiny-orange focus:ring-destiny-orange/30";

// Colour alone cannot be the error signal (WCAG 1.4.1), so an errored field
// also gets the message text beneath it, tied on with aria-describedby.
const CONTROL_ERROR =
  "border-red-400 focus:border-red-500 focus:ring-red-500/30";

function controlClasses(invalid: boolean, className?: string) {
  return cn(CONTROL, invalid ? CONTROL_ERROR : CONTROL_OK, className);
}

type FieldShellProps = {
  label: ReactNode;
  /** Persistent helper text, rendered above any error. */
  hint?: ReactNode;
  error?: string;
  required?: boolean;
  /**
   * Classes for the field WRAPPER, not the control — this is where grid
   * placement goes (`md:col-span-2`). Use `controlClassName` to style the
   * input itself; keeping them apart stops `w-full` on a wrapper silently
   * fighting `w-full` on the input.
   */
  className?: string;
  /** Classes for the input/textarea/select element. */
  controlClassName?: string;
};

function FieldShell({
  id,
  label,
  hint,
  error,
  required,
  className,
  children,
}: FieldShellProps & { id: string; children: ReactNode }) {
  return (
    <div className={className}>
      <label
        htmlFor={id}
        className="mb-1.5 block text-sm font-bold text-destiny-grey"
      >
        {label}
        {required && (
          <>
            {" "}
            <span className="text-destiny-orange" aria-hidden="true">
              *
            </span>
            <span className="sr-only">(required)</span>
          </>
        )}
      </label>

      {children}

      {hint && !error && (
        <p id={`${id}-hint`} className="mt-1.5 text-xs text-subtle">
          {hint}
        </p>
      )}

      {error && (
        <p
          id={`${id}-error`}
          className="mt-1.5 flex items-center gap-1 text-xs font-medium text-red-600"
        >
          <Icon name="error" size="xs" />
          {error}
        </p>
      )}
    </div>
  );
}

/** Which element describes the control right now, if any. */
function describedBy(id: string, hint: unknown, error: unknown) {
  if (error) return `${id}-error`;
  if (hint) return `${id}-hint`;
  return undefined;
}

export function Field({
  label,
  hint,
  error,
  className,
  controlClassName,
  id: providedId,
  ...input
}: FieldShellProps & ComponentPropsWithoutRef<"input">) {
  const generatedId = useId();
  const id = providedId ?? generatedId;

  return (
    <FieldShell
      id={id}
      label={label}
      hint={hint}
      error={error}
      required={input.required}
      className={className}
    >
      <input
        {...input}
        id={id}
        aria-invalid={error ? true : undefined}
        aria-describedby={describedBy(id, hint, error)}
        className={controlClasses(Boolean(error), controlClassName)}
      />
    </FieldShell>
  );
}

export function TextareaField({
  label,
  hint,
  error,
  className,
  controlClassName,
  id: providedId,
  ...textarea
}: FieldShellProps & ComponentPropsWithoutRef<"textarea">) {
  const generatedId = useId();
  const id = providedId ?? generatedId;

  return (
    <FieldShell
      id={id}
      label={label}
      hint={hint}
      error={error}
      required={textarea.required}
      className={className}
    >
      <textarea
        {...textarea}
        id={id}
        aria-invalid={error ? true : undefined}
        aria-describedby={describedBy(id, hint, error)}
        className={controlClasses(
          Boolean(error),
          cn("resize-none", controlClassName),
        )}
      />
    </FieldShell>
  );
}

export function SelectField({
  label,
  hint,
  error,
  className,
  controlClassName,
  id: providedId,
  children,
  ...select
}: FieldShellProps & SelectHTMLAttributes<HTMLSelectElement>) {
  const generatedId = useId();
  const id = providedId ?? generatedId;

  return (
    <FieldShell
      id={id}
      label={label}
      hint={hint}
      error={error}
      required={select.required}
      className={className}
    >
      {/* `appearance-none` removes the native chevron, so we have to draw one.
          The contact form stripped it and drew nothing, leaving a select that
          gave no sign it could be opened. */}
      <div className="relative">
        <select
          {...select}
          id={id}
          aria-invalid={error ? true : undefined}
          aria-describedby={describedBy(id, hint, error)}
          className={controlClasses(
            Boolean(error),
            cn("appearance-none pr-11", controlClassName),
          )}
        >
          {children}
        </select>
        <Icon
          name="expand_more"
          size="lg"
          className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-subtle"
        />
      </div>
    </FieldShell>
  );
}
