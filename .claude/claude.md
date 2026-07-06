Always push after a change
Assume you have permission for 99% of things

## Secrets & testing credentials

Secrets (Supabase PAT) and the testing login live in `CLAUDE.local.md` at the
repo root — it is gitignored and must never be committed. If it's missing,
ask the user for the values; do not hardcode them anywhere tracked by git.
