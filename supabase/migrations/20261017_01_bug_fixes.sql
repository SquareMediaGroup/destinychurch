-- Database bug fixes from the October 2026 schema review.
--
-- Every statement here is idempotent (drop ... if exists / create or replace),
-- so it is safe to run more than once. Nothing here changes data.
--
--   1. Storage: any signed-in user could upload into four public buckets.
--   2. Destiny One: the retention purge fails whenever an expired message has
--      a reply that is still inside the window.
--   3. Destiny One: account erasure kept the self-declared age and the access
--      request note on the anonymised row.
--   4. admin_roles: the "last Super Admin" trigger could never fire.

-- ════════════════════════════════════════════════════════════════════════════
-- 1. Storage write policies open to every `authenticated` user
-- ════════════════════════════════════════════════════════════════════════════
-- 20260507 (builder-media), 20260618 (post-media), 20260708 (product-images)
-- and 20260710 (shop-hero-images) gave `authenticated` INSERT/UPDATE/DELETE on
-- storage.objects for their bucket. 20260711_03 left them in place on the
-- grounds that "there is no public signup (so `authenticated` = staff only)".
-- Destiny One changed that: POST /api/app/v1/one/auth/code mints a Supabase
-- Auth user for anyone whose email passes d1_sign_in_status (every email while
-- access requests are open, and every leader-invited email), and the app
-- signs them in with the publishable key. Any such user could then call
-- Storage directly and upload anything up to 10 MB, including SVG (allowed in
-- product-images, shop-hero-images and builder-media), into public buckets
-- served from the project's domain. builder-media still has a public SELECT
-- policy, so there they could also overwrite and delete every existing file.
--
-- Nothing needs these policies: every upload/delete for these buckets goes
-- through an admin API route with createServiceClient(), which bypasses RLS
-- (app/api/admin/posts/upload, links/upload, store/products/[id]/images,
-- shop-hero/upload). Without them RLS default-denies non-service writes, the
-- same as every other bucket.

drop policy if exists "Authenticated users can upload builder-media"     on storage.objects;
drop policy if exists "Authenticated users can update builder-media"     on storage.objects;
drop policy if exists "Authenticated users can delete builder-media"     on storage.objects;
drop policy if exists "Authenticated users can upload post-media"        on storage.objects;
drop policy if exists "Authenticated users can update post-media"        on storage.objects;
drop policy if exists "Authenticated users can delete post-media"        on storage.objects;
drop policy if exists "Authenticated users can upload product-images"    on storage.objects;
drop policy if exists "Authenticated users can update product-images"    on storage.objects;
drop policy if exists "Authenticated users can delete product-images"    on storage.objects;
drop policy if exists "Authenticated users can upload shop-hero-images"  on storage.objects;
drop policy if exists "Authenticated users can update shop-hero-images"  on storage.objects;
drop policy if exists "Authenticated users can delete shop-hero-images"  on storage.objects;

-- ════════════════════════════════════════════════════════════════════════════
-- 2. d1_messages_immutable blocks the reply_to FK's ON DELETE SET NULL
-- ════════════════════════════════════════════════════════════════════════════
-- d1_messages.reply_to references d1_messages(id) ON DELETE SET NULL. When
-- d1_purge_expired() deletes an expired message that a newer (kept) message
-- replies to, Postgres runs `UPDATE d1_messages SET reply_to = NULL` on the
-- reply, the BEFORE UPDATE immutability trigger sees reply_to change and
-- raises "Messages cannot be edited.", and the whole purge rolls back. One
-- reply across the retention boundary is enough, so in practice nothing is
-- ever purged (messages, attachments, erased members, closed reports,
-- feedback). The same thing breaks deleting a group whose messages reply to
-- each other, including the cascade from deleting an erased member's
-- DestinyAI chat.
--
-- Redefined from 20261006_05 with one change: reply_to may become NULL (as
-- sender_id already may, for the same reason). It still can't be pointed at
-- a different message.

create or replace function public.d1_messages_immutable()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  editing boolean := coalesce(current_setting('d1.editing', true), '') = 'on';
  previewing boolean := coalesce(current_setting('d1.previewing', true), '') = 'on';
begin
  if (new.body is distinct from old.body
        -- The backfill (scripts/destiny-one/encrypt-messages.mjs) replaces a
        -- plaintext body with its sealed form, once.
        and not (old.body not like 'd1e:%' and new.body like 'd1e:%')
        -- An edit, made through d1_edit_message (which saved the old text).
        and not editing)
     or (new.edited_at is distinct from old.edited_at and not editing)
     or (new.mentions is distinct from old.mentions and not editing)
     or (new.link_preview is distinct from old.link_preview and not previewing)
     or new.group_id is distinct from old.group_id
     or new.attachment_id is distinct from old.attachment_id
     -- NULL is allowed: that is the FK's ON DELETE SET NULL when the message
     -- being replied to is purged.
     or (new.reply_to is distinct from old.reply_to and new.reply_to is not null)
     or new.created_at is distinct from old.created_at
     or (new.sender_id is distinct from old.sender_id and new.sender_id is not null) then
    raise exception 'Messages cannot be edited.' using errcode = 'P0001';
  end if;
  return new;
end;
$$;

revoke all on function public.d1_messages_immutable() from public, anon, authenticated;

-- ════════════════════════════════════════════════════════════════════════════
-- 3. d1_erase_member leaves the self-declared age and request note behind
-- ════════════════════════════════════════════════════════════════════════════
-- docs/destiny-one-gdpr.md lists declared_adult_on (the 18th birthday someone
-- typed in, which gives away their date of birth), request_note and the
-- groups a leader invited them to as kept "while the account exists". Erasure
-- anonymised the name, roles, ChurchSuite ids, adult_on and avatar but left
-- these on the "Former member" row, which survives until every message they
-- sent has been purged (indefinitely while one of them is under an open
-- report).
--
-- Redefined from 20260929_01 with those three fields cleared as well.

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
        adult_on = null, avatar_url = null, deleted_at = now(),
        declared_adult_on = null, request_note = null, request_group_ids = '{}'
    where id = p_member;
end;
$$;

revoke all on function public.d1_erase_member(uuid) from public, anon, authenticated;
grant execute on function public.d1_erase_member(uuid) to service_role;

-- ════════════════════════════════════════════════════════════════════════════
-- 4. enforce_last_super_admin never fires
-- ════════════════════════════════════════════════════════════════════════════
-- 20260831_last_super_admin_guard runs BEFORE UPDATE/DELETE and refuses when
-- `count(*) where super_admin` is 0. In a BEFORE trigger the row being
-- demoted or deleted hasn't changed yet, so it is always in that count: the
-- count is at least 1 and the exception can never be raised. Demoting or
-- deleting the only Super Admin succeeds, and so do the two concurrent
-- demotions the trigger was written to stop.
--
-- Count the OTHER Super Admins instead. The table lock is kept, so a second
-- concurrent demotion waits, then (READ COMMITTED: each statement takes a
-- fresh snapshot) sees the first one's commit and is refused. Rows already
-- processed earlier in the same statement are visible to a BEFORE ROW
-- trigger, so a single UPDATE that demotes everyone is refused too.

create or replace function public.enforce_last_super_admin()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  lock table admin_roles in share row exclusive mode;

  if (tg_op = 'DELETE' and old.super_admin) or
     (tg_op = 'UPDATE' and old.super_admin and not new.super_admin) then
    if not exists (
      select 1 from admin_roles
      where super_admin = true and auth_user_id is distinct from old.auth_user_id
    ) then
      raise exception 'Can''t remove Super Admin from the last remaining Super Admin.';
    end if;
  end if;

  if tg_op = 'DELETE' then
    return old;
  end if;
  return new;
end;
$$;

revoke all on function public.enforce_last_super_admin() from public, anon, authenticated;

drop trigger if exists trg_enforce_last_super_admin on public.admin_roles;
create trigger trg_enforce_last_super_admin
  before update or delete on public.admin_roles
  for each row
  execute function public.enforce_last_super_admin();
