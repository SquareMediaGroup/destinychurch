-- Talent show: the judges' X's count towards the audience vote.
-- An admin types how many X's each act got from the judges (the buzzers run
-- on the venue network and never reach the website). Each X is worth 2 votes
-- in the results; see JUDGE_X_POINTS in lib/talentShow.server.ts.

alter table public.talent_show_acts
  add column if not exists judge_xs integer not null default 0
    check (judge_xs between 0 and 4);
