import React from "react";
import { linearTiming, TransitionSeries } from "@remotion/transitions";
import { fade } from "@remotion/transitions/fade";
import { AbsoluteFill, Html5Audio, Img, interpolate, staticFile, useCurrentFrame, useVideoConfig } from "remotion";
import { C, dosis, roboto } from "./theme";
import { Body, Center, Headline, Kicker, Logo, MacBook, Page, PunchIn, kf, useExit, usePunch } from "./ui";

/**
 * "Welcome to Destiny Admin": the first video in the admin help series (destinytees.uk/admin/help,
 * and YouTube). What the admin is, a light pass over every role, test mode, and where the series lives.
 * Screens are the real /admin, captured with invented data by capture/admin.cjs.
 *
 * Music: "Inspired" by Kevin MacLeod (incompetech.com), licensed under Creative Commons:
 * By Attribution 4.0 (https://creativecommons.org/licenses/by/4.0/). Credit it in the YouTube description.
 */

const X = 8;
const SHOT = 982 / 1512;

const Exit: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const e = useExit(20);
  return <AbsoluteFill style={{ opacity: e, translate: `0px ${(1 - e) * -90}px` }}>{children}</AbsoluteFill>;
};

/** Text on the left, the admin on a MacBook rising in on the right. */
const MacSplit: React.FC<{
  kicker: string;
  title: string;
  body: string;
  accent?: string[];
  mac: React.ReactNode;
  punch?: { at: number; hold: number };
  children?: React.ReactNode;
}> = ({ kicker, title, body, accent, mac, punch, children }) => {
  const frame = useCurrentFrame();
  const away = usePunch(punch?.at ?? 100000, punch?.hold ?? 1);
  return (
    <Page>
      <Exit>
        <AbsoluteFill style={{ flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 90, paddingLeft: 40 }}>
          <div style={{ width: 620, display: "flex", flexDirection: "column", gap: 24, opacity: 1 - away }}>
            <Kicker>{kicker}</Kicker>
            <Headline text={title} size={76} align="left" accent={accent} />
            <Body delay={26} align="left" size={36}>
              {body}
            </Body>
            {children}
          </div>
          <div style={{ translate: `0px ${kf(frame, [0, 46], [800, 0])}px` }}>{mac}</div>
        </AbsoluteFill>
      </Exit>
    </Page>
  );
};

const W = 1060;

/** A second screenshot fading in over the first, on the MacBook's screen. */
const Over: React.FC<{ src: string; at: number }> = ({ src, at }) => {
  const frame = useCurrentFrame();
  return <Img src={staticFile(src)} style={{ position: "absolute", inset: 0, width: "100%", height: "auto", opacity: kf(frame, [at, at + 20], [0, 1]) }} />;
};

// 1. Hook
const HookScene: React.FC = () => (
  <Page bg={C.white}>
    <Exit>
      <Center gap={30}>
        <Kicker>Admin help · Video 1</Kicker>
        <Headline text="Welcome to Destiny Admin." size={120} accent={["Destiny", "Admin"]} />
      </Center>
    </Exit>
  </Page>
);

// 2. What it is
const OverviewScene: React.FC = () => (
  <MacSplit
    kicker="Destiny Admin"
    title="One place to run the church online."
    body="Posts, events, the shop, sermons, the Destiny One app and more, all behind one sign-in."
    accent={["One"]}
    mac={<MacBook src="admin/admin-dashboard.jpg" width={W} sourceAspect={SHOT} />}
  />
);

// 3. Roles narrow the admin
const RoleChip: React.FC<{ label: string; at: number; until?: number }> = ({ label, at, until }) => {
  const frame = useCurrentFrame();
  const o = kf(frame, [at, at + 16], [0, 1]) * (until ? kf(frame, [until, until + 12], [1, 0]) : 1);
  return (
    <div
      style={{
        position: "absolute",
        display: "inline-flex",
        alignSelf: "flex-start",
        padding: "12px 26px",
        borderRadius: 999,
        background: C.ink,
        color: C.white,
        fontFamily: roboto,
        fontWeight: 600,
        fontSize: 32,
        opacity: o,
        translate: `0px ${(1 - o) * 16}px`,
      }}
    >
      {label}
    </div>
  );
};

const RolesIntroScene: React.FC = () => (
  <MacSplit
    kicker="Roles"
    title="What you see depends on your role."
    body="Each role opens its own part of the admin. Most people have one or two, and the sidebar only shows what's yours."
    accent={["role"]}
    mac={
      <PunchIn at={150} hold={50} zoom={1.7} x={0.06} y={0.3}>
        <MacBook src="admin/admin-dashboard.jpg" width={W} sourceAspect={SHOT}>
          <Over src="admin/admin-dashboard-event.jpg" at={110} />
        </MacBook>
      </PunchIn>
    }
  >
    <div style={{ position: "relative", height: 70, marginTop: 14 }}>
      <RoleChip label="Super Admin: everything" at={50} until={104} />
      <RoleChip label="Event Admin: just events" at={116} />
    </div>
  </MacSplit>
);

// 4–6. Every role, lightly
type Role = { name: string; line: string };

const RoleCard: React.FC<{ role: Role; delay: number }> = ({ role, delay }) => {
  const frame = useCurrentFrame();
  const p = kf(frame, [delay, delay + 34], [0, 1]);
  return (
    <div
      style={{
        width: 760,
        padding: "34px 40px",
        borderRadius: 32,
        background: C.white,
        boxShadow: "0 18px 50px rgba(0,0,0,0.07)",
        display: "flex",
        flexDirection: "column",
        gap: 10,
        borderLeft: `10px solid ${C.orange}`,
        opacity: p,
        translate: `0px ${(1 - p) * 70}px`,
      }}
    >
      <div style={{ fontFamily: roboto, fontWeight: 700, fontSize: 46, letterSpacing: "-0.02em", color: C.ink }}>{role.name}</div>
      <div style={{ fontFamily: roboto, fontSize: 32, lineHeight: 1.3, color: C.muted }}>{role.line}</div>
    </div>
  );
};

const RolesScene: React.FC<{ kicker: string; title: string; accent?: string[]; roles: Role[] }> = ({ kicker, title, accent, roles }) => (
  <Page>
    <Exit>
      <AbsoluteFill style={{ alignItems: "center", paddingTop: 110, gap: 22 }}>
        <Kicker>{kicker}</Kicker>
        <Headline text={title} size={80} accent={accent} />
        <div style={{ display: "flex", flexWrap: "wrap", justifyContent: "center", gap: 36, width: 1600, marginTop: 50 }}>
          {roles.map((r, i) => (
            <RoleCard key={r.name} role={r} delay={30 + i * 14} />
          ))}
        </div>
      </AbsoluteFill>
    </Exit>
  </Page>
);

const WEBSITE_ROLES: Role[] = [
  { name: "Site Admin", line: "Posts, pages and redirects across the website." },
  { name: "Event Admin", line: "Courses, pop-ups, the featured event and links pages." },
  { name: "Store Admin", line: "Products, stock and orders in the shop." },
  { name: "Sermon Admin", line: "Uploading sermons and publishing the podcast." },
];
const TEAM_ROLES: Role[] = [
  { name: "Training Admin", line: "The training the team works through." },
  { name: "HR Admin", line: "Staff, leave requests and checklists." },
  { name: "Design Admin", line: "Design requests, from ticket to finished files." },
];
const PEOPLE_ROLES: Role[] = [
  { name: "Destiny One Admin", line: "Who's in the app: requests, invites and groups." },
  { name: "Safeguarding Admin", line: "Reports, and stepping in when something's wrong." },
  { name: "Super Admin", line: "Every section, plus who gets which role." },
];

// 7. First sign-in
const FirstSignInScene: React.FC = () => (
  <MacSplit
    kicker="Your first sign-in"
    title="A short tour, made for your role."
    body="The first time you sign in, the admin names your roles and offers to show you around."
    accent={["tour"]}
    mac={<MacBook src="admin/admin-welcome.jpg" width={W} sourceAspect={SHOT} />}
  />
);

// 8. Test mode
const TestModeScene: React.FC = () => (
  <MacSplit
    kicker="Test mode"
    title="Try it without breaking anything."
    body="The tour uses the real pages in test mode, so you can press every button and nothing is saved. Pick it up any time from Get Started."
    accent={["anything"]}
    punch={{ at: 160, hold: 40 }}
    mac={
      <PunchIn at={160} hold={40} zoom={1.8} x={0.86} y={0.72}>
        <MacBook src="admin/admin-tour.jpg" width={W} sourceAspect={SHOT}>
          <Over src="admin/admin-checklist.jpg" at={120} />
        </MacBook>
      </PunchIn>
    }
  />
);

// 9. The series
const SeriesScene: React.FC = () => (
  <MacSplit
    kicker="The video series"
    title="A video for every role."
    body="Short how-to videos, one for each role, so you can learn your part at your own pace and come back whenever you need to."
    accent={["every"]}
    mac={
      <PunchIn at={140} hold={50} zoom={1.5} x={0.1} y={0.2}>
        <MacBook src="admin/admin-help.jpg" width={W} sourceAspect={SHOT} />
      </PunchIn>
    }
    punch={{ at: 140, hold: 50 }}
  />
);

// 10. Stuck
const StuckScene: React.FC = () => (
  <Page bg={C.white}>
    <Exit>
      <Center gap={34}>
        <Headline text="Stuck? Open Help in the sidebar." size={104} accent={["Help"]} />
        <Body delay={30} size={44}>
          Every video lives there, and the tour is one click away.
        </Body>
      </Center>
    </Exit>
  </Page>
);

// 11. End
const EndScene: React.FC = () => {
  const frame = useCurrentFrame();
  return (
    <Page bg={C.white}>
      <Center gap={34}>
        <div style={{ opacity: kf(frame, [2, 28], [0, 1]) }}>
          <Logo width={560} />
        </div>
        <div style={{ overflow: "hidden" }}>
          <div style={{ fontFamily: roboto, fontWeight: 700, fontSize: 96, letterSpacing: "-0.04em", color: C.ink, translate: `0px ${kf(frame, [20, 54], [110, 0])}%` }}>
            Welcome to the team.
          </div>
        </div>
        <div style={{ fontFamily: dosis, fontWeight: 700, fontSize: 32, letterSpacing: "0.18em", textTransform: "uppercase", color: C.accent, opacity: kf(frame, [50, 80], [0, 1]) }}>
          destinytees.uk/admin/help
        </div>
      </Center>
    </Page>
  );
};

const SCENES: { name: string; seconds: number; el: React.ReactNode }[] = [
  { name: "Hook", seconds: 4, el: <HookScene /> },
  { name: "Overview", seconds: 8, el: <OverviewScene /> },
  { name: "Roles", seconds: 9.5, el: <RolesIntroScene /> },
  { name: "Website roles", seconds: 9, el: <RolesScene kicker="The website" title="Looking after the website." accent={["website"]} roles={WEBSITE_ROLES} /> },
  { name: "Team roles", seconds: 8, el: <RolesScene kicker="The team" title="Behind the scenes." accent={["scenes"]} roles={TEAM_ROLES} /> },
  { name: "People roles", seconds: 8.5, el: <RolesScene kicker="Destiny One and safeguarding" title="Keeping people connected and safe." accent={["safe"]} roles={PEOPLE_ROLES} /> },
  { name: "First sign-in", seconds: 7, el: <FirstSignInScene /> },
  { name: "Test mode", seconds: 10, el: <TestModeScene /> },
  { name: "Series", seconds: 9.5, el: <SeriesScene /> },
  { name: "Stuck", seconds: 5.5, el: <StuckScene /> },
  { name: "End", seconds: 5, el: <EndScene /> },
];

const FPS = 30;
export const ADMIN_WELCOME_FRAMES = SCENES.reduce((n, s) => n + Math.round(s.seconds * FPS), 0) - (SCENES.length - 1) * X;

const Music: React.FC = () => {
  const { durationInFrames } = useVideoConfig();
  return (
    <Html5Audio
      src={staticFile("audio/inspired.mp3")}
      volume={(f) => interpolate(f, [0, 12, durationInFrames - 90, durationInFrames - 2], [0, 0.8, 0.8, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" })}
    />
  );
};

export const AdminWelcome: React.FC = () => (
  <AbsoluteFill style={{ background: C.page }}>
    <Music />
    <TransitionSeries>
      {SCENES.flatMap((s, i) => [
        ...(i ? [<TransitionSeries.Transition key={`t${i}`} presentation={fade()} timing={linearTiming({ durationInFrames: X })} />] : []),
        <TransitionSeries.Sequence key={s.name} name={s.name} durationInFrames={Math.round(s.seconds * FPS)}>
          {s.el}
        </TransitionSeries.Sequence>,
      ])}
    </TransitionSeries>
  </AbsoluteFill>
);
