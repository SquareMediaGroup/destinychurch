# Rolling back a bad website deploy

The website (root Next.js app) deploys to Vercel from `main`. Every merge to
`main` builds a new production deployment; PRs get preview deployments.

Use this when a deploy has broken the live site. The aim is to get the last
good version back in front of people first, and fix forwards second.

## 1. Put the last good deploy back (2 minutes)

1. Vercel dashboard → the `destinychurch` project → **Deployments**.
2. Find the last deployment marked **Production** that was working (each row
   shows its commit message and PR number).
3. Open its menu (three dots) → **Instant Rollback** (or **Promote to
   Production** on an older one). It swaps traffic over without a rebuild.
4. Check https://destinytees.uk and `/api/health` load.

While a rollback is active, Vercel stops auto-promoting new merges to `main`.
That is deliberate: nothing new goes live until someone undoes the rollback
(step 3).

## 2. Tell people (if members noticed)

Post an incident from **/admin/status** so status.destinytees.uk shows it.
Member-facing text must not name our providers; say "the website" or
"sign-in", not the hosting or database company.

## 3. Fix forwards

1. Revert the bad PR on GitHub (**Revert** button on the merged PR), or push
   a fix, via a normal PR. Never push straight to `main` for this.
2. Once CI is green and the fix is merged, its deployment builds as usual.
   In **Deployments**, promote it to production (this also ends the rollback
   from step 1, so later merges auto-deploy again).

## Database migrations are not rolled back

A Vercel rollback swaps code only. Supabase migrations already applied stay
applied. Before rolling back across a migration:

- **Additive migrations** (new table, new column, new function) are safe:
  old code ignores them.
- **Destructive or renaming migrations** (drop/rename a column, change a
  type, tighten a constraint) can break the older code. Write a forward
  migration that restores what the old code needs, and apply it before or
  straight after the rollback.
- Data lost to a bad migration comes back from Supabase backups
  (dashboard → Database → Backups). On the Pro plan that is a daily backup;
  Point-in-Time Recovery is a paid add-on. Restoring replaces the whole
  database, so it is a last resort and needs the owner's go-ahead.

Which is why migrations should stay additive where possible, and why a new
column is added in one PR and an old one dropped in a later PR once nothing
reads it.

## Environment variables

Changing an environment variable in Vercel does not affect running
deployments; it takes effect on the next build. To undo a bad env change,
change it back and redeploy (Deployments → menu → **Redeploy**).
