-- Remove the sermon-hiding admin feature entirely: drop hidden_videos table.
-- All YouTube videos are now shown on the public sermons pages unfiltered.
drop table if exists public.hidden_videos cascade;
