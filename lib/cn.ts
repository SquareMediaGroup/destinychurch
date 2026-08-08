/**
 * Join class names, dropping anything falsy.
 *
 * Deliberately not clsx/tailwind-merge: nothing here needs conflict
 * resolution, and a five-line helper beats two more dependencies.
 */
export function cn(...parts: (string | false | null | undefined)[]): string {
  return parts.filter(Boolean).join(" ");
}
