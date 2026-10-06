-- Destiny One part 15: link previews (D1 v0.8).
--
-- A message with a link gets a small preview (title, description, site,
-- picture link) that the API fetches after sending, so sending never waits
-- for someone else's website. It's stored sealed, like the text it comes
-- from (it says what the link is about), in d1_messages.link_preview.
--
-- Only d1_set_link_preview can write it, and the immutability trigger lets
-- link_preview change only while it runs. An edit that changes the link
-- re-runs it; it never touches the text.

alter table public.d1_messages add column if not exists link_preview text
  constraint d1_messages_link_preview_sealed check (link_preview is null or (link_preview like 'd1e:%' and char_length(link_preview) <= 8000));

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
     or new.reply_to is distinct from old.reply_to
     or new.created_at is distinct from old.created_at
     or (new.sender_id is distinct from old.sender_id and new.sender_id is not null) then
    raise exception 'Messages cannot be edited.' using errcode = 'P0001';
  end if;
  return new;
end;
$$;

create or replace function public.d1_set_link_preview(p_message bigint, p_preview text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  perform set_config('d1.previewing', 'on', true);
  update public.d1_messages set link_preview = p_preview where id = p_message and deleted_at is null;
  perform set_config('d1.previewing', '', true);
end;
$$;

revoke all on function public.d1_set_link_preview(bigint, text) from public, anon, authenticated;
grant execute on function public.d1_set_link_preview(bigint, text) to service_role;
