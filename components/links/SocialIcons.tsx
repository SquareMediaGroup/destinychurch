// The row of social icons on a links page. Shared component (no "use client"):
// plain anchors, nothing to hydrate.

import { SOCIAL_PLATFORMS, type SocialKey } from "@/lib/linkPages/socials";
import { safeHref } from "@/lib/linkPages/urls";

export default function SocialIcons({
  socials,
  position,
  preview,
}: {
  socials: { platform: SocialKey; url: string }[];
  position: "top" | "bottom";
  preview: boolean;
}) {
  return (
    <nav className="lp-socials" data-position={position} aria-label="Social links">
      {socials.map((social, index) => {
        const platform = SOCIAL_PLATFORMS[social.platform];
        const href = safeHref(social.url);
        if (!platform || !href) return null;
        const external = /^https?:/i.test(href);
        return (
          <a
            key={`${social.platform}-${index}`}
            className="lp-social"
            href={preview ? undefined : href}
            aria-label={platform.label}
            title={platform.label}
            {...(external && !preview ? { target: "_blank", rel: "noopener noreferrer" } : {})}
          >
            {"path" in platform && platform.path ? (
              <svg viewBox="0 0 24 24" aria-hidden="true">
                <path d={platform.path} />
              </svg>
            ) : (
              <span className="material-symbols-rounded" aria-hidden="true">
                {"material" in platform ? platform.material : "link"}
              </span>
            )}
          </a>
        );
      })}
    </nav>
  );
}
