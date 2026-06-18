# Project Instructions

## Git

- Always push to `main` branch. Never push to feature branches.

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
