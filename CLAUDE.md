# Project Instructions

## Git

- Never push directly to `main`. Work on a feature branch (branch off `main`, e.g. `feature/short-description`).
- Push the feature branch and open a pull request for every change.
- PRs must be reviewed and approved before merging — do not self-merge without approval.
- **Always start from the latest commit.** Before creating a branch or worktree, run `git fetch origin` and branch from `origin/main`, not from a local `main` that may be behind. Before committing and before pushing, fetch again and check nothing landed underneath you (`git log HEAD..origin/main`); if it did, rebase or merge `origin/main` in first. When reviewing or auditing code, read it at `origin/main`, and say so if the local checkout is behind.
- Exception: if the user explicitly tells you to push to `main` (e.g. "push this to main"), do so directly — no feature branch or PR needed for that change. The instruction applies only to the change it was given for.

## Keeping the local checkout current (Destiny One / Expo)

Expo and the Next dev server serve whatever is on disk in the checkout they were started from, so a stale local `main` means the simulator silently shows old code. This has caused "my change didn't reach the app" reports.

- Before starting or restarting a dev server, or telling the user a change is ready to try on the simulator: run `git fetch origin` and check `git status -sb`. If the checkout is behind `origin/main`, fast-forward it (`git pull --ff-only origin main`) or say it is behind.
- After a PR merges, update the local `main` checkout the dev server runs from, and re-run `npm install` in `apps/destiny-one` if its `package.json` changed.
- After pulling, restart Expo with a cleared cache: `npx expo start -c`.
- When the user says a change is missing on the simulator, check first: which checkout/branch is Expo serving (`lsof -a -p <expo pid> -d cwd`), is it behind `origin/main`, and is the PR actually merged. Only then look at the code.
- Say clearly if a feature lives in an unmerged PR or needs an unapplied Supabase migration, so it is not mistaken for a stale build.

## Documentation

- **Keep REPOSITORY_DOCUMENTATION.md in sync** — This is the single source of truth for the codebase
- After adding/changing major features:
  - New pages or routes → update Routing & Pages section
  - New components → update Components section
  - New database tables → update Database Schema section
  - New API endpoints → update API Routes section
  - New utility libraries → update Libraries & Utilities section
- When in doubt about how something works, check REPOSITORY_DOCUMENTATION.md first
- The docs are comprehensive and explain the "why" behind design decisions

## Emojis

- **No emojis in UI/UX**: User-facing interfaces (React components, HTML) should not use emojis
- **Emojis OK in logs/console**: Use emojis freely in CLI output, server logs, and backend scripts for readability
- **Emojis OK in text**: Comments, console.logs, and markdown documentation can use emojis
- Examples:
  - UI: No emoji in buttons, labels, alerts. Use text labels instead: "Complete" not "✓ Complete"
  - Logs: `console.log("📝 Generating page...")` is fine
  - Workflow output: `echo "✓ Type-check passed"` is fine

## General

- If you have a better idea, say so
