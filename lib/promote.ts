// "Promote this page" from a post's Share panel: opens the site popup or the
// announcement banner editor with the page's title, description, image and
// link filled in. Carried in the query string and laid over the loaded
// settings unsaved, so nothing on the site changes until the admin presses
// Save there. Pure, so both ends share one shape.

export type PromoteTarget = "popup" | "banner";

export interface PromoteDraft {
  title: string;
  text: string;
  link: string;
  image: string | null;
}

const LIMITS = { title: 120, text: 300, link: 500 } as const;

export function promoteHref(target: PromoteTarget, draft: PromoteDraft): string {
  const params = new URLSearchParams({ promote: "1", title: draft.title, link: draft.link });
  if (draft.text) params.set("text", draft.text);
  if (draft.image) params.set("image", draft.image);
  return `/admin/${target}?${params.toString()}`;
}

/** The draft in a `?promote=1…` query string, or null. Only https images and site links pass. */
export function readPromote(search: string): PromoteDraft | null {
  const params = new URLSearchParams(search);
  if (params.get("promote") !== "1") return null;
  const link = (params.get("link") ?? "").slice(0, LIMITS.link);
  if (!/^(https:\/\/|\/(?![/\\]))/.test(link)) return null;
  const image = params.get("image");
  return {
    title: (params.get("title") ?? "").slice(0, LIMITS.title),
    text: (params.get("text") ?? "").slice(0, LIMITS.text),
    link,
    image: image && /^https:\/\//.test(image) ? image : null,
  };
}

/** Drops the promote params so a reload shows the saved settings again. */
export function clearPromoteFromUrl() {
  const url = new URL(window.location.href);
  for (const key of ["promote", "title", "text", "link", "image"]) url.searchParams.delete(key);
  window.history.replaceState(null, "", url.pathname + url.search + url.hash);
}
