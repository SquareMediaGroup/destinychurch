// Generate the leadership feature-overview Word document.
// Usage: NODE_PATH=$(npm root -g) node scripts/leadership-doc.mjs
import {
  Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell, ImageRun,
  Header, Footer, AlignmentType, LevelFormat, TabStopType, TabStopPosition,
  TableOfContents, HeadingLevel, BorderStyle, WidthType, ShadingType,
  VerticalAlign, PageNumber, PageBreak,
} from "docx";
import sharp from "sharp";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, "..");
const IMG = path.join(ROOT, "docs", "leadership", "screenshots", "doc");
const OUT = path.join(ROOT, "docs", "leadership", "Destiny Church Website Feature Overview.docx");

const ORANGE = "F58021";
const GREY = "2B2B2B";
const LIGHT = "F4F4F4";

// ---- helpers --------------------------------------------------------------
const DISPLAY_W = 540; // px display width for full-width screenshots

async function image(file, captionText, displayWidth = DISPLAY_W) {
  const src = path.join(IMG, file);
  const meta = await sharp(src).metadata();
  const w = displayWidth;
  const h = Math.round(displayWidth * (meta.height / meta.width));
  const kids = [
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { before: 120, after: 40 },
      children: [
        new ImageRun({
          type: "jpg",
          data: fs.readFileSync(src),
          transformation: { width: w, height: h },
          altText: { title: captionText, description: captionText, name: file },
        }),
      ],
    }),
  ];
  if (captionText) {
    kids.push(
      new Paragraph({
        alignment: AlignmentType.CENTER,
        spacing: { after: 200 },
        children: [new TextRun({ text: captionText, italics: true, size: 18, color: "777777" })],
      })
    );
  }
  return kids;
}

const h1 = (text) => new Paragraph({ heading: HeadingLevel.HEADING_1, children: [new TextRun(text)] });
const h2 = (text) => new Paragraph({ heading: HeadingLevel.HEADING_2, children: [new TextRun(text)] });
const h3 = (text) => new Paragraph({ heading: HeadingLevel.HEADING_3, children: [new TextRun(text)] });

const p = (text, opts = {}) =>
  new Paragraph({ spacing: { after: 140 }, children: [new TextRun({ text, ...opts })] });

const lead = (label, text) =>
  new Paragraph({
    spacing: { after: 120 },
    children: [
      new TextRun({ text: label + "  ", bold: true, color: ORANGE }),
      new TextRun({ text }),
    ],
  });

const bullet = (text) =>
  new Paragraph({ numbering: { reference: "bullets", level: 0 }, spacing: { after: 60 }, children: [new TextRun(text)] });

const bulletRich = (boldPart, rest) =>
  new Paragraph({
    numbering: { reference: "bullets", level: 0 },
    spacing: { after: 60 },
    children: [new TextRun({ text: boldPart + " ", bold: true }), new TextRun({ text: rest })],
  });

// Simple 2-col feature table (Feature | What it does)
function featureTable(rows) {
  const border = { style: BorderStyle.SINGLE, size: 1, color: "DDDDDD" };
  const borders = { top: border, bottom: border, left: border, right: border };
  const W = 9360, C0 = 2900, C1 = 6460;
  const header = new TableRow({
    tableHeader: true,
    children: ["Page / Feature", "What it does"].map((t, i) =>
      new TableCell({
        borders,
        width: { size: i === 0 ? C0 : C1, type: WidthType.DXA },
        shading: { fill: ORANGE, type: ShadingType.CLEAR },
        margins: { top: 80, bottom: 80, left: 120, right: 120 },
        children: [new Paragraph({ children: [new TextRun({ text: t, bold: true, color: "FFFFFF", size: 20 })] })],
      })
    ),
  });
  const body = rows.map(([a, b], idx) =>
    new TableRow({
      children: [
        new TableCell({
          borders, width: { size: C0, type: WidthType.DXA },
          shading: { fill: idx % 2 ? "FFFFFF" : LIGHT, type: ShadingType.CLEAR },
          margins: { top: 70, bottom: 70, left: 120, right: 120 },
          children: [new Paragraph({ children: [new TextRun({ text: a, bold: true, size: 19 })] })],
        }),
        new TableCell({
          borders, width: { size: C1, type: WidthType.DXA },
          shading: { fill: idx % 2 ? "FFFFFF" : LIGHT, type: ShadingType.CLEAR },
          margins: { top: 70, bottom: 70, left: 120, right: 120 },
          children: [new Paragraph({ children: [new TextRun({ text: b, size: 19 })] })],
        }),
      ],
    })
  );
  return new Table({ width: { size: W, type: WidthType.DXA }, columnWidths: [C0, C1], rows: [header, ...body] });
}

// ---- build ----------------------------------------------------------------
const build = async () => {
  const children = [];

  // ---------- COVER ----------
  children.push(
    new Paragraph({ spacing: { before: 2600 }, alignment: AlignmentType.CENTER,
      children: [new TextRun({ text: "DESTINY CHURCH TEES VALLEY", bold: true, size: 30, color: ORANGE })] }),
    new Paragraph({ alignment: AlignmentType.CENTER, spacing: { before: 240 },
      children: [new TextRun({ text: "Website Feature Overview", bold: true, size: 64, color: GREY })] }),
    new Paragraph({ alignment: AlignmentType.CENTER, spacing: { before: 200 },
      children: [new TextRun({ text: "A complete tour of the destinytees.uk platform", size: 28, color: "666666" })] }),
    new Paragraph({ alignment: AlignmentType.CENTER, spacing: { before: 1400 },
      border: { top: { style: BorderStyle.SINGLE, size: 6, color: ORANGE, space: 8 } },
      children: [new TextRun({ text: "Prepared for Church Leadership", size: 24, bold: true })] }),
    new Paragraph({ alignment: AlignmentType.CENTER, spacing: { before: 120 },
      children: [new TextRun({ text: "29 May 2026  •  Prepared by Square Media Group", size: 20, color: "666666" })] }),
    new Paragraph({ children: [new PageBreak()] }),
  );

  // ---------- TOC ----------
  children.push(
    h1("Contents"),
    new TableOfContents("Table of Contents", { hyperlink: true, headingStyleRange: "1-2" }),
    new Paragraph({ children: [new PageBreak()] }),
  );

  // ---------- 1. EXECUTIVE SUMMARY ----------
  children.push(
    h1("1. Executive Summary"),
    p("The Destiny Church website (destinytees.uk) is a modern, fully custom-built digital platform — not an off-the-shelf template. It serves two audiences at once: visitors and members exploring church life, and the staff team who manage everything behind the scenes through a purpose-built admin area."),
    p("The site brings together everything a growing church needs in one place: a welcoming public website, an automatically-updating sermon library, an events calendar, online giving, ministry pages, the Alpha course, and a complete content-management system that lets the team publish and update pages without touching code."),
    p("It also includes a set of intelligent, AI-powered tools that set the platform apart: a Smart Search assistant that answers visitor questions, a dedicated Alpha helper, and an AI Page Builder that can generate an entire new web page from a plain-English description."),
    h2("Headline capabilities at a glance"),
    featureTable([
      ["Public website", "45+ pages covering services, ministries, beliefs, events, giving and more"],
      ["Smart Search (AI)", "Visitors ask a question in plain English and get an instant, church-specific answer"],
      ["Sermon library", "Automatically pulls and displays the latest messages from the church YouTube channel"],
      ["Online giving", "Secure card giving, standing orders and Gift Aid, integrated with ChurchSuite"],
      ["Events & Alpha", "Live events calendar plus a dedicated Alpha section with its own AI assistant"],
      ["Admin platform", "Staff manage pages, sermons, banners, pop-ups and more from one secure dashboard"],
      ["AI Page Builder", "Describe a page in words; the system builds, checks and publishes it automatically"],
    ]),
    new Paragraph({ children: [new PageBreak()] }),
  );

  // ---------- 2. PUBLIC WEBSITE ----------
  children.push(h1("2. The Public Website"));

  // 2.1 Home
  children.push(
    h2("2.1  Homepage"),
    p("The homepage is the front door of the church. It opens with a full-screen “Welcome Home” hero and immediately gives visitors the two most common next steps: plan a visit, or watch a sermon."),
    lead("Welcome & invitation:", "A warm hero banner with clear calls to action for new and returning visitors."),
    lead("Mission statement:", "The church’s vision — “Transforming Lives through Faith, Hope and Love for Jesus” — with a photo and introduction to the Lead Pastors, Jonathan & Cath Harris."),
    lead("Latest sermon:", "The most recent message is pulled in automatically with a thumbnail and one-click “Watch Now” button."),
    lead("What’s On carousel:", "A scrollable strip of upcoming events drawn live from the church’s booking system."),
    lead("Everyone Has a Place:", "Quick links into the main ministries — Kids, Youth, Young Adults and Connect Groups."),
    lead("Worship & connect:", "Invitations to plan a visit, watch online, join a Connect Group and serve on a team."),
    ...(await image("01-home.jpg", "Homepage — hero, mission, latest sermon, events and ministry sections")),
    new Paragraph({ children: [new PageBreak()] }),
  );

  // 2.2 Nav + Smart Search
  children.push(
    h2("2.2  Navigation & Smart Search"),
    p("Every page shares a clean navigation bar grouping the site into What’s On, Sermons, Serve, About and Give, with a prominent “New Here?” button for first-time visitors."),
    lead("Smart Search (AI):", "The magnifying-glass icon opens an intelligent search box. Instead of just matching keywords, it understands plain-English questions (e.g. “What time are services?”) and answers using the church’s own information and sermon library. A follow-up chat assistant, “Ask Destiny”, can continue the conversation — and it is carefully limited to church-related topics only."),
    lead("Always reachable:", "The header stays available as visitors scroll, and the layout adapts cleanly to phones and tablets."),
    new Paragraph({ children: [new PageBreak()] }),
  );

  // 2.3 About
  children.push(
    h2("2.3  About"),
    p("The About section tells the church’s story and helps visitors understand who Destiny is before they arrive."),
    bulletRich("Our Mission —", "the heart and purpose of the church."),
    bulletRich("Foundational Pillars —", "the core values the church is built on."),
    bulletRich("Meet the Team —", "introductions to the pastors and leadership."),
    bulletRich("What We Believe —", "a clear statement of faith and beliefs."),
    bulletRich("Plan a Visit —", "practical information for a first Sunday."),
    ...(await image("02-about.jpg", "About page — the church’s story, values and team")),
    new Paragraph({ children: [new PageBreak()] }),
  );

  // 2.4 What's On
  children.push(
    h2("2.4  What’s On (Events)"),
    p("The What’s On page is a live events calendar. Events are managed in the church’s booking system (ChurchSuite) and appear automatically on the website — there is no double-entry."),
    lead("Live & always current:", "New events, dates and times flow straight through from the booking system."),
    lead("Rich detail:", "Each event shows its date, time, location, recurring sessions (e.g. “7 SESSIONS”) and multi-day spans."),
    lead("Easy browsing:", "Visitors scroll horizontally through upcoming events and open any one for full details."),
    ...(await image("03-whats-on.jpg", "What’s On — the live events calendar")),
    new Paragraph({ children: [new PageBreak()] }),
  );

  // 2.5 Sermons
  children.push(
    h2("2.5  Sermons"),
    p("The sermon library is one of the platform’s most powerful time-savers. It connects directly to the church’s YouTube channel and keeps itself up to date with no manual work."),
    lead("Automatic updates:", "Whenever a new message is posted to YouTube, it appears in the sermon library automatically, with title, date, description and thumbnail."),
    lead("Watch in place:", "Visitors can play messages directly on the site, or open the full archive."),
    lead("Guest speakers:", "A dedicated area highlights messages from visiting speakers."),
    ...(await image("04-sermons.jpg", "Sermons — automatically synced from the church YouTube channel")),
    new Paragraph({ children: [new PageBreak()] }),
  );

  // 2.6 Giving
  children.push(
    h2("2.6  Giving"),
    p("The Give page makes generosity simple and secure, offering several ways to give and the information regular givers need."),
    lead("Card & online giving:", "A secure giving form (powered by ChurchSuite) lets people give instantly by card."),
    lead("Standing order & bank transfer:", "Clear details for setting up regular giving directly through the bank."),
    lead("Gift Aid:", "Explains how UK taxpayers can add 25% to their gift at no extra cost to them."),
    ...(await image("05-give.jpg", "Giving — secure online giving, standing orders and Gift Aid")),
    new Paragraph({ children: [new PageBreak()] }),
  );

  // 2.7 New Here
  children.push(
    h2("2.7  New Here / Plan a Visit"),
    p("Designed specifically for first-time visitors, this page removes the unknowns of a first Sunday: what time to arrive, where to park, what happens for children, and what to expect from the service."),
    lead("Practical reassurance:", "Service times, doors-open time, free parking, step-free access, accessible toilets, hearing loop and BSL interpretation are all spelled out."),
    ...(await image("06-new-here.jpg", "New Here — everything a first-time visitor needs to know")),
    new Paragraph({ children: [new PageBreak()] }),
  );

  // 2.8 Ministries
  children.push(
    h2("2.8  Ministries"),
    p("Dedicated pages help every age and stage find their place in church life."),
    bulletRich("Destiny Kids —", "a fun, safe environment where children learn about the Bible through games, stories and singing."),
    bulletRich("Destiny Youth —", "a vibrant ministry helping young people encounter God and build friendships."),
    bulletRich("Young Adults —", "a community of young adults growing in faith together."),
    bulletRich("Connect Groups —", "small groups that are central to the life and health of the church."),
    bulletRich("Destiny Recovery —", "support and devotionals for those on a recovery journey."),
    ...(await image("07-kids.jpg", "Destiny Kids ministry page")),
    ...(await image("08-youth.jpg", "Destiny Youth ministry page")),
    new Paragraph({ children: [new PageBreak()] }),
    ...(await image("09-young-adults.jpg", "Young Adults ministry page")),
    ...(await image("10-connect.jpg", "Connect Groups page")),
    new Paragraph({ children: [new PageBreak()] }),
  );

  // 2.9 Alpha
  children.push(
    h2("2.9  Alpha"),
    p("Alpha is a key outreach tool, so it has its own dedicated landing page — and its own intelligent helper."),
    lead("Alpha Ask (AI):", "A purpose-built assistant answers questions about Alpha (its topics, format and dates) in a warm, conversational tone, and offers a sign-up call to action. Like Smart Search, it stays strictly on topic."),
    lead("Invitation-ready:", "Clear information and calls to action make it easy to invite a friend."),
    ...(await image("11-alpha.jpg", "Alpha — dedicated landing page with an AI Alpha assistant")),
    new Paragraph({ children: [new PageBreak()] }),
  );

  // 2.10 Beliefs / sacraments
  children.push(
    h2("2.10  Beliefs, Baptism & Child Dedication"),
    p("These pages cover the foundations of faith and the key milestone moments in church life."),
    bulletRich("What We Believe —", "a clear, accessible statement of the church’s beliefs."),
    bulletRich("Baptism —", "what baptism means and how to take the next step."),
    bulletRich("Child Dedication —", "information for families wishing to dedicate their children."),
    ...(await image("12-beliefs.jpg", "What We Believe — the church’s statement of faith")),
    new Paragraph({ children: [new PageBreak()] }),
  );

  // 2.11 Missions
  children.push(
    h2("2.11  Missions"),
    p("The Missions page shares the church’s outreach and global partnerships, helping the congregation see and support the wider work being done in the community and around the world."),
    ...(await image("13-missions.jpg", "Missions — outreach and partnerships")),
    new Paragraph({ children: [new PageBreak()] }),
  );

  // 2.12 Contact
  children.push(
    h2("2.12  Contact"),
    p("The Contact page gives multiple ways to get in touch and routes enquiries to the right place automatically."),
    lead("Contact form:", "Submissions are emailed straight to the church office (via a secure email service), so nothing gets missed."),
    lead("Connect Card:", "A digital connect card lets people request prayer, share a decision or ask to get involved."),
    lead("Church details:", "Address (Destiny Centre, Norton Road, Stockton-on-Tees, TS20 2QQ), phone and email are clearly listed."),
    ...(await image("14-contact.jpg", "Contact — form, connect card and church details")),
    new Paragraph({ children: [new PageBreak()] }),
  );

  // 2.13 Hire
  children.push(
    h2("2.13  Venue Hire"),
    p("The Hire page presents the Destiny Centre as a venue available to the wider community, opening an additional avenue for connection and income."),
    ...(await image("15-hire.jpg", "Venue Hire — the Destiny Centre as a community venue")),
    new Paragraph({ children: [new PageBreak()] }),
  );

  // 2.14 Annual report
  children.push(
    h2("2.14  Annual Report 2025"),
    p("A dedicated, shareable Annual Report page communicates the year’s story, impact and finances to the congregation and stakeholders in an attractive, web-native format."),
    ...(await image("16-annual-report.jpg", "Annual Report 2025")),
    new Paragraph({ children: [new PageBreak()] }),
  );

  // 2.15 Legal
  children.push(
    h2("2.15  Legal & Compliance"),
    p("The site includes the policy pages a responsible church and UK charity needs, all maintained through the same content system as the rest of the site:"),
    bulletRich("Privacy Policy —", "how personal data is handled, in line with UK GDPR."),
    bulletRich("Data & GDPR Policy —", "the church’s data-protection commitments."),
    bulletRich("Safeguarding Policy —", "the church’s commitment to keeping people safe."),
    bulletRich("Terms of Use —", "the terms governing use of the website."),
    new Paragraph({ children: [new PageBreak()] }),
  );

  // 2.16 Cookie consent
  children.push(
    h2("2.16  Privacy Controls & Cookie Consent"),
    p("On first visit, every visitor sees a clear cookie banner. They can accept all cookies or choose essential-only. Optional features — embedded forms, YouTube videos and anonymous analytics — only load once the visitor has given permission. This keeps the church on the right side of privacy law and respects visitor choice."),
    new Paragraph({ children: [new PageBreak()] }),
  );

  // ---------- 3. SMART FEATURES ----------
  children.push(
    h1("3. Smart Features (AI)"),
    p("A defining strength of this platform is its built-in artificial intelligence. Three distinct AI tools work quietly in the background to help visitors and save staff time."),
    h2("3.1  Smart Search & “Ask Destiny”"),
    p("Visitors type a question in everyday language and receive an instant, accurate answer drawn from the church’s own information and sermon archive. A conversational follow-up assistant can keep helping. Crucially, it is fenced to church topics only and is protected against misuse with built-in rate limiting."),
    h2("3.2  Alpha Ask"),
    p("A separate assistant on the Alpha page answers questions specifically about the Alpha course and gently points people towards signing up."),
    h2("3.3  AI Page Builder"),
    p("The standout staff tool. From the admin area, a team member describes the page they want in plain English — its goal, audience and key sections — and the system generates a complete, real web page, automatically checks it for errors, publishes it, and emails an audit of what it built. What once required a developer can now be done by any staff member in minutes."),
    ...(await image("21-admin-ai-builder.jpg", "The AI Page Builder — describe a page and the system builds it")),
    new Paragraph({ children: [new PageBreak()] }),
  );

  // ---------- 4. ADMIN ----------
  children.push(
    h1("4. The Admin Platform"),
    p("Behind the public website sits a complete, secure management dashboard. It puts the team in full control of the site’s content without needing technical help."),
    h2("4.1  Secure Sign-In"),
    p("Access is protected by a secure login. The team can manage their own accounts, including password reset and account recovery."),
    ...(await image("19-admin-login.jpg", "Secure admin sign-in")),
    new Paragraph({ children: [new PageBreak()] }),
    h2("4.2  Pages Manager"),
    p("The heart of the admin area. Every page on the site is listed here — currently 26 published pages and any drafts — with the ability to create, edit, preview, publish or delete. Staff can build pages with AI, edit content directly, or work from a starting template."),
    ...(await image("20-admin-pages.jpg", "Pages Manager — create, edit and publish every page on the site")),
    new Paragraph({ children: [new PageBreak()] }),
    h2("4.3  Sermons Management"),
    p("Tools to manage how sermons appear, complementing the automatic YouTube sync — for example, curating which messages are featured."),
    ...(await image("22-admin-sermons.jpg", "Sermons management")),
    new Paragraph({ children: [new PageBreak()] }),
    h2("4.4  Site Banner"),
    p("A site-wide announcement bar the team can switch on for important notices (e.g. a weather closure or a special service), with a custom message and link — no code required."),
    ...(await image("23-admin-banner.jpg", "Site banner manager")),
    h2("4.5  Pop-ups"),
    p("Timed pop-ups can promote a key event or campaign to visitors, fully controlled by the team."),
    ...(await image("24-admin-popup.jpg", "Pop-up manager")),
    new Paragraph({ children: [new PageBreak()] }),
    h2("4.6  Alpha Events"),
    p("A dedicated manager for the Alpha course schedule, which feeds the public Alpha page and its assistant."),
    ...(await image("25-admin-alpha.jpg", "Alpha events manager")),
    h2("4.7  Redirects"),
    p("Lets the team point old or printed links to the right page — useful when a flyer or social post uses a short, memorable web address."),
    ...(await image("26-admin-redirects.jpg", "Redirects manager")),
    h2("4.8  Cache Control"),
    p("A one-click “Clear Cache” tool ensures changes appear on the live site instantly when needed."),
    new Paragraph({ children: [new PageBreak()] }),
  );

  // ---------- 5. TECHNOLOGY ----------
  children.push(
    h1("5. Technology & Reliability"),
    p("The platform is built on a modern, professional technology stack used by leading organisations worldwide. In plain terms, this means it is fast, secure, reliable and built to grow with the church."),
    featureTable([
      ["Built with", "Next.js — a leading modern web framework for fast, secure, high-quality sites"],
      ["Hosting", "Vercel — enterprise-grade hosting with global speed and automatic scaling"],
      ["Database & accounts", "Supabase — secure storage for pages and admin accounts"],
      ["Sermons", "YouTube integration — messages sync automatically from the church channel"],
      ["Giving & forms", "ChurchSuite — secure giving and event/connect forms"],
      ["Email", "Resend — reliable delivery of contact-form and system emails"],
      ["AI", "OpenAI — powers Smart Search, Alpha Ask and the AI Page Builder"],
      ["Performance", "Speed Insights and privacy-friendly analytics monitor site health"],
    ]),
    p("The result is a website that loads quickly, works on every device, protects visitor data, and can be managed entirely by the church team.", { italics: true }),
    new Paragraph({ children: [new PageBreak()] }),
  );

  // ---------- 6. FULL PAGE INDEX ----------
  children.push(
    h1("6. Complete Page Index"),
    p("For reference, the full list of pages currently live on the public website:"),
    featureTable([
      ["Home (/)", "Main landing page"],
      ["About (/about)", "Mission, values, team and beliefs"],
      ["What’s On (/whats-on)", "Live events calendar"],
      ["Sermons (/sermons)", "Auto-synced sermon library"],
      ["Guest Speakers (/sermons/guest-speakers)", "Messages from visiting speakers"],
      ["Give (/give)", "Online giving, standing order, Gift Aid"],
      ["New Here (/new-here) & Plan a Visit (/visit)", "First-time visitor information"],
      ["Connect (/connect) & Connect Card (/connect-card)", "Connect Groups and digital connect card"],
      ["Serve (/serve) & Volunteer (/volunteer)", "Joining a team"],
      ["Destiny Kids (/kids) & Kids Camp (/dckids)", "Children’s ministry"],
      ["Destiny Youth (/youth)", "Youth ministry"],
      ["Young Adults (/young-adults)", "Young adults ministry"],
      ["Alpha (/alpha)", "Alpha course with AI assistant"],
      ["Beliefs (/beliefs)", "Statement of faith"],
      ["Baptism (/baptism)", "Baptism information"],
      ["Child Dedication (/child-dedication)", "Child dedication information"],
      ["Destiny Recovery (/destiny-recovery)", "Recovery support and devotionals"],
      ["Missions (/missions)", "Outreach and partnerships"],
      ["Contact (/contact)", "Contact form and details"],
      ["Hire (/hire)", "Venue hire"],
      ["Annual Report (/annual-report-2025)", "Yearly report"],
      ["Help (/help)", "Help and support"],
      ["Privacy, Terms, Safeguarding, Data & GDPR", "Legal and compliance policies"],
    ]),
    new Paragraph({ spacing: { before: 300 },
      children: [new TextRun({ text: "Prepared by Square Media Group — 29 May 2026", italics: true, color: "888888", size: 18 })] }),
  );

  // ---- document ----
  const doc = new Document({
    creator: "Square Media Group",
    title: "Destiny Church Website Feature Overview",
    description: "A complete tour of the destinytees.uk platform, prepared for church leadership.",
    styles: {
      default: { document: { run: { font: "Arial", size: 22, color: GREY } } },
      paragraphStyles: [
        { id: "Heading1", name: "Heading 1", basedOn: "Normal", next: "Normal", quickFormat: true,
          run: { size: 36, bold: true, font: "Arial", color: ORANGE },
          paragraph: { spacing: { before: 360, after: 220 }, outlineLevel: 0,
            border: { bottom: { style: BorderStyle.SINGLE, size: 6, color: ORANGE, space: 4 } } } },
        { id: "Heading2", name: "Heading 2", basedOn: "Normal", next: "Normal", quickFormat: true,
          run: { size: 28, bold: true, font: "Arial", color: GREY },
          paragraph: { spacing: { before: 260, after: 140 }, outlineLevel: 1 } },
        { id: "Heading3", name: "Heading 3", basedOn: "Normal", next: "Normal", quickFormat: true,
          run: { size: 24, bold: true, font: "Arial", color: "555555" },
          paragraph: { spacing: { before: 180, after: 100 }, outlineLevel: 2 } },
      ],
    },
    numbering: {
      config: [
        { reference: "bullets",
          levels: [{ level: 0, format: LevelFormat.BULLET, text: "•", alignment: AlignmentType.LEFT,
            style: { paragraph: { indent: { left: 540, hanging: 260 } } } }] },
      ],
    },
    sections: [{
      properties: {
        page: { size: { width: 12240, height: 15840 }, margin: { top: 1440, right: 1440, bottom: 1440, left: 1440 } },
      },
      headers: {
        default: new Header({ children: [new Paragraph({
          alignment: AlignmentType.RIGHT,
          border: { bottom: { style: BorderStyle.SINGLE, size: 4, color: "DDDDDD", space: 4 } },
          children: [new TextRun({ text: "Destiny Church Tees Valley — Website Feature Overview", size: 16, color: "999999" })],
        })] }),
      },
      footers: {
        default: new Footer({ children: [new Paragraph({
          tabStops: [{ type: TabStopType.RIGHT, position: TabStopPosition.MAX }],
          border: { top: { style: BorderStyle.SINGLE, size: 4, color: "DDDDDD", space: 4 } },
          children: [
            new TextRun({ text: "Prepared by Square Media Group", size: 16, color: "999999" }),
            new TextRun({ text: "\tPage ", size: 16, color: "999999" }),
            new TextRun({ children: [PageNumber.CURRENT], size: 16, color: "999999" }),
          ],
        })] }),
      },
      children,
    }],
  });

  const buffer = await Packer.toBuffer(doc);
  fs.writeFileSync(OUT, buffer);
  console.log("✅ wrote", OUT);
};

build().catch((e) => { console.error("❌", e); process.exit(1); });
