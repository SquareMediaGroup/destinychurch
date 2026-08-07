import MediaEmbed from "@/components/missions/MediaEmbed";
import type { BlockRenderContext } from "../types";
import { BODY_MUTED } from "../tokens";

export interface VideoProps {
  url: string;
  caption: string;
}

/**
 * A YouTube video.
 *
 * NOTE: unlike every other block, this one pulls in a client component
 * (`MediaEmbed`) and therefore ships JavaScript. That is deliberate.
 * `MediaEmbed` is the site's existing pattern for third-party video: it holds
 * the embed back behind a cookie-consent placeholder until the visitor opts in
 * to media cookies, matching `ChurchSuiteEmbed` and the site's privacy policy.
 *
 * The toolbar's old YouTube button did not do this — it inserted a bare
 * <iframe> straight into the stored HTML, which loads YouTube (and its cookies)
 * before the visitor has agreed to anything. Blocks route through the same gate
 * as the rest of the site instead.
 */
export default function VideoBlock({
  url,
  caption,
  mode,
}: VideoProps & BlockRenderContext) {
  const id = youTubeId(url);

  if (!id) {
    return mode === "edit" ? (
      <div className="rounded-2xl border border-dashed border-black/15 px-5 py-6 text-center text-sm text-destiny-grey/45">
        {url.trim()
          ? "That doesn't look like a YouTube link."
          : "Paste a YouTube link in the settings panel."}
      </div>
    ) : null;
  }

  return (
    <figure>
      <MediaEmbed
        // youtube-nocookie defers YouTube's own cookies until playback, on top
        // of the consent gate MediaEmbed already applies.
        src={`https://www.youtube-nocookie.com/embed/${id}`}
        title={caption || "Video"}
      />
      {caption && <figcaption className={`mt-3 ${BODY_MUTED}`}>{caption}</figcaption>}
    </figure>
  );
}

/**
 * Pull the video id out of whatever an admin pasted — a watch URL, a share
 * link, an embed URL, a Shorts link, or the bare id.
 */
export function youTubeId(input: string): string | null {
  const value = (input ?? "").trim();
  if (!value) return null;

  // A bare id.
  if (/^[\w-]{11}$/.test(value)) return value;

  const match = value.match(
    /(?:youtube\.com\/(?:watch\?(?:.*&)?v=|embed\/|shorts\/|live\/)|youtu\.be\/)([\w-]{11})/,
  );
  return match ? match[1] : null;
}
