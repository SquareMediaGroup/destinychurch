-- Destiny One part 6: safeguarding fixes from the production readiness audit
-- (apps/destiny-one/todo.md).
--
--   1. The retention purge never deletes a message that is still under an
--      open (or reviewing) report: evidence stays until the report is closed.
--   2. Account erasure also removes consent records and the profile picture
--      reference (the API deletes the file itself).
--   3. Profile pictures are private: the d1-avatars bucket stops being public
--      and d1_members.avatar_url holds a storage path, not a public URL. The
--      API hands out short-lived signed links.
--   4. Blocking: a member can block another member. Their messages are hidden
--      for the blocker (chat list preview, unread count, search, message
--      pages; the API filters the rest) and they stop notifying them. Nobody
--      leaves a group, so the 2-adult rule is untouched, and nothing is hidden
--      from safeguarding: the block itself is logged as a safeguarding event.
--   5. Safeguarding takedown: a safeguarding admin can remove a message for
--      everyone. It is a soft delete like any other, so the content stays
--      reviewable until the retention purge.

-- ── 1. Retention keeps reported messages ────────────────────────────────────

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

  return query select n_msgs, paths, n_members;
end;
$$;

-- ── 2. Erasure removes consents and the picture reference ───────────────────

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

  update public.d1_members
    set status = 'deleted', display_name = 'Former member', roles = '{}',
        churchsuite_contact_id = null, churchsuite_child_id = null, churchsuite_user_id = null,
        adult_on = null, avatar_url = null, deleted_at = now()
    where id = p_member;
end;
$$;

-- ── 3. Private profile pictures ─────────────────────────────────────────────

update storage.buckets set public = false where id = 'd1-avatars';
drop policy if exists "Public read access for d1-avatars" on storage.objects;

-- Existing values are full public URLs (…/object/public/d1-avatars/<path>).
update public.d1_members
  set avatar_url = regexp_replace(avatar_url, '^.*/d1-avatars/', '')
  where avatar_url like '%/d1-avatars/%';

comment on column public.d1_members.avatar_url is
  'Storage path in the private d1-avatars bucket. The API returns a short-lived signed URL.';

-- ── 4. Blocking ─────────────────────────────────────────────────────────────

create table if not exists public.d1_blocks (
  blocker_id uuid not null references public.d1_members (id) on delete cascade,
  blocked_id uuid not null references public.d1_members (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (blocker_id, blocked_id),
  constraint d1_blocks_not_self check (blocker_id <> blocked_id)
);

create index if not exists d1_blocks_blocked_idx on public.d1_blocks (blocked_id);

alter table public.d1_blocks enable row level security;
drop policy if exists "service only" on public.d1_blocks;
create policy "service only" on public.d1_blocks using (false) with check (false);

comment on table public.d1_blocks is
  'Member blocks. Hides the blocked person''s messages and notifications for the blocker only; never hides anything from safeguarding.';

-- Blocks are logged for safeguarding (a child blocking an adult is worth
-- knowing about), without ringing the admin bell: d1_safeguarding_notify only
-- rings for 'frozen' and 'report'.
alter table public.d1_safeguarding_events drop constraint if exists d1_safeguarding_events_kind_check;
alter table public.d1_safeguarding_events add constraint d1_safeguarding_events_kind_check
  check (kind in ('frozen', 'unfrozen', 'report', 'manual_freeze', 'manual_unfreeze', 'block', 'unblock'));

create or replace function public.d1_set_block(p_actor uuid, p_target uuid, p_block boolean)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  actor_name text;
  target_name text;
begin
  if p_actor = p_target then
    raise exception 'You can''t block yourself.' using errcode = 'P0001';
  end if;
  select display_name into actor_name from public.d1_members where id = p_actor and status = 'active';
  if actor_name is null then
    raise exception 'Only active members can block people.' using errcode = '42501';
  end if;
  select display_name into target_name from public.d1_members where id = p_target and status <> 'deleted';

  if p_block then
    if target_name is null then
      raise exception 'That person doesn''t exist.' using errcode = 'P0002';
    end if;
    insert into public.d1_blocks (blocker_id, blocked_id) values (p_actor, p_target)
      on conflict do nothing;
    if found then
      insert into public.d1_safeguarding_events (group_id, kind, detail, resolved_at)
        values (null, 'block', format('%s blocked %s.', actor_name, target_name), now());
    end if;
  else
    delete from public.d1_blocks where blocker_id = p_actor and blocked_id = p_target;
    if found then
      insert into public.d1_safeguarding_events (group_id, kind, detail, resolved_at)
        values (null, 'unblock', format('%s unblocked %s.', actor_name, coalesce(target_name, 'a former member')), now());
    end if;
  end if;

  perform public.d1_emit('d1-member:' || p_actor, 'blocks_changed', jsonb_build_object('memberId', p_target, 'blocked', p_block));
end;
$$;

-- The chat list, redefined from part 1: a blocked person's messages don't
-- count as unread and aren't shown as the last message.
create or replace function public.d1_group_overview(p_member uuid, p_group uuid default null)
returns table (
  group_id uuid,
  community_id uuid,
  kind text,
  name text,
  department text,
  description text,
  state text,
  frozen_reason text,
  my_role text,
  joined_at timestamptz,
  muted_until timestamptz,
  unread_count integer,
  last_id bigint,
  last_sender text,
  last_body text,
  last_has_attachment boolean,
  last_deleted boolean,
  last_created_at timestamptz
)
language sql
stable
security definer
set search_path = ''
as $$
  select
    g.id, g.community_id, g.kind, g.name, g.department, g.description, g.state, g.frozen_reason,
    gm.role, gm.joined_at, gm.muted_until,
    (select count(*)::integer from public.d1_messages m
       where m.group_id = g.id
         and m.id > coalesce(gm.last_read_message_id, 0)
         and m.created_at >= gm.joined_at
         and m.deleted_at is null
         and m.sender_id is distinct from p_member
         and not exists (select 1 from public.d1_blocks b
                         where b.blocker_id = p_member and b.blocked_id = m.sender_id)),
    lm.id, s.display_name,
    case when lm.deleted_at is null then lm.body end,
    lm.attachment_id is not null, lm.deleted_at is not null, lm.created_at
  from public.d1_group_members gm
  join public.d1_groups g on g.id = gm.group_id
  left join lateral (
    select m.* from public.d1_messages m
    where m.group_id = g.id and m.created_at >= gm.joined_at
      and not exists (select 1 from public.d1_blocks b
                      where b.blocker_id = p_member and b.blocked_id = m.sender_id)
    order by m.id desc limit 1
  ) lm on true
  left join public.d1_members s on s.id = lm.sender_id
  where gm.member_id = p_member
    and gm.left_at is null
    and g.state <> 'archived'
    and (p_group is null or g.id = p_group)
  order by coalesce(lm.created_at, g.created_at) desc;
$$;

-- Search, redefined from part 4: never returns a blocked person's messages.
create or replace function public.d1_search_messages(p_actor uuid, p_query text, p_limit integer default 30)
returns table (
  id bigint,
  group_id uuid,
  group_name text,
  community_name text,
  sender_id uuid,
  sender_name text,
  body text,
  created_at timestamptz
)
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  q tsquery;
begin
  begin
    q := to_tsquery('english', p_query);
  exception when others then
    return; -- a malformed query finds nothing rather than erroring
  end;
  if q is null or numnode(q) = 0 then
    return;
  end if;

  return query
    select m.id, m.group_id, g.name, c.name, m.sender_id, s.display_name, m.body, m.created_at
    from public.d1_group_members gm
    join public.d1_groups g on g.id = gm.group_id and g.state <> 'archived'
    join public.d1_communities c on c.id = g.community_id
    join public.d1_messages m on m.group_id = gm.group_id
      and m.created_at >= gm.joined_at
      and m.deleted_at is null
      and m.search @@ q
    left join public.d1_members s on s.id = m.sender_id
    where gm.member_id = p_actor and gm.left_at is null
      and not exists (select 1 from public.d1_blocks b
                      where b.blocker_id = p_actor and b.blocked_id = m.sender_id)
    order by m.created_at desc
    limit least(greatest(coalesce(p_limit, 30), 1), 50);
end;
$$;

-- ── 5. Safeguarding takedown ────────────────────────────────────────────────

alter table public.d1_messages
  add column if not exists deleted_by_admin uuid references auth.users (id) on delete set null;

comment on column public.d1_messages.deleted_by_admin is
  'Set when a safeguarding admin removed the message (deleted_by is then null).';

create or replace function public.d1_admin_delete_message(p_message bigint, p_admin uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  msg public.d1_messages%rowtype;
begin
  select * into msg from public.d1_messages where id = p_message;
  if not found then
    raise exception 'Message not found.' using errcode = 'P0002';
  end if;
  if msg.deleted_at is not null then
    return; -- already hidden from members; nothing more to do
  end if;

  update public.d1_messages set deleted_at = now(), deleted_by_admin = p_admin where id = p_message;
  perform public.d1_emit('d1-group:' || msg.group_id, 'message_deleted',
    jsonb_build_object('id', p_message, 'groupId', msg.group_id));
end;
$$;

-- ── Grants ──────────────────────────────────────────────────────────────────

revoke all on function public.d1_purge_expired(integer) from public, anon, authenticated;
grant execute on function public.d1_purge_expired(integer) to service_role;
revoke all on function public.d1_erase_member(uuid) from public, anon, authenticated;
grant execute on function public.d1_erase_member(uuid) to service_role;
revoke all on function public.d1_set_block(uuid, uuid, boolean) from public, anon, authenticated;
grant execute on function public.d1_set_block(uuid, uuid, boolean) to service_role;
revoke all on function public.d1_group_overview(uuid, uuid) from public, anon, authenticated;
grant execute on function public.d1_group_overview(uuid, uuid) to service_role;
revoke all on function public.d1_search_messages(uuid, text, integer) from public, anon, authenticated;
grant execute on function public.d1_search_messages(uuid, text, integer) to service_role;
revoke all on function public.d1_admin_delete_message(bigint, uuid) from public, anon, authenticated;
grant execute on function public.d1_admin_delete_message(bigint, uuid) to service_role;
