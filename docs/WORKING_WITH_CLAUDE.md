# Working with Claude on this repo

How Malachi works with Claude Code on the Destiny Church codebase, written up so
anyone else on the team gets the same experience.

There are two halves to this:

1. **What Claude reads automatically** — `CLAUDE.md` (root) and `.claude/claude.md`.
   These load into every session on this repo, so the house rules apply to
   everyone without you doing anything.
2. **How you talk to it** — this document. Claude can't enforce your side of the
   conversation, so this is the part worth reading.

---

## 1. One-time setup (do this first)

### Personal preferences (claude.ai → Settings → Profile)

These are per-person, not per-repo, so each person has to add them themselves.
Malachi's is:

> If you don't understand what I'm saying - just say so.

This matters more than it looks. Without it, Claude tends to guess at a vague
request and build the wrong thing confidently. With it, you get a quick
"I'm not sure what you mean by X — do you mean A or B?" instead.

### Local secrets

Copy `CLAUDE.local.md` from someone on the team (it's gitignored). It holds the
Supabase PAT and the testing login. If it's missing, Claude will ask you for the
values — never paste them into a tracked file.

---

## 2. How to give instructions

### Talk normally, keep it short

You don't need prompt-engineering tricks. Malachi's requests are usually one or
two plain sentences, e.g.:

- "Links pages: tidier editor and more customisation"
- "Hide the site header and footer on the staff login page"
- "Move the design request form to /portal/design/request, staff-only"

Say **what** you want and **where** (page, route, or feature name). Leave the
**how** to Claude unless you have a strong opinion.

### It's fine to be unsure

"Maybe a skill or an md, I don't know what's better" is a perfectly good
request. Claude is told (in `CLAUDE.md`) to say so if it has a better idea — so
when you're torn between options, just list them and ask it to recommend one.

### Give it permission up front

`.claude/claude.md` says: *assume you have permission for 99% of things.* That
means Claude should just get on with edits, running scripts, committing and
pushing, rather than stopping to ask at every step. It will still check before
anything destructive or irreversible (deleting data, touching production,
force-pushing).

If you want it to stop and check with you on a particular task, say so in the
request: "plan this first, don't change anything yet".

### Screenshots and links beat descriptions

For UI changes, a screenshot, Figma link, or the URL of the page you mean saves
a round of back-and-forth. The brand guide lives in `docs/brand/` and the
`DC Brand Asset Style Guide` PDF at the root — point Claude at them for anything
visual.

### Iterate in the same session

If the first attempt isn't right, reply in the same conversation ("closer, but
make the buttons match the rest of the portal") rather than starting fresh.
Claude keeps the context of what it already tried.

---

## 3. What Claude will do on its own

You don't need to ask for any of these — they're in the repo instructions:

| Rule | Where it's set |
|------|----------------|
| Works on a feature branch, never pushes to `main` | `CLAUDE.md` |
| Pushes the branch and opens / updates a PR for every change | `CLAUDE.md`, `.claude/claude.md` |
| Does not merge its own PRs — a human approves | `CLAUDE.md` |
| Updates `REPOSITORY_DOCUMENTATION.md` when pages, components, tables, API routes or libraries change | `CLAUDE.md` |
| No emojis in UI (buttons, labels, alerts). Emojis fine in logs, comments and docs | `CLAUDE.md` |
| Speaks up if it has a better idea | `CLAUDE.md` |
| Checks `REPOSITORY_DOCUMENTATION.md` before guessing how something works | `CLAUDE.md` |

If you find yourself repeating the same instruction in several sessions, add it
to `CLAUDE.md` (for everyone) rather than typing it each time.

---

## 4. Handy phrases

| You want | Say |
|----------|-----|
| A plan before any code | "Plan this first, don't change anything yet" |
| Just an answer, no changes | "Question only — how does X work?" |
| A security check | "Is this safe?" or `/vibe-security` |
| A review of what's changed | `/code-review` |
| Claude to watch a PR and fix CI / review comments | "Watch the PR and fix anything that comes up" |
| To see it running | "Run it and show me a screenshot of /visit" |

---

## 5. Why a doc and not a skill?

A **skill** is a set of instructions Claude loads only when a matching task
comes up (e.g. `vibe-security` loads when you ask about security). It's the
right tool for a repeatable procedure.

How to *work with* Claude isn't a procedure — it needs to apply all the time.
The Claude-facing rules already live in `CLAUDE.md`, which loads in every
session. This doc covers the human side, which Claude can't load for you.
