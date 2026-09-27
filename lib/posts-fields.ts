// Validation for the page-settings fields shared by the posts POST and PATCH
// routes. Only keys present on the request body are returned, so PATCH stays
// a partial update.
import { DESCRIPTION_LIMIT, HERO_STYLES } from "@/lib/posts";

type Result = { ok: true; fields: Record<string, unknown> } | { ok: false; error: string };

const optionalText = (v: unknown) => (typeof v === "string" && v.trim() ? v.trim() : null);

export function parsePageSettings(body: Record<string, unknown>): Result {
  const fields: Record<string, unknown> = {};

  if (body.hero_style !== undefined) {
    if (!HERO_STYLES.some((s) => s.value === body.hero_style)) {
      return { ok: false, error: "Unknown hero style." };
    }
    fields.hero_style = body.hero_style;
  }
  for (const key of ["hero_image_url", "og_image_url"] as const) {
    if (body[key] === undefined) continue;
    const url = optionalText(body[key]);
    if (url && !/^https:\/\//.test(url)) {
      return { ok: false, error: "Images must be https URLs." };
    }
    fields[key] = url;
  }
  if (body.subtitle !== undefined) fields.subtitle = optionalText(body.subtitle);
  if (body.description !== undefined) {
    const d = optionalText(body.description);
    if (d && d.length > DESCRIPTION_LIMIT * 2) {
      return { ok: false, error: "The description is too long." };
    }
    fields.description = d;
  }
  if (body.show_rails !== undefined) fields.show_rails = Boolean(body.show_rails);

  if (fields.hero_style === "image" && body.hero_image_url !== undefined && !fields.hero_image_url) {
    return { ok: false, error: "The Image hero needs an image." };
  }
  return { ok: true, fields };
}
