-- Contact messages table
CREATE TABLE IF NOT EXISTS contact_messages (
  id bigint generated always as identity primary key,
  name text not null,
  email text not null,
  subject text not null default 'Other',
  message text not null,
  created_at timestamptz not null default now()
);

ALTER TABLE contact_messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service role can insert" ON contact_messages
  FOR INSERT TO service_role WITH CHECK (true);

CREATE POLICY "Service role can select" ON contact_messages
  FOR SELECT TO service_role USING (true);
