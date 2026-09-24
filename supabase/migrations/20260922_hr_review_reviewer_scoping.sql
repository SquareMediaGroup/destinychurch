-- HR reviews: scope a review to the auth user who did it, so a reviewer can
-- self-serve "my reviews" without a service-role fetch of the whole table.
--
-- The `reviewer` free-text column stays for backward compatibility with old
-- rows and for reviewers who aren't admin users at all. This adds a real
-- foreign key alongside it and, for the first time in this codebase, an RLS
-- policy that isn't deny-all. Today's admin UI still goes through
-- createServiceClient() (which bypasses RLS) and filters explicitly in the
-- API route — this policy is defense-in-depth for any future user-context
-- client call against hr_reviews.

alter table hr_reviews add column if not exists reviewer_auth_user_id uuid references auth.users(id);

create index if not exists hr_reviews_reviewer_auth_user_id_idx
  on hr_reviews (reviewer_auth_user_id);

drop policy if exists "service only" on hr_reviews;
create policy "service role full access" on hr_reviews
  for all to service_role using (true) with check (true);
create policy "reviewer can read own reviews" on hr_reviews
  for select to authenticated
  using (reviewer_auth_user_id = auth.uid());
