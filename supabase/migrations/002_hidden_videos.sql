create table if not exists hidden_videos (
  video_id text primary key,
  hidden_at timestamptz default now() not null
);
