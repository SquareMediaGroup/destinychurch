-- Sermon series — playlist-backed, following the same "no sermons table"
-- philosophy as speaker_overrides (20260912_02_speaker_overrides.sql).
--
-- A series is just a pointer at a YouTube playlist id. Title, description and
-- membership are never duplicated here — they're always read live from
-- YouTube through lib/sermonSeries.server.ts, exactly like speaker_overrides
-- keeps only a video_id and lets lib/speakerOverrides.server.ts fetch the
-- rest from the API. Admins add/remove rows from /admin/sermons; the public
-- /sermons page reads through the same wrapper to build its Series filter.

create table if not exists public.sermon_series (
  playlist_id text primary key,
  added_by text,
  sort_order integer not null default 0,
  created_at timestamptz not null default now()
);

comment on table public.sermon_series is
  'YouTube playlist ids curated as sermon series. Title/description/membership are always fetched live from YouTube — read through lib/sermonSeries.server.ts.';

alter table public.sermon_series enable row level security;

do $$
begin
  if not exists (select 1 from pg_policies
                 where schemaname = 'public' and tablename = 'sermon_series'
                   and policyname = 'service only')
  then
    create policy "service only" on public.sermon_series using (false) with check (false);
  end if;
end $$;
