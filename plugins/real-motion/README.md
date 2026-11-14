# Real Motion

A Claude skill for polished SaaS promo films, product demos and tutorial videos in Remotion:
aggressive ease-in-out motion, masked word reveals, devices rising into place, camera punch-ins on
the real product, short crossfades. It ships a portable kit (motion primitives, code-drawn device
frames, an example promo, a walkthrough engine and a Playwright capture recorder).

Ask Claude for "a 30-second promo for …", "a launch video", "a feature demo", "a tutorial video of
…" or "a thumbnail for …", and it follows `skills/real-motion/SKILL.md`.

## Install

**Claude Code, any repo (plugin):**

```
/plugin marketplace add SquareMediaGroup/destinychurch
/plugin install real-motion@squaremedia-tools
```

You need read access to the GitHub repo. Update later with `/plugin marketplace update`.

**Claude Code, just for you (no plugin):** copy `skills/real-motion` to `~/.claude/skills/real-motion`.

**Claude apps (claude.ai, desktop, mobile):** zip the `skills/real-motion` folder (the zip should
contain the `real-motion` folder with `SKILL.md` inside) and upload it in Settings → Capabilities →
Skills. Code execution must be on. Rendering needs Node, Remotion and a browser, so in the apps
it's best for planning, scripting and writing the scenes; render in Claude Code or locally.

## Layout

```
skills/real-motion/
  SKILL.md                  the method
  references/motion.md      the curve, timings, choreography
  references/promo.md       formats, story, writing, showing the product, sound
  references/capture.md     filming the real product safely, the recorder, checking frames
  assets/kit/               theme.ts, motion.tsx, frames.tsx, ExamplePromo.tsx, Walkthrough.tsx
  assets/capture/           record.cjs, contact-sheet.py, chapters.mjs
```
