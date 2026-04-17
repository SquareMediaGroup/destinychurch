# Destiny Church Tees Valley

The official website for Destiny Church Tees Valley — a multi-cultural church based in Stockton-on-Tees. The platform covers the full church digital presence: sermon streaming and archive, events, ministries, member engagement, venue hire, and an admin dashboard.

Designed, engineered, and deployed by [Square Media Group](mailto:hello@squaremediagroup.org) as part of Square's mission to equip churches with world-class digital tools.

---

## Features

- Sermon streaming and archive with series/speaker filtering
- Events and what's on listings
- Ministry pages (Kids, Youth, Young Adults, Missions)
- Venue hire enquiry system
- Connect card and prayer request forms
- Giving and volunteer pages
- AI-ready transcript infrastructure
- Protected admin dashboard (sermons, pages, redirects, banner)
- Mobile-first, fully responsive
- AI Smart Search (Powered by OpenAI)

---

## Tech Stack

| Layer | Technology |
|---|---|
| Framework | Next.js 16 (App Router), React 19 |
| Language | TypeScript |
| Styling | Tailwind CSS v4 |
| Backend / Auth | Supabase (PostgreSQL + Row-Level Security) |
| Email | Resend |
| Deployment | Vercel |
| Testing | Playwright (E2E) |

---

## Getting Started

### Prerequisites

- Node.js 18+
- A [Supabase](https://supabase.com) project
- A [Resend](https://resend.com) account
- A Google [YouTube Data API v3](https://developers.google.com/youtube/v3) key

### Environment Variables

Create a `.env.local` file in the project root:

```env
# Supabase
NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key

# YouTube
YOUTUBE_API_KEY=your_youtube_api_key
YOUTUBE_CHANNEL_ID=your_youtube_channel_id

# Email
RESEND_API_KEY=your_resend_api_key
```

### Install & Run

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

### Build for Production

```bash
npm run build
npm run start
```

---

## Project Structure

```
app/
├── about/          # About the church
├── beliefs/        # Doctrine & beliefs
├── connect/        # Connect groups
├── connect-card/   # Connection & prayer form
├── contact/        # Contact form
├── give/           # Giving & donations
├── hire/           # Venue hire enquiries
├── kids/           # Kids ministry
├── missions/       # Missions & outreach
├── new-here/       # First-time visitor guide
├── serve/          # Volunteer opportunities
├── sermons/        # Sermon archive & individual pages
├── visit/          # Plan a visit
├── whats-on/       # Events
├── young-adults/   # Young adults ministry
├── youth/          # Youth ministry
├── admin/          # Protected admin dashboard
└── api/            # YouTube integration & admin endpoints

components/         # Shared UI components
supabase/
└── migrations/     # Database schema migrations
```

---

## Admin Dashboard

The `/admin` area is protected by Supabase Auth. Log in at `/admin/login` to manage:

- **Sermons** — add, edit, or hide sermon videos
- **Pages** — manage dynamic content pages
- **Redirects** — configure URL redirects
- **Banner** — control the site-wide announcement banner

---

## Testing & Linting

```bash
npx playwright test   # E2E tests
npm run lint          # Linting
```

---

## Licensing & Source Code

This repository is public for transparency and demonstration purposes, but is **not open source**.

The full production source code is available for purchase or licensed use. Licensing options are available for churches, ministries, networks, white-label platforms, and enterprise deployments.

Enquiries: [hello@squaremediagroup.org](mailto:hello@squaremediagroup.org)

---

## Built by Square Media Group

Square Media Group is a technology and creative company specialising in church platforms, media-heavy web systems, streaming and content infrastructure, and long-term digital strategy.

---

© Square Media Group. All rights reserved.  
No part of this project may be copied, modified, distributed, or deployed without explicit written permission, unless otherwise licensed.
