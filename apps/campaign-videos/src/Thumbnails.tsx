import { AbsoluteFill, Img, Still, staticFile } from "remotion";
import { Folder } from "remotion";
import { C, anton, dosis, roboto } from "./theme";

// YouTube thumbnails for the admin help series, 1280×720. One design: the role in big type on the
// left, a real screen from that video on the right, running off the edge. The screens are copies of
// one frame from each tutorial (public/thumbnails/<id>.jpg), so they render without re-filming.
// Render: npm run thumbnails (→ out/thumbnails/<id>.jpg).

interface Thumb {
  id: string;
  /** Big text, one line per entry. */
  lines: string[];
  hook: string;
  /** Which part of the screen to show: the point that sits at the card's top-left, and the zoom. */
  focus?: { x: number; y: number; zoom: number };
}

export const THUMBS: Thumb[] = [
  { id: "welcome", lines: ["Destiny", "Admin"], hook: "Start here", focus: { x: 0.03, y: 0.03, zoom: 1.8 } },
  { id: "shop", lines: ["Store", "Admin"], hook: "Running the shop" },
  { id: "events", lines: ["Event", "Admin"], hook: "Events and announcements" },
  { id: "site", lines: ["Site", "Admin"], hook: "Pages, links and status", focus: { x: 0.0, y: 0.0, zoom: 1.5 } },
  { id: "training", lines: ["Training", "Admin"], hook: "Training for every team" },
  { id: "hr", lines: ["HR", "Admin"], hook: "Looking after the team" },
  { id: "design", lines: ["Design", "Admin"], hook: "From request to design" },
  { id: "sermons", lines: ["Sermon", "Admin"], hook: "Sermons on the podcast", focus: { x: 0.27, y: 0.09, zoom: 2 } },
  { id: "super", lines: ["Super", "Admin"], hook: "Running the whole admin" },
  { id: "d1", lines: ["Destiny One", "Admin"], hook: "Looking after the app" },
  { id: "safeguarding", lines: ["Safeguarding", "Admin"], hook: "Keeping Destiny One safe", focus: { x: 0.15, y: 0.12, zoom: 1.9 } },
];

const W = 1280;
const H = 720;
const CARD = { left: 620, top: 96, width: 760, height: 560 };

const Thumbnail: React.FC<{ thumb: Thumb }> = ({ thumb }) => {
  const { x, y, zoom } = thumb.focus ?? { x: 0.15, y: 0.04, zoom: 1.8 };
  const imgW = CARD.width * zoom;
  // The longest line sets the type size, so "Destiny One" and "guarding" both fit the column.
  const longest = Math.max(...thumb.lines.map((l) => l.length));
  const size = Math.min(132, Math.floor(760 / longest));
  return (
    <AbsoluteFill style={{ background: C.white }}>
      <div style={{ position: "absolute", left: 560, top: 0, right: 0, bottom: 0, background: C.page }} />
      <div
        style={{
          position: "absolute",
          ...CARD,
          borderRadius: 22,
          overflow: "hidden",
          background: C.white,
          boxShadow: "0 30px 80px rgba(29,29,31,0.22), 0 0 0 1px rgba(29,29,31,0.06)",
        }}
      >
        <Img
          src={staticFile(`thumbnails/${thumb.id}.jpg`)}
          style={{ position: "absolute", width: imgW, left: -x * imgW, top: -y * imgW * (1440 / 2560) }}
        />
      </div>

      <div style={{ position: "absolute", left: 64, top: 56, width: 500, height: H - 112, display: "flex", flexDirection: "column" }}>
        <Img src={staticFile("brand/logo-colour.svg")} style={{ width: 230 }} />
        <div style={{ flex: 1 }} />
        <div style={{ fontFamily: dosis, fontWeight: 800, fontSize: 30, letterSpacing: 4, textTransform: "uppercase", color: C.accent }}>
          Admin help
        </div>
        <div style={{ fontFamily: anton, fontSize: size, lineHeight: 0.98, textTransform: "uppercase", color: C.ink, marginTop: 10 }}>
          {thumb.lines.map((l) => (
            <div key={l}>{l}</div>
          ))}
        </div>
        <div style={{ marginTop: 22, display: "flex", alignItems: "center", gap: 14 }}>
          <div style={{ width: 10, alignSelf: "stretch", borderRadius: 5, background: C.orange }} />
          <div style={{ fontFamily: roboto, fontWeight: 700, fontSize: 36, lineHeight: 1.15, color: C.ink, maxWidth: 430 }}>{thumb.hook}</div>
        </div>
        <div style={{ flex: 0.35 }} />
      </div>
    </AbsoluteFill>
  );
};

export const ThumbnailStills: React.FC = () => (
  <Folder name="Thumbnails">
    {THUMBS.map((t) => (
      <Still key={t.id} id={`Thumb-${t.id}`} component={Thumbnail} defaultProps={{ thumb: t }} width={W} height={H} />
    ))}
  </Folder>
);
