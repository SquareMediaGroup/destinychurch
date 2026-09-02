-- Retires Playbook as the delivery mechanism for design deliverables.
-- Playbook's upload endpoint doesn't send CORS headers, which silently blocks
-- every direct browser upload (see the CORS preflight investigation) — rather
-- than wait on their support, deliverables now split by kind:
--   - images/PDFs: uploaded straight into Supabase Storage, capped at 50MB
--   - video: no upload at all — the designer pastes a Drive or Playbook share
--     link, which is stored and embedded/opened directly, so a multi-GB video
--     never has to touch our server or a signed-upload dance at all.
--
-- Existing rows keep working: they're untouched, storage_kind defaults to
-- 'playbook', and the download routes still know how to mint a Playbook
-- signed URL for them. Only new uploads take the new path.

alter table design_ticket_deliverables
  add column if not exists storage_kind text not null default 'playbook'
    check (storage_kind in ('playbook', 'supabase', 'link')),
  add column if not exists file_path text,
  add column if not exists link_url text,
  add column if not exists link_provider text
    check (link_provider is null or link_provider in ('drive', 'playbook', 'other'));

-- playbook_asset_token was "not null" for the old single-provider world; a
-- supabase- or link-backed row has no Playbook asset at all.
alter table design_ticket_deliverables
  alter column playbook_asset_token drop not null;

alter table design_ticket_deliverables
  drop constraint if exists design_ticket_deliverables_storage_shape;
alter table design_ticket_deliverables
  add constraint design_ticket_deliverables_storage_shape check (
    (storage_kind = 'playbook' and playbook_asset_token is not null and file_path is null and link_url is null) or
    (storage_kind = 'supabase' and file_path is not null and playbook_asset_token is null and link_url is null) or
    (storage_kind = 'link' and link_url is not null and playbook_asset_token is null and file_path is null)
  );

-- ── Private storage bucket for image/PDF deliverables ───────────────────────
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'design-deliverables',
  'design-deliverables',
  false,             -- private: access only via server-minted signed URLs
  52428800,          -- 50MB per file
  array[
    'image/jpeg',
    'image/png',
    'image/webp',
    'image/gif',
    'image/svg+xml',
    'application/pdf'
  ]::text[]
)
on conflict (id) do nothing;
-- No storage.objects policies: the bucket is reached only through the
-- service role, which bypasses RLS — matching hr-documents and every other
-- private bucket in this project.
