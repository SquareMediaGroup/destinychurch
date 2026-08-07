import ChurchSuiteEmbed from "@/components/ChurchSuiteEmbed";
import type { BlockRenderContext } from "../types";

/** The account every ChurchSuite embed on this site points at. */
const CHURCHSUITE_ACCOUNT = "destinytees.churchsuite.com";

export interface ChurchSuiteProps {
  form: string;
  title: string;
  height: number;
}

/**
 * A ChurchSuite form.
 *
 * Like the video block, this wraps an existing client component rather than
 * emitting a bare <iframe>, so the embed sits behind the site's cookie-consent
 * placeholder. The toolbar's old ChurchSuite button built an iframe string by
 * hand and inserted it into the stored HTML, which loaded ChurchSuite before
 * the visitor had agreed to anything — and left the form code uneditable
 * afterwards, since it was baked into the markup.
 */
export default function ChurchSuiteBlock({
  form,
  title,
  height,
  mode,
}: ChurchSuiteProps & BlockRenderContext) {
  const src = churchSuiteEmbedUrl(form);

  if (!src) {
    return mode === "edit" ? (
      <div className="rounded-2xl border border-dashed border-black/15 px-5 py-6 text-center text-sm text-destiny-grey/45">
        {form.trim()
          ? "That doesn't look like a ChurchSuite form link or code."
          : "Add a ChurchSuite form link or code in the settings panel."}
      </div>
    ) : null;
  }

  return (
    <ChurchSuiteEmbed
      src={src}
      title={title || "Form"}
      minHeight={height > 0 ? height : 600}
    />
  );
}

/**
 * Accept either a full URL or a bare form slug.
 *
 * Moved here from the editor toolbar so the block owns it; the toolbar button
 * that used to call it is gone.
 */
export function churchSuiteEmbedUrl(input: string): string | null {
  const value = (input ?? "").trim();
  if (!value) return null;
  if (/^https?:\/\//i.test(value)) return value;

  const slug = value.replace(/^\/+|\/+$/g, "");
  if (!/^[a-z0-9-]+$/i.test(slug)) return null;
  return `https://${CHURCHSUITE_ACCOUNT}/forms/${slug}`;
}
