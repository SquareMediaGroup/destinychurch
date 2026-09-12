-- Speaker overrides for the sermons archive.
--
-- lib/sermonTitle.ts parses a speaker out of the YouTube title by regex, which
-- gets the current, well-formatted titles right but produces noise on years of
-- inconsistent older ones ("22.03.20", "FULL SERVICE", "DESTINY CHURCH LIVE!").
-- This table lets an AI review (lib/speakerReview.server.ts, triggered from
-- /admin/sermons) correct those per video id, without touching YouTube itself.
--
-- A row with speaker = null is a *confirmed* "no individual speaker" (e.g. a
-- child dedications service) — distinct from no row at all, which means nobody
-- has reviewed this video yet. Every video-serving path in the app should read
-- through lib/speakerOverrides.server.ts rather than lib/youtube.ts directly,
-- so this stays a deliberate, small exception to the sermons feature's
-- otherwise "no DB" design — same pattern as admin_roles.

create table if not exists public.speaker_overrides (
  video_id text primary key,
  speaker text,
  reviewed_by text not null default 'ai',
  reviewed_at timestamptz not null default now()
);

comment on table public.speaker_overrides is
  'AI/human-corrected speaker per YouTube video id, overriding lib/sermonTitle.ts''s regex parse. Read through lib/speakerOverrides.server.ts.';

alter table public.speaker_overrides enable row level security;

do $$
begin
  if not exists (select 1 from pg_policies
                 where schemaname = 'public' and tablename = 'speaker_overrides'
                   and policyname = 'service only')
  then
    create policy "service only" on public.speaker_overrides using (false) with check (false);
  end if;
end $$;
