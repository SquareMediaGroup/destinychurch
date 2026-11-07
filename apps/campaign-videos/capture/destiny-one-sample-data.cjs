// Sample data for screenshotting the Destiny One web build in the campaign videos.
// All people are fictional. Events and sermons are the church's real public ones.
const NOW = Date.now();
const ago = (min) => new Date(NOW - min * 60000).toISOString();
const ahead = (days, hour = 19) => {
  const d = new Date(NOW + days * 86400000);
  d.setHours(hour, 30, 0, 0);
  return d.toISOString();
};

const people = {
  me: { id: "m-me", displayName: "Jordan Ellis" },
  priya: { id: "m-priya", displayName: "Priya Shah" },
  dan: { id: "m-dan", displayName: "Daniel Okafor" },
  hannah: { id: "m-hannah", displayName: "Hannah Clarke" },
  tom: { id: "m-tom", displayName: "Tom Bennett" },
  chloe: { id: "m-chloe", displayName: "Chloe Martin" },
  marcus: { id: "m-marcus", displayName: "Marcus Reid" },
  office: { id: "m-office", displayName: "Destiny Church Office" },
};

const me = {
  id: people.me.id,
  displayName: people.me.displayName,
  firstName: "Jordan",
  lastName: "Ellis",
  nameChangesLeft: 2,
  nextNameChangeAt: null,
  avatarUrl: null,
  blocked: [],
  readReceipts: true,
  status: "active",
  roles: ["cg_leader"],
  isAdult: true,
  isStaff: false,
  consents: [
    { document: "privacy", version: "1", acceptedAt: ago(60 * 24 * 30) },
    { document: "terms", version: "1", acceptedAt: ago(60 * 24 * 30) },
    { document: "chat_review_notice", version: "1", acceptedAt: ago(60 * 24 * 30) },
  ],
  outstandingConsents: [],
  verified: true,
  verification: "churchsuite",
  onboarding: "active",
  onboardingMessage: null,
};

let mid = 1000;
const msg = (groupId, sender, body, minutesAgo, extra = {}) => ({
  id: ++mid,
  groupId,
  sender: sender ? { id: sender.id, displayName: sender.displayName } : null,
  body,
  replyTo: null,
  attachment: null,
  content: null,
  reactions: [],
  createdAt: ago(minutesAgo),
  editedAt: null,
  mentions: [],
  forwarded: false,
  linkPreview: null,
  deleted: false,
  mine: sender?.id === people.me.id,
  ...extra,
});

const xcel = {
  seriesKey: "xcel-2026",
  slug: "xcel-men-s-conference-2026",
  name: "XCEL Men's Conference 2026",
  startsAt: ahead(3, 19),
  location: "Destiny Centre, Stockton-on-Tees",
  imageUrl: "https://cdn.churchsuite.com/OPUzT18j/calendar/events/1798_PxQJkpCY_lg.jpg",
  webUrl: "https://destinychurch.vercel.app/whats-on/xcel-men-s-conference-2026",
};

const messages = {
  "g-worship": [
    msg("g-worship", people.priya, "Morning all! Setlist for Sunday is in. Rehearsal Thursday 7pm 🎶", 190),
    msg("g-worship", people.dan, "I'll bring the new in-ears", 182),
    msg("g-worship", people.hannah, "Can't wait. That new song is beautiful", 175, { reactions: [{ emoji: "❤️", count: 4, mine: true }] }),
    msg("g-worship", people.priya, null, 120, {
      content: {
        kind: "poll",
        poll: {
          id: "p1",
          question: "Which key for the opener?",
          options: [{ id: "o1", label: "G" }, { id: "o2", label: "A" }, { id: "o3", label: "Bb" }],
          allowMultiple: false,
          totalVoters: 7,
          votes: [{ optionId: "o1", count: 2 }, { optionId: "o2", count: 4 }, { optionId: "o3", count: 1 }],
          myOptionIds: ["o2"],
        },
      },
    }),
    msg("g-worship", people.me, "A works best for the choir. See you Thursday!", 95, { reactions: [{ emoji: "👍", count: 3, mine: false }] }),
    msg("g-worship", people.tom, "Last Sunday's message if anyone missed it", 40, {
      content: {
        kind: "sermon",
        sermon: {
          videoId: "0PpN71rVRJc",
          title: "Unstoppable Vision",
          speaker: "Jonathan Harris",
          thumbnailUrl: "https://i.ytimg.com/vi/0PpN71rVRJc/hqdefault.jpg",
          publishedAt: ago(60 * 24 * 7),
          durationSeconds: 3120,
        },
      },
    }),
    msg("g-worship", people.chloe, "So good. That word on vision has stuck with me all week 🙌", 22, { reactions: [{ emoji: "🙏", count: 5, mine: true }] }),
    msg("g-worship", people.me, "Same here. Praying for everyone serving this weekend", 6),
  ],
  "g-announce": [
    msg("g-announce", people.office, "Welcome to Destiny One! Church news and notices will appear here.", 60 * 24 * 3),
    msg("g-announce", people.office, "Men, this one's for you. Bring a friend!", 60 * 5, { content: { kind: "event", event: xcel } }),
    msg("g-announce", people.office, "Sunday service starts at 11am, with prayer from 10am. Doors open 9:45am.", 35),
  ],
};

// AI_STAGE (env) steps through a DestinyAI conversation for the demo: 1 the question, 2 the answer,
// 3 a follow-up that plays a sermon in the chat.
const AI_STAGE = Number(process.env.AI_STAGE || 2);
const destinyAi = { id: "destinyai", displayName: "DestinyAI" };
messages["g-ai"] = [
  msg("g-ai", people.me, "What's on at church this week?", 4),
  msg("g-ai", destinyAi, "Here's what's coming up:\n\n- Alpha at Destiny, Wednesday 7:30pm\n- XCEL Men's Conference, Friday 7:30pm\n- Sunday service at 11am, with prayer from 10am\n\nWant me to share one of these to a chat?", 3),
  msg("g-ai", people.me, "Can I watch last Sunday's message?", 2),
  msg("g-ai", destinyAi, "Of course. Here's last Sunday's message, \"Unstoppable Vision\" with Jonathan Harris:", 1, {
    content: { kind: "sermon", sermon: { videoId: "0PpN71rVRJc", title: "Unstoppable Vision", speaker: "Jonathan Harris", thumbnailUrl: "https://i.ytimg.com/vi/0PpN71rVRJc/hqdefault.jpg", publishedAt: ago(60 * 24 * 7), durationSeconds: 3120 } },
  }),
].slice(0, AI_STAGE === 1 ? 1 : AI_STAGE === 2 ? 2 : 4);
const lastOf = (groupId) => {
  const list = messages[groupId];
  if (!list || !list.length) return null;
  const m = list[list.length - 1];
  return {
    id: m.id,
    senderName: m.sender?.displayName ?? null,
    preview: m.body ?? (m.content?.kind === "poll" ? "Poll: " + m.content.poll.question : m.content?.kind === "event" ? m.content.event.name : null),
    hasAttachment: false,
    deleted: false,
    createdAt: m.createdAt,
  };
};

const group = (id, communityId, name, opts = {}) => ({
  id,
  communityId,
  kind: opts.kind ?? "group",
  name,
  department: opts.department ?? null,
  iconUrl: null,
  state: "active",
  frozenReason: null,
  myRole: opts.myRole ?? "member",
  unreadCount: opts.unread ?? 0,
  muted: false,
  archived: false,
  lastMessage: opts.last ?? lastOf(id),
});

const preview = (sender, text, minutesAgo) => ({ id: ++mid, senderName: sender.displayName, preview: text, hasAttachment: false, deleted: false, createdAt: ago(minutesAgo) });

const communities = [
  {
    id: "c-church",
    name: "Destiny Church",
    description: "The whole church family",
    myRole: "member",
    canManage: false,
    announcementsGroupId: "g-announce",
    groups: [
      group("g-announce", "c-church", "Announcements", { kind: "announcements", unread: 1 }),
      group("g-worship", "c-church", "Worship Team", { department: "Worship", unread: 3, myRole: "admin" }),
      group("g-welcome", "c-church", "Sunday Welcome Team", { department: "Welcome", last: preview(people.marcus, "Coffee rota is up, thanks everyone!", 70) }),
    ],
  },
  {
    id: "c-youth",
    name: "Destiny Youth",
    description: "Youth leaders and volunteers",
    myRole: "member",
    canManage: false,
    announcementsGroupId: null,
    groups: [
      group("g-youthleaders", "c-youth", "Youth Leaders", { department: "Youth", unread: 2, last: preview(people.hannah, "Games night plan for Wednesday attached", 48) }),
    ],
  },
  {
    id: "c-connect",
    name: "Connect Groups",
    description: "Find your people",
    myRole: "admin",
    canManage: true,
    announcementsGroupId: null,
    groups: [
      group("g-norton", "c-connect", "Tuesday Connect, Norton", { myRole: "admin", last: preview(people.chloe, "Bringing cake this week 🍰", 150) }),
      group("g-prayer", "c-connect", "Prayer Team", { last: preview(people.dan, "Praying for you all this morning", 260) }),
    ],
  },
];

const allGroups = communities.flatMap((c) => c.groups);

const members = (n) => Object.values(people).filter((p) => p.id !== "m-office").slice(0, n).map((p, i) => ({ id: p.id, displayName: p.displayName, role: i < 2 ? "admin" : "member", tag: i === 0 ? "cg_leader" : null, joinedAt: ago(60 * 24 * 60), isAdult: true }));

const detail = (g) => ({
  ...g,
  description: g.id === "g-worship" ? "Rotas, setlists and rehearsals for the worship team." : null,
  members: members(7),
  canManage: g.myRole === "admin",
  canPost: g.kind !== "announcements",
  pinned: [],
  rules: { members: 7, adults: 7, minMembers: 3, minAdults: 2 },
});

const events = [
  { seriesKey: "xcel-2026", slug: xcel.slug, name: xcel.name, startsAt: xcel.startsAt, location: xcel.location, thumbnailUrl: xcel.imageUrl, webUrl: xcel.webUrl },
  { seriesKey: "alpha", slug: "alpha-at-destiny", name: "Alpha at Destiny", startsAt: ahead(1, 19), location: "Destiny Centre", thumbnailUrl: null, webUrl: "https://destinychurch.vercel.app/whats-on/alpha-at-destiny" },
  { seriesKey: "bible-conv", slug: "bible-conversations", name: "Bible Conversations", startsAt: ahead(5, 19), location: "Destiny Centre", thumbnailUrl: null, webUrl: "https://destinychurch.vercel.app/whats-on/bible-conversations" },
  { seriesKey: "tots", slug: "tots-morning-stay-and-play", name: "Tots Morning Stay and Play", startsAt: ahead(6, 10), location: "Destiny Centre", thumbnailUrl: null, webUrl: "https://destinychurch.vercel.app/whats-on/tots-morning-stay-and-play" },
];

function handle(method, path) {
  const p = path.replace(/^\/api\/app\/v1\/one/, "").split("?")[0];
  if (p === "/config") return { minBuild: { ios: 0, android: 0 }, forceUpdateMessage: null, maintenanceMessage: null, storeUrl: { ios: "", android: "" }, latestVersion: null };
  if (p === "/me" || p === "/auth/link") return me;
  if (p === "/communities") return communities;
  let m;
  if ((m = p.match(/^\/communities\/([^/]+)$/))) return communities.find((c) => c.id === m[1]);
  if ((m = p.match(/^\/groups\/([^/]+)$/))) return detail(m[1] === "g-ai" ? group("g-ai", null, "DestinyAI", { kind: "assistant" }) : (allGroups.find((g) => g.id === m[1]) ?? allGroups[1]));
  if ((m = p.match(/^\/groups\/([^/]+)\/messages$/))) {
    if (method !== "GET") return msg(m[1], people.me, "", 0);
    return { messages: [...(messages[m[1]] ?? [])], nextBefore: null };
  }
  if ((m = p.match(/^\/groups\/([^/]+)\/media$/))) return { messages: [], nextBefore: null };
  if (p === "/events") return events;
  if (p === "/assistant") return group("g-ai", null, "DestinyAI", { kind: "assistant" });
  if (p.startsWith("/search")) return [];
  if (p.startsWith("/directory")) return [];
  return { ok: true };
}

module.exports = { handle, me, people };
