// A links page, rendered from its resolved data.
//
// No "use client" on purpose: this is a shared component, like the content
// blocks in components/blocks/. It server-renders on /links with only the
// interactive blocks (buttons, events, embeds, forms) shipping JavaScript, and
// the admin editor renders the very same component from unsaved state as its
// live preview — so what the editor shows is what the page will be.

import Link from "next/link";
import "./links.css";
import { LINK_PAGE_FONT_VARS } from "./fonts";
import LinkButton from "./LinkButton";
import LinkEmbed from "./LinkEmbed";
import LinkEvents from "./LinkEvents";
import LinkForm from "./LinkForm";
import SocialIcons from "./SocialIcons";
import { themeToCssVars, type Theme } from "@/lib/linkPages/theme";
import { safeHref, safeMediaUrl } from "@/lib/linkPages/urls";
import type { LinkPageWithId, ResolvedBlock } from "@/lib/linkPages/types";

/** Consecutive plain link buttons, grouped so a grid theme can set them two-up. */
type Group = { kind: "grid"; blocks: ResolvedBlock[] } | { kind: "single"; block: ResolvedBlock };

function groupBlocks(blocks: ResolvedBlock[], grid: boolean): Group[] {
  const groups: Group[] = [];
  for (const block of blocks) {
    const gridable = grid && block.type === "link" && block.data.style === "button";
    const last = groups[groups.length - 1];
    if (gridable && last?.kind === "grid") last.blocks.push(block);
    else if (gridable) groups.push({ kind: "grid", blocks: [block] });
    else groups.push({ kind: "single", block });
  }
  // A "grid" of one is just a button; let it take the full width.
  return groups.map((g) => (g.kind === "grid" && g.blocks.length === 1 ? { kind: "single", block: g.blocks[0] } : g));
}

function Block({ block, preview }: { block: ResolvedBlock; preview: boolean }) {
  switch (block.type) {
    case "link":
      return <LinkButton block={block} preview={preview} />;

    case "header":
      return (
        <h2 className="lp-heading" data-size={block.data.size} data-align={block.data.align}>
          {block.data.text}
        </h2>
      );

    case "text":
      return (
        <p className="lp-text" data-align={block.data.align}>
          {block.data.body}
        </p>
      );

    case "image": {
      const src = safeMediaUrl(block.data.url);
      if (!src) return null;
      const link = safeHref(block.data.link);
      // eslint-disable-next-line @next/next/no-img-element -- admin upload, no intrinsic size
      const img = <img src={src} alt={block.data.alt} loading="lazy" />;
      return link && !preview ? (
        <a className="lp-image" data-aspect={block.data.aspect} href={link}>
          {img}
        </a>
      ) : (
        <div className="lp-image" data-aspect={block.data.aspect}>
          {img}
        </div>
      );
    }

    case "divider":
      return <hr className="lp-divider" data-style={block.data.style} />;

    case "event":
      return block.events && block.events.length > 0 ? (
        <LinkEvents block={block} events={block.events} preview={preview} />
      ) : null;

    case "embed":
      return <LinkEmbed block={block} preview={preview} />;

    case "form":
      return <LinkForm block={block} preview={preview} />;
  }
}

export default function LinkPageView({
  page,
  theme,
  blocks,
  preview = false,
}: {
  page: LinkPageWithId;
  theme: Theme;
  blocks: ResolvedBlock[];
  /** The editor's live preview: no tracking, no navigation, no submissions. */
  preview?: boolean;
}) {
  const bg = theme.background;
  const imageUrl = bg.type === "image" ? safeMediaUrl(bg.imageUrl) : null;
  const videoUrl = bg.type === "video" ? safeMediaUrl(bg.videoUrl) : null;
  const coverUrl = theme.layout.style === "hero" ? safeMediaUrl(theme.layout.coverUrl) : null;
  const avatarUrl = theme.avatar.shape !== "hidden" ? safeMediaUrl(page.avatar_url) : null;
  const groups = groupBlocks(blocks, theme.layout.links === "grid");

  let i = 0;
  const reveal = () => ({ "--lp-i": i++ }) as React.CSSProperties;

  return (
    <div
      className={`lp-root ${LINK_PAGE_FONT_VARS}`}
      style={themeToCssVars(theme) as React.CSSProperties}
      data-btn={theme.button.style}
      data-hover={theme.button.hover}
      data-align={theme.button.align}
      data-radius={theme.button.radius}
      data-links={theme.layout.links}
      data-layout={coverUrl ? "hero" : "classic"}
      data-entrance={String(theme.effects.entrance && !preview)}
      data-preview={String(preview)}
    >
      <div className="lp-bg" aria-hidden="true">
        {imageUrl && (
          // eslint-disable-next-line @next/next/no-img-element -- decorative background
          <img className="lp-bg-media" src={imageUrl} alt="" />
        )}
        {videoUrl && (
          <video
            className="lp-bg-media"
            data-kind="video"
            src={videoUrl}
            poster={safeMediaUrl(bg.imageUrl) ?? undefined}
            autoPlay
            muted
            loop
            playsInline
          />
        )}
        {(imageUrl || videoUrl) && bg.overlay > 0 && <div className="lp-bg-overlay" />}
        {bg.glow && <div className="lp-bg-glow" />}
      </div>

      <div className="lp-main">
        {coverUrl && (
          <div className="lp-cover">
            {/* eslint-disable-next-line @next/next/no-img-element -- admin upload */}
            <img src={coverUrl} alt="" />
          </div>
        )}

        <header className="lp-profile">
          {avatarUrl && (
            // eslint-disable-next-line @next/next/no-img-element -- admin upload
            <img
              className="lp-avatar lp-reveal"
              style={reveal()}
              data-shape={theme.avatar.shape}
              src={avatarUrl}
              alt=""
            />
          )}
          {page.title && (
            <h1 className="lp-title lp-reveal" style={reveal()}>
              {page.title}
            </h1>
          )}
          {page.bio && (
            <p className="lp-bio lp-reveal" style={reveal()}>
              {page.bio}
            </p>
          )}
          {page.socials_position === "top" && page.socials.length > 0 && (
            <div className="lp-reveal" style={reveal()}>
              <SocialIcons socials={page.socials} position="top" preview={preview} />
            </div>
          )}
          {!avatarUrl && !page.socials.length && <div className="lp-rule lp-reveal" style={reveal()} />}
        </header>

        <div className="lp-blocks">
          {groups.map((group) =>
            group.kind === "grid" ? (
              <div key={group.blocks[0].id} className="lp-grid">
                {group.blocks.map((block) => (
                  <div key={block.id} className="lp-reveal" style={reveal()}>
                    <Block block={block} preview={preview} />
                  </div>
                ))}
              </div>
            ) : (
              <div key={group.block.id} className="lp-reveal" style={reveal()}>
                <Block block={group.block} preview={preview} />
              </div>
            ),
          )}
        </div>

        {page.socials_position === "bottom" && page.socials.length > 0 && (
          <SocialIcons socials={page.socials} position="bottom" preview={preview} />
        )}

        {/* No site nav on these pages, so give people one way out. */}
        <footer className="lp-footer">
          <span>Destiny Church Tees Valley</span>
          <Link href="/" prefetch={false} tabIndex={preview ? -1 : undefined}>
            Visit the full website
            <span className="material-symbols-rounded" aria-hidden="true" style={{ fontSize: 16 }}>
              arrow_forward
            </span>
          </Link>
        </footer>
      </div>
    </div>
  );
}
