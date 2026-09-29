import type { Post } from "@/lib/posts";

/**
 * The opening of a post page, chosen per post from three presets. Kept to
 * presets on purpose — admins pick how a page opens, not how it's styled.
 *
 *  - plain:  the title (and subtitle) above the content, as posts always were
 *  - image:  full-bleed photo with the title over a dark scrim
 *  - banner: a solid brand-orange band with the title in white
 *
 * `image` without an image falls back to `plain` rather than rendering an
 * empty dark box.
 */
export function PostHero({ post }: { post: Pick<Post, "title" | "subtitle" | "hero_style" | "hero_image_url"> }) {
  const style = post.hero_style === "image" && !post.hero_image_url ? "plain" : post.hero_style;

  if (style === "image") {
    return (
      <header className="relative isolate flex min-h-[320px] items-end overflow-hidden bg-destiny-grey md:min-h-[440px]">
        {/* eslint-disable-next-line @next/next/no-img-element -- admin-uploaded URL from Supabase Storage */}
        <img
          src={post.hero_image_url!}
          alt=""
          className="absolute inset-0 -z-10 h-full w-full object-cover"
        />
        <div aria-hidden className="absolute inset-0 -z-10 bg-gradient-to-t from-black/75 via-black/30 to-transparent" />
        <div className="mx-auto w-full max-w-3xl px-4 pb-10 pt-24 lg:px-8">
          <h1 className="text-3xl font-black text-white md:text-5xl">{post.title}</h1>
          {post.subtitle && <p className="mt-3 max-w-2xl text-lg text-white/85">{post.subtitle}</p>}
        </div>
      </header>
    );
  }

  if (style === "banner") {
    return (
      <header className="bg-destiny-orange">
        <div className="mx-auto w-full max-w-3xl px-4 py-14 lg:px-8 md:py-20">
          <h1 className="text-3xl font-black text-white md:text-5xl">{post.title}</h1>
          {post.subtitle && <p className="mt-3 max-w-2xl text-lg text-white/90">{post.subtitle}</p>}
        </div>
      </header>
    );
  }

  return null;
}

/** The plain-style title, rendered inside the article column. */
export function PostPlainTitle({ post }: { post: Pick<Post, "title" | "subtitle"> }) {
  return (
    <>
      <h1 className="text-3xl font-black text-destiny-grey md:text-4xl">{post.title}</h1>
      {post.subtitle && <p className="mt-3 text-lg text-destiny-grey/60">{post.subtitle}</p>}
    </>
  );
}
