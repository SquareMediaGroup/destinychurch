# Status page (status.destinytees.uk)

Live status of the Destiny Church website and Destiny One, for members and staff.
Destiny One's outage message links here.

It is deliberately separate from everything it reports on: its own Vercel project,
its own region (`dub1`), no Supabase client and no database. Every check is a plain
HTTP request, so the page still renders when the website or Supabase is down.

## Run it

```bash
cd apps/status
npm install
cp .env.example .env.local   # optional; defaults probe https://destinytees.uk
npm run dev                  # http://localhost:3100
```

## Deploy (one-off setup)

1. In Vercel, add a new project from this repo with **Root Directory** `apps/status`
   (framework: Next.js). Region comes from `vercel.json`.
2. Set the env vars from `.env.example`. Only `RESEND_API_KEY` is secret.
3. Add the domain `status.destinytees.uk` to that project and create the DNS record
   Vercel asks for (a CNAME to `cname.vercel-dns.com`).

## Report a problem

Every part on the page has a "Report a problem" button. Reports are emailed to the
addresses in `STATUS_REPORT_RECIPIENTS` (the super admins) through Resend, using
`RESEND_API_KEY`. Keep that list in step with who holds `super_admin`.

## Post a notice

Add an entry to `src/lib/notices.ts` (title, body, kind, component ids, `startedAt`)
and merge. Set `resolvedAt` when it is over. Component ids are in `src/lib/status.ts`.

## What each component checks

See `src/lib/status.ts`. In short: public pages on the site, the site's
`GET /api/health` (database and Smart Search), `GET /api/app/v1/one/config` for the
Destiny One server, Supabase Auth's `/auth/v1/health`, and the public status pages of
Supabase and Expo for realtime, storage and push delivery. Providers are inputs only:
the page never names them.
