-- Destiny One part 9: "Report a problem" and "Send feedback" from the app.
--
-- The app's Profile tab sends these to POST /api/app/v1/one/feedback. They
-- are kept here, not as GitHub issues: the repository is public, and many
-- members are young people. Destiny One Admins read them at
-- /admin/destiny-one/feedback and get a bell notification for each one (the
-- notification never includes what was written).
--
-- Feedback is personal data: it is in the data export, deleted with the
-- account, and purged after the message retention period.

create table if not exists public.d1_feedback (
  id uuid primary key default gen_random_uuid(),
  member_id uuid not null references public.d1_members (id) on delete cascade,
  kind text not null check (kind in ('problem', 'idea')),
  body text not null check (char_length(body) between 1 and 2000),
  -- Filled in by the app, to help reproduce a problem. No names or emails.
  app_version text check (char_length(app_version) <= 40),
  platform text check (char_length(platform) <= 20),
  os_version text check (char_length(os_version) <= 40),
  device text check (char_length(device) <= 80),
  error_id text check (char_length(error_id) <= 64),
  status text not null default 'new' check (status in ('new', 'done')),
  created_at timestamptz not null default now(),
  done_at timestamptz
);

create index if not exists d1_feedback_created_idx on public.d1_feedback (created_at desc);
create index if not exists d1_feedback_member_idx on public.d1_feedback (member_id);

alter table public.d1_feedback enable row level security;
drop policy if exists "service only" on public.d1_feedback;
create policy "service only" on public.d1_feedback using (false) with check (false);

comment on table public.d1_feedback is
  'Destiny One "Report a problem" / "Send feedback". Read by Destiny One Admins. Deleted with the account and after the retention period.';

-- ── Bell notification for Destiny One Admins ────────────────────────────────

create or replace function public.d1_feedback_notify()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  roles text[] := array['destiny_one_admin'];
  summary text;
  nid bigint;
  created timestamptz;
  payload jsonb;
  r text;
begin
  summary := case new.kind
    when 'problem' then 'Someone reported a problem with Destiny One'
    else 'New feedback about Destiny One'
  end;

  insert into public.notifications (section, kind, entity_id, entity_label, summary, href, roles, metadata)
    values ('destiny_one', 'd1_feedback', new.id::text, null, summary, '/admin/destiny-one/feedback', roles,
            jsonb_build_object('kind', new.kind))
    returning id, created_at into nid, created;

  payload := jsonb_build_object(
    'id', nid, 'createdAt', created, 'section', 'destiny_one', 'kind', 'd1_feedback',
    'entityId', new.id::text, 'entityLabel', null, 'summary', summary,
    'href', '/admin/destiny-one/feedback', 'roles', to_jsonb(roles));

  foreach r in array roles || array['super_admin'] loop
    perform realtime.send(payload, 'notification', 'admin-notifications:' || r, true);
  end loop;
  return null;
end;
$$;

drop trigger if exists d1_feedback_notify on public.d1_feedback;
create trigger d1_feedback_notify
  after insert on public.d1_feedback
  for each row execute function public.d1_feedback_notify();

-- ── Retention and erasure cover feedback ────────────────────────────────────

create or replace function public.d1_purge_expired(p_retain_days integer)
returns table (messages_deleted integer, attachment_paths text[], members_deleted integer)
language plpgsql
security definer
set search_path = ''
as $$
declare
  cutoff timestamptz := now() - make_interval(days => greatest(p_retain_days, 30));
  n_msgs integer;
  paths text[];
  n_members integer;
begin
  with gone as (
    delete from public.d1_messages m
      where m.created_at < cutoff
        -- Evidence for a report that hasn't been closed stays, however old.
        and not exists (
          select 1 from public.d1_reports r
          where r.message_id = m.id and r.status <> 'closed'
        )
      returning m.attachment_id
  )
  select count(*)::integer into n_msgs from gone;

  -- Attachments still referenced by a kept message survive here too.
  with gone as (
    delete from public.d1_attachments a
      where a.created_at < cutoff
        and not exists (select 1 from public.d1_messages m where m.attachment_id = a.id)
      returning storage_path
  )
  select coalesce(array_agg(storage_path), '{}') into paths from gone;

  with gone as (
    delete from public.d1_members mem
      where mem.status = 'deleted'
        and not exists (select 1 from public.d1_messages m where m.sender_id = mem.id)
      returning 1
  )
  select count(*)::integer into n_members from gone;

  delete from public.d1_safeguarding_events where created_at < cutoff and resolved_at is not null;
  delete from public.d1_reports where created_at < cutoff and status = 'closed';
  delete from public.d1_feedback where created_at < cutoff;

  return query select n_msgs, paths, n_members;
end;
$$;

create or replace function public.d1_erase_member(p_member uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  gid uuid;
begin
  for gid in
    update public.d1_group_members set left_at = now()
      where member_id = p_member and left_at is null
      returning group_id
  loop
    perform public.d1_emit('d1-group:' || gid, 'members_changed', jsonb_build_object('groupId', gid));
  end loop;

  delete from public.d1_community_members where member_id = p_member;
  delete from public.d1_push_tokens where member_id = p_member;
  delete from public.d1_reactions where member_id = p_member;
  delete from public.d1_consents where member_id = p_member;
  delete from public.d1_blocks where blocker_id = p_member or blocked_id = p_member;
  delete from public.d1_feedback where member_id = p_member;

  update public.d1_members
    set status = 'deleted', display_name = 'Former member', roles = '{}',
        churchsuite_contact_id = null, churchsuite_child_id = null, churchsuite_user_id = null,
        adult_on = null, avatar_url = null, deleted_at = now()
    where id = p_member;
end;
$$;

revoke all on function public.d1_feedback_notify() from public, anon, authenticated;
revoke all on function public.d1_purge_expired(integer) from public, anon, authenticated;
grant execute on function public.d1_purge_expired(integer) to service_role;
revoke all on function public.d1_erase_member(uuid) from public, anon, authenticated;
grant execute on function public.d1_erase_member(uuid) to service_role;
