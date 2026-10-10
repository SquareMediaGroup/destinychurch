-- Destiny One: per-person chat archive (like WhatsApp). Archiving hides a chat
-- from your own Chats list and stops its push notifications (mentions still get
-- through). It is a flag on your membership: nobody else sees any change, and
-- it is independent of muted_until, so unarchiving does not unmute you.

alter table public.d1_group_members
  add column if not exists archived_at timestamptz;
