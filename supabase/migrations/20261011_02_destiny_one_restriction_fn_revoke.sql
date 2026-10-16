-- The posting-restriction trigger function is only ever called by its two
-- triggers (20261011_01). Without this, the API's /rpc/ endpoint lists it as
-- callable by anon and signed-in users. Triggers keep firing: Postgres checks
-- EXECUTE when a trigger is created, not each time it fires.

revoke execute on function public.d1_enforce_posting_restriction() from public, anon, authenticated;

-- Edits count as posting. Messages can be edited for 15 minutes
-- (20261006_01/02), and a restricted member must not be able to say something
-- new that way. Same function, fired when the text changes.
drop trigger if exists d1_messages_posting_restriction_edit on public.d1_messages;
create trigger d1_messages_posting_restriction_edit
  before update of body on public.d1_messages
  for each row
  when (new.body is distinct from old.body)
  execute function public.d1_enforce_posting_restriction();
