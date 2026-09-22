-- Admin notification center.
--
-- notifications: one row per inbound event a section's admins should see
-- (new order, new application, new design ticket, ...). notification_reads:
-- per-admin read state, since several admins share the same source tables and
-- "read" is a fact about (notification, viewer), not the notification alone.
--
-- Both tables are deny-all like everything else (20260711_rls_harden_base_tables.sql)
-- — the API routes always go through createServiceClient(). Delivery to the
-- browser follows the live-chat precedent (20260817_live_chat.sql): Postgres
-- Changes would need an authenticated SELECT policy straight on notifications,
-- which is exactly the class of mistake that migration's own comments warn
-- against. Instead the service-role insert path calls admin_notify_emit() to
-- push the row onto a private Broadcast topic scoped to the roles it's for,
-- and a matching realtime.messages policy only lets a signed-in admin receive
-- a topic for a role they actually hold.

create table if not exists notifications (
  id           bigint generated always as identity primary key,
  created_at   timestamptz not null default now(),

  section      text not null,
  kind         text not null,
  entity_id    text,
  entity_label text,
  summary      text not null,
  href         text not null,

  -- AdminRole values (lib/adminRoles.ts) this notification is relevant to.
  roles        text[] not null,

  metadata     jsonb
);

create table if not exists notification_reads (
  notification_id bigint not null references notifications(id) on delete cascade,
  auth_user_id     uuid not null references auth.users(id) on delete cascade,
  read_at          timestamptz not null default now(),
  primary key (notification_id, auth_user_id)
);

alter table notifications enable row level security;
drop policy if exists "service only" on notifications;
create policy "service only" on notifications using (false) with check (false);

alter table notification_reads enable row level security;
drop policy if exists "service only" on notification_reads;
create policy "service only" on notification_reads using (false) with check (false);

create index if not exists notifications_created_at_idx on notifications (created_at desc);
create index if not exists notifications_roles_idx on notifications using gin (roles);
create index if not exists notification_reads_auth_user_id_idx on notification_reads (auth_user_id);

-- ── Realtime delivery ────────────────────────────────────────────────────────
-- Topics are `admin-notifications:<role>`, one per AdminRole (including
-- super_admin). A notification for roles ['store_admin'] is broadcast to
-- admin-notifications:store_admin and, always, admin-notifications:super_admin
-- — mirrors how a Super Admin's route access bypasses every ROUTE_RULES entry.

create or replace function public.admin_notify_emit(
  topic text,
  event text,
  payload jsonb
)
returns void
security definer
set search_path = ''
language plpgsql
as $$
begin
  perform realtime.send(payload, event, topic, true);
end;
$$;

comment on function public.admin_notify_emit(text, text, jsonb) is
  'Pushes one notification onto a private admin-notifications:<role> Realtime topic. Called by the service key after the row has been written.';

-- SECURITY DEFINER because admin_roles is deny-all — a plain subquery in the
-- policy below would evaluate as the calling (authenticated) role and see
-- nothing. Mirrors is_live_chat_host() in 20260817_live_chat.sql.
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
          when 'training_admin' then r.training_admin
          when 'event_admin'    then r.event_admin
          when 'store_admin'    then r.store_admin
          when 'site_admin'     then r.site_admin
          when 'host'           then r.host
          when 'hr_admin'       then r.hr_admin
          when 'design_admin'   then r.design_admin
          when 'sermon_admin'   then r.sermon_admin
          when 'super_admin'    then r.super_admin
          else false
        end
        or r.super_admin
      from public.admin_roles r
      where r.auth_user_id = (select auth.uid())
    ),
    false
  );
$$;

comment on function public.admin_has_role(text) is
  'True when the signed-in user holds the given AdminRole (or is a Super Admin). Used by the admin-notifications realtime.messages policy.';

grant execute on function public.admin_has_role(text) to authenticated;

drop policy if exists "admin_notifications_receive" on realtime.messages;
create policy "admin_notifications_receive"
  on realtime.messages for select
  to authenticated
  using (
    realtime.messages.extension = 'broadcast'
    and (select realtime.topic()) ~ '^admin-notifications:[a-z_]+$'
    and (select public.admin_has_role(substring((select realtime.topic()) from 'admin-notifications:(.+)$')))
  );

-- No insert policy: as with live chat, the browser never posts to this topic,
-- only the service key does, via admin_notify_emit().

-- ── Retention ───────────────────────────────────────────────────────────────
-- 60 days is long enough for "did anyone see the order from last month"
-- without keeping an indefinite pile of read-receipts. Called by the same
-- weekly cron that already purges audit_log.

create or replace function public.purge_old_notifications()
returns void
language sql
security definer
set search_path = ''
as $$
  delete from public.notifications where created_at < now() - interval '60 days';
$$;

comment on function public.purge_old_notifications() is
  'Deletes notifications (and, via cascade, notification_reads) older than 60 days. Called from the weekly audit cron.';
