"use client";

// The top of a links page: photo, name, bio and the row of social icons.

import { FieldShell, SelectField, TextAreaField, TextField, fieldInputClass } from "@/components/admin/blocks/fields/BasicFields";
import { ImageField } from "@/components/admin/blocks/fields/ImageField";
import { SOCIAL_KEYS, SOCIAL_PLATFORMS, normaliseSocialUrl, type SocialKey } from "@/lib/linkPages/socials";
import { safeHref } from "@/lib/linkPages/urls";
import type { EditorPage } from "./editorTypes";

function Card({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="rounded-2xl border border-black/8 bg-white p-4 dark:border-white/8 dark:bg-destiny-grey-800">
      <h3 className="mb-4 text-sm font-black text-destiny-grey dark:text-white">{title}</h3>
      <div className="space-y-4">{children}</div>
    </section>
  );
}

function PlatformIcon({ platform }: { platform: SocialKey }) {
  const p = SOCIAL_PLATFORMS[platform];
  return "path" in p ? (
    <svg viewBox="0 0 24 24" className="h-5 w-5 fill-current" aria-hidden="true">
      <path d={p.path} />
    </svg>
  ) : (
    <span className="material-symbols-rounded text-xl" aria-hidden="true">
      {p.material}
    </span>
  );
}

export default function ProfileTab({
  page,
  setPage,
}: {
  page: EditorPage;
  setPage: (patch: Partial<EditorPage>) => void;
}) {
  const socials = page.socials;
  const setSocials = (next: EditorPage["socials"]) => setPage({ socials: next });
  const unused = SOCIAL_KEYS.filter((k) => !socials.some((s) => s.platform === k));

  const move = (i: number, delta: number) => {
    const j = i + delta;
    if (j < 0 || j >= socials.length) return;
    const next = [...socials];
    [next[i], next[j]] = [next[j], next[i]];
    setSocials(next);
  };

  return (
    <div className="space-y-4">
      <Card title="Profile">
        <ImageField label="Photo or logo" value={page.avatar_url} onChange={(v) => setPage({ avatar_url: v })} />
        <TextField label="Name" value={page.title} maxLength={80} onChange={(v) => setPage({ title: v })} />
        <TextAreaField
          label="Bio"
          value={page.bio}
          rows={3}
          maxLength={300}
          placeholder="A line or two about who this page is for"
          onChange={(v) => setPage({ bio: v })}
        />
      </Card>

      <Card title="Social icons">
        {socials.length > 0 && (
          <ul className="space-y-2">
            {socials.map((social, i) => {
              const platform = SOCIAL_PLATFORMS[social.platform];
              const shown = social.url.replace(/^mailto:/i, "").replace(/^tel:/i, "");
              const bad = social.url.trim() !== "" && safeHref(social.url) === null;
              return (
                <li key={social.platform} className="flex items-center gap-2">
                  <span
                    className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-black/5 text-destiny-grey dark:bg-white/10 dark:text-white"
                    title={platform.label}
                  >
                    <PlatformIcon platform={social.platform} />
                  </span>
                  <input
                    className={`${fieldInputClass} min-w-0 flex-1 ${bad ? "border-destiny-red/50" : ""}`}
                    value={shown}
                    aria-label={`${platform.label} link`}
                    placeholder={platform.placeholder}
                    onChange={(e) =>
                      setSocials(
                        socials.map((s, j) =>
                          j === i ? { ...s, url: normaliseSocialUrl(s.platform, e.target.value) } : s,
                        ),
                      )
                    }
                  />
                  <div className="flex shrink-0">
                    <button
                      type="button"
                      aria-label={`Move ${platform.label} left`}
                      onClick={() => move(i, -1)}
                      disabled={i === 0}
                      className="flex h-9 w-8 items-center justify-center rounded-lg text-destiny-grey/45 hover:bg-black/5 disabled:opacity-30"
                    >
                      <span className="material-symbols-rounded text-lg" aria-hidden="true">arrow_upward</span>
                    </button>
                    <button
                      type="button"
                      aria-label={`Remove ${platform.label}`}
                      onClick={() => setSocials(socials.filter((_, j) => j !== i))}
                      className="flex h-9 w-8 items-center justify-center rounded-lg text-destiny-grey/45 hover:bg-destiny-red/5 hover:text-destiny-red"
                    >
                      <span className="material-symbols-rounded text-lg" aria-hidden="true">close</span>
                    </button>
                  </div>
                </li>
              );
            })}
          </ul>
        )}

        {unused.length > 0 && (
          <FieldShell label="Add">
            <div className="flex flex-wrap gap-2">
              {unused.map((key) => (
                <button
                  key={key}
                  type="button"
                  onClick={() => setSocials([...socials, { platform: key, url: "" }])}
                  className="inline-flex items-center gap-1.5 rounded-full border border-black/10 px-3 py-1.5 text-xs font-bold text-destiny-grey/70 transition hover:border-destiny-orange/50 hover:text-destiny-orange dark:border-white/10 dark:text-white/70"
                >
                  <PlatformIcon platform={key} />
                  {SOCIAL_PLATFORMS[key].label}
                </button>
              ))}
            </div>
          </FieldShell>
        )}

        <SelectField
          label="Where"
          value={page.socials_position}
          options={[
            { value: "top", label: "Under the bio" },
            { value: "bottom", label: "At the bottom of the page" },
          ]}
          onChange={(v) => setPage({ socials_position: v as EditorPage["socials_position"] })}
        />
      </Card>
    </div>
  );
}
