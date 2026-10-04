-- Destiny One part 7b: every message body, poll and report reason is sealed.
--
-- Apply after scripts/destiny-one/encrypt-messages.mjs has sealed the rows
-- written before 20261004_01. From here the database refuses plaintext, so a
-- bug or an old API build can't quietly start storing readable text again,
-- and the "plaintext → sealed" exception in d1_messages_immutable can never
-- fire (there is no plaintext left to replace).

alter table public.d1_messages drop constraint if exists d1_messages_body_sealed;
alter table public.d1_messages add constraint d1_messages_body_sealed
  check (body is null or body like 'd1e:%');

-- Poll wording (question and every option label). Option ids stay plain:
-- d1_vote checks them.
alter table public.d1_messages drop constraint if exists d1_messages_poll_sealed;
alter table public.d1_messages add constraint d1_messages_poll_sealed
  check (
    content is null
    or content->>'kind' is distinct from 'poll'
    or (
      coalesce(content #>> '{poll,question}', '') like 'd1e:%'
      and not jsonb_path_exists(content, '$.poll.options[*].label ? (!(@ starts with "d1e:"))')
    )
  );

alter table public.d1_reports drop constraint if exists d1_reports_reason_sealed;
alter table public.d1_reports add constraint d1_reports_reason_sealed
  check (reason like 'd1e:%');
