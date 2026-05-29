# Leadership — Website Feature Overview

`Destiny Church Website Feature Overview.docx` is a presentation-ready document
for church leadership covering every feature of the destinytees.uk platform,
with screenshots of each public page and the admin area.

## Contents
- `Destiny Church Website Feature Overview.docx` — the deliverable (open in Word/Google Docs; press the Table of Contents and "Update field" to populate page numbers).
- `screenshots/` — full-page screenshots of every page (the source images).
- `screenshots/doc/` — cropped top-of-page versions actually embedded in the document.

## Regenerating

The screenshots are captured against the local dev server, and the document is
built with [`docx`](https://www.npmjs.com/package/docx). Neither `docx` nor the
Playwright browser are project dependencies, so install them ad-hoc:

```bash
# 1. Capture screenshots (dev server must be running on :3000)
npm run dev            # in another terminal
npx playwright install chromium
node scripts/leadership-screenshots.mjs        # public pages
node scripts/leadership-screenshots-admin.mjs  # admin pages (uses test login)

# 2. Crop to doc-ready images
node scripts/leadership-crop.mjs

# 3. Build the document
npm install docx --no-save
node scripts/leadership-doc.mjs
```

Output is written to `docs/leadership/Destiny Church Website Feature Overview.docx`.
