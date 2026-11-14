# Real Motion: promo films

## Formats

| Use | Length | Size | Notes |
| --- | --- | --- | --- |
| Website hero loop | 15 to 30 s | 1920x1080, muted | No voice, no music needed; must make sense silent and loop cleanly. |
| Launch / announcement | 45 to 90 s | 1920x1080 | Music bed; full story. |
| Social feed | 15 to 30 s | 1080x1080 or 1080x1350 | Hook in the first 2 s; captions on. |
| Stories / reels / shorts | 15 to 30 s | 1080x1920 | Re-lay scenes vertically: device large, text above. |
| Feature announcement | 15 to 30 s | any | One feature: problem, the feature in the UI, CTA. |
| Ad | 6, 15 or 30 s | per platform | Brand and product visible in the first 3 s. |

Build the landscape cut first, then make other sizes by re-laying the same scenes (a `layout`
prop or separate compositions), never by cropping.

## The story (60 s example)

| Beat | Time | What's on screen | Line (example) |
| --- | --- | --- | --- |
| Hook | 0–3 s | Big statement, maybe a `WordSwap` | "Ship work your team trusts." |
| Problem | 3–8 s | Plain words, maybe the messy "before" | "Updates live in twelve tabs." |
| Reveal | 8–14 s | The product rises in a `BrowserFrame`, punch-in | "Meet Acme Boards." |
| Feature 1–3 | 14–44 s | Copy beside the real UI; cursor does the thing; punch-in on the result | "Everything in one board." |
| Mobile / integrations | 44–50 s | `PhoneFrame`, or a row of integration icons the product really has | "Reply from anywhere." |
| Proof | 50–55 s | `CountUp` stats, customer logos, one quote, all real and approved | "12,000 teams." |
| CTA | 55–60 s | Name, promise, URL or button; holds still | "Free for teams up to 10. acme.com" |

For 15 to 30 s, keep hook, reveal, one feature and the CTA. For 90 s, add features, a before/after
or a customer moment.

## Writing the lines

- One idea per scene, under 10 words on screen. If it needs a paragraph, it needs another scene.
- Benefits, not features: "Status writes itself", not "Automated status aggregation engine".
- The product's real words: name its screens and buttons as the UI does.
- Concrete beats clever. Numbers beat adjectives (if they're true).
- Read it aloud at the scene's length; if it doesn't fit, cut words, don't speed up.

## Showing the product

- **Real screens only,** captured from the product with pretend data (see capture.md). Never mock
  up UI that doesn't exist, unless the user asks for a concept film and it's labelled as such.
- **Show the result, not the form.** The best feature shot is a before and after: the empty
  state, then the finished thing. Capture both and cross-cut, or type into the field with
  `Typewriter` over the screenshot.
- **Sequences:** for a typing or loading moment, capture 3 to 6 frames (`t.still` after each
  step) and switch between them on set frames inside the frame component.
- **Scroll** a full-page capture (`fullPage: true`) with the frame's `scroll` prop, keyframed with
  `kf`, to tour a long page in one move.
- **Point the eye:** `PunchIn`, `Highlight` (ring + dim) and `Cursor` (glide + click ripple).
  Use one of them per beat, not all three.

## Sound

- A music bed that fits the brand. Use only tracks the user can license (their library, a
  licensed stock track, or a Creative Commons track whose terms they'll meet, with the credit in
  the description). Fade in over 0.5 s and out over the last 3 s; keep it around 0.3 volume under
  any voice.
- Cut scenes on the beat if the track has a clear one: time scene lengths to its bars.
- Voice-over is optional. If there is one, write the script first and time the scenes to it.

## Checking a cut

- Render stills at the landing moment of each scene and look at every one: overlaps, text
  touching devices, empty or loading screens, typos, real personal data.
- Watch the whole film once at full speed. Does every scene land before it leaves? Is anything
  moving during a hold?
- Check the end frame: it should be a clean, still CTA.
