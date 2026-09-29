-- Retires the /live page, its chat, simulated live and the Host access level.
--
-- Undoes 20260817_live_chat.sql, 20260817_02_host_role.sql,
-- 20260818_simulated_live.sql and 20260922_02_live_chat_rpc_grants.sql.
-- All chat data (messages, prayer requests, blocks, sessions) is deleted.
--
-- admin_has_role() is redefined first: it is a SQL function that names r.host,
-- and Postgres doesn't track that dependency, so dropping the column before it
-- would leave every role check erroring at call time.

create or replace function public.admin_has_role(p_role text)
returns boolean
security definer
set search_path = ''
language sql
stable
as $$
  select coalesce(
    (
      select
        case p_role
          when 'training_admin'     then r.training_admin
          when 'event_admin'        then r.event_admin
          when 'store_admin'        then r.store_admin
          when 'site_admin'         then r.site_admin
          when 'hr_admin'           then r.hr_admin
          when 'design_admin'       then r.design_admin
          when 'sermon_admin'       then r.sermon_admin
          when 'safeguarding_admin' then r.safeguarding_admin
          when 'destiny_one_admin'  then r.destiny_one_admin
          when 'super_admin'        then r.super_admin
          else false
        end
        or r.super_admin
      from public.admin_roles r
      where r.auth_user_id = (select auth.uid())
    ),
    false
  );
$$;

-- Realtime policies (they call private.is_live_chat_host, so go first).
drop policy if exists "live_chat_public_receive" on realtime.messages;
drop policy if exists "live_chat_dm_receive"     on realtime.messages;
drop policy if exists "live_chat_host_receive"   on realtime.messages;
drop policy if exists "live_chat_presence_only"  on realtime.messages;
drop policy if exists "live_chat_presence_read"  on realtime.messages;

drop function if exists private.is_live_chat_host();
drop function if exists public.is_live_chat_host();
drop function if exists public.live_chat_emit(text, text, jsonb);
drop function if exists public.live_chat_purge(integer);

drop table if exists public.live_chat_messages        cascade;
drop table if exists public.live_chat_prayer_requests cascade;
drop table if exists public.live_chat_blocks          cascade;
drop table if exists public.live_chat_sessions        cascade;
drop table if exists public.simulated_live            cascade;

alter table public.admin_roles drop column if exists host;
