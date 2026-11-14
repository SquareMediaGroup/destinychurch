#!/usr/bin/env python3
"""Contact sheet of a tutorial's steps, to check the frames before rendering.

Thirty steps per sheet: each step's "before" frame (what the viewer sees as the cursor moves), its
number, and a red box where the cursor will land. Look for boxes in the wrong place, empty pages,
dimmed pop-ups or anything that isn't what the caption says.

  python3 scripts/contact-sheet.py src/tutorials/<id>-steps.json public/tutorial/<id> out/<id>-sheet.png [start]

Needs Pillow (pip install pillow).
"""
import json
import sys

from PIL import Image, ImageDraw

manifest, frames, out = sys.argv[1], sys.argv[2], sys.argv[3]
start = int(sys.argv[4]) if len(sys.argv) > 4 else 0
steps = json.load(open(manifest))["steps"][start : start + 30]
W, H = 384, 216
sheet = Image.new("RGB", (5 * W, 6 * H), "white")
for i, step in enumerate(steps):
    im = Image.open(f"{frames}/{step['before']}").convert("RGB").resize((W, H))
    d = ImageDraw.Draw(im)
    t = step.get("target")
    if t:
        d.rectangle([t["x"] * W, t["y"] * H, (t["x"] + t["w"]) * W, (t["y"] + t["h"]) * H], outline="red", width=2)
    d.rectangle([0, 0, 30, 14], fill="black")
    d.text((2, 1), str(start + i + 1), fill="white")
    sheet.paste(im, ((i % 5) * W, (i // 5) * H))
sheet.save(out)
print(f"{len(steps)} steps → {out}")
