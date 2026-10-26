-- Destiny One: videos in chat (D1 v0.13).
--
-- A video is an attachment like a photo or voice note, with two differences:
--   * it can be up to 150 MB and 3 minutes (the phone shrinks it to 1080p, or
--     720p on the Standard upload quality, before it is sent), and
--   * the file is deleted from storage 28 days after it was sent. The message
--     stays, so the chat still reads properly, with an "expired" placeholder.
--
-- A video stays past 28 days while it is evidence: if a message carrying it is
-- under a report that hasn't been closed, or a safeguarding lead has put a
-- hold on it. The deleting itself is /api/cron/destiny-one-video-expiry, which
-- removes the storage objects d1_expire_videos() hands back.

-- ── Types and sizes ─────────────────────────────────────────────────────────
alter table public.d1_attachments drop constraint if exists d1_attachments_mime_type_check;
alter table public.d1_attachments add constraint d1_attachments_mime_type_check
  check (mime_type in ('image/jpeg', 'image/png', 'image/webp', 'image/heic', 'application/pdf', 'audio/mp4',
                       'video/mp4', 'video/quicktime', 'video/x-m4v'));

alter table public.d1_attachments drop constraint if exists d1_attachments_size_bytes_check;
alter table public.d1_attachments add constraint d1_attachments_size_bytes_check
  check (
    size_bytes is null
    or (mime_type like 'video/%' and size_bytes between 1 and 157286400)
    or (mime_type not like 'video/%' and size_bytes between 1 and 20971520)
  );

alter table public.d1_attachments drop constraint if exists d1_attachments_duration;
alter table public.d1_attachments add constraint d1_attachments_duration
  check (
    duration_ms is null
    or (mime_type like 'video/%' and duration_ms between 1 and 180000)
    or (mime_type not like 'video/%' and duration_ms between 1 and 300000)
  );

-- ── Expiry ──────────────────────────────────────────────────────────────────
alter table public.d1_attachments add column if not exists expires_at timestamptz;
alter table public.d1_attachments add column if not exists expired_at timestamptz;
alter table public.d1_attachments add column if not exists held boolean not null default false;

comment on column public.d1_attachments.expires_at is
  'Videos: when the file is deleted from storage (28 days after upload). Null for everything else.';
comment on column public.d1_attachments.expired_at is
  'Videos: when the file was deleted. The row and the message stay.';
comment on column public.d1_attachments.held is
  'A safeguarding lead has put a hold on the file: it is not deleted when it expires.';

create or replace function public.d1_attachments_set_expiry()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.mime_type like 'video/%' and new.expires_at is null then
    new.expires_at := coalesce(new.created_at, now()) + interval '28 days';
  end if;
  return new;
end;
$$;

drop trigger if exists d1_attachments_set_expiry on public.d1_attachments;
create trigger d1_attachments_set_expiry
  before insert on public.d1_attachments
  for each row execute function public.d1_attachments_set_expiry();

create index if not exists d1_attachments_expiry_idx
  on public.d1_attachments (expires_at)
  where expires_at is not null and expired_at is null;

-- Marks every video past its date as expired and returns the storage paths to
-- delete. Skips a video that is held, or that a message under an open report
-- carries (evidence stays however old, same rule as d1_purge_expired).
create or replace function public.d1_expire_videos()
returns table (attachment_paths text[])
language plpgsql
security definer
set search_path = ''
as $$
declare
  paths text[];
begin
  with gone as (
    update public.d1_attachments a
      set expired_at = now()
      where a.mime_type like 'video/%'
        and a.expires_at <= now()
        and a.expired_at is null
        and not a.held
        and not exists (
          select 1
          from public.d1_messages m
          join public.d1_reports r on r.message_id = m.id and r.status <> 'closed'
          where m.attachment_id = a.id
        )
      returning a.storage_path
  )
  select coalesce(array_agg(storage_path), '{}') into paths from gone;

  return query select paths;
end;
$$;

revoke all on function public.d1_expire_videos() from public, anon, authenticated;
grant execute on function public.d1_expire_videos() to service_role;

-- ── Bucket ──────────────────────────────────────────────────────────────────
-- Raised to fit a video. Photos and PDFs are still held to 20 MB by the upload
-- endpoint, which checks the size the app declares.
update storage.buckets
  set file_size_limit = 157286400,
      allowed_mime_types = (
        select array_agg(distinct m)
        from unnest(allowed_mime_types || array['video/mp4', 'video/quicktime', 'video/x-m4v']) as m
      )
  where id = 'd1-chat-media'
    and allowed_mime_types is not null;
