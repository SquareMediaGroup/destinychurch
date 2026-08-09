# Destiny Church Tees Valley

The official website for Destiny Church Tees Valley — a multi-cultural church based in Stockton-on-Tees. The platform covers the full church digital presence: sermon streaming and archive, events, ministries, a merchandise shop, staff training, an HR/jobs system, member engagement, venue hire, AI Smart Search, and a protected admin dashboard.

Designed, engineered, and deployed by [Square Media Group](mailto:hello@squaremediagroup.org) as part of Square's mission to equip churches with world-class digital tools.

> For a deep, line-by-line explanation of the codebase — architecture, database schema, every route, component, API, and library — see [`REPOSITORY_DOCUMENTATION.md`](./REPOSITORY_DOCUMENTATION.md) (also available as a printable [PDF](./REPOSITORY_DOCUMENTATION.pdf)).

---

## Features

- Sermon streaming and archive with series/speaker filtering and live-stream banner
- Events and "What's On" listings — unified event cards, on-site event pages, a swappable featured event/course, ICS calendar downloads, and on-site ChurchSuite signup
- Ministry pages (Kids/DC Kids, Youth, Young Adults, Missions, Connect groups)
- The Bible Course and Alpha journeys, including Alpha signup and event management
- Merchandise shop with Stripe checkout (cards, Apple Pay, Google Pay, Link) and category filtering
- Staff training courses with progress tracking and timed modules
- HR & jobs system — job board, applications, staff directory, leave requests, documents, reviews
- Venue hire enquiry system
- Connect card, prayer request, and contact forms
- Giving, volunteer, and serve pages
- `/governance` transparency page — charity and company registration, trustees/directors, charitable objects, and five-year financial and filing history, drawn live from the Charity Commission and Companies House registers
- `/nfc` "digital back of seats" — a standalone page an NFC tag or QR code on a seat opens during a service, with admin-managed tiles
- AI Smart Search — OpenAI tool-calling chat with product cards, weather, maps/directions, and live web search
- Cloudflare Turnstile bot protection on sign-in and Smart Search
- Protected admin dashboard (sermons, pages/posts, redirects, banner, popup, shop, training, HR, Alpha, recovery)
- Companion React Native / Expo mobile app (Phase 1 — Home/Sermons/Events/Give tabs) sharing brand tokens and event logic via `@destiny/shared`
- Mobile-first, fully responsive, accessibility-focused

---

## Tech Stack

| Layer | Technology |
|---|---|
| Framework | Next.js 16 (App Router), React 19 |
| Mobile | React Native 0.79 / Expo 53 (Expo Router) |
| Language | TypeScript |
| Styling | Tailwind CSS v4 |
| Backend / Auth | Supabase (PostgreSQL + Row-Level Security) |
| Payments | Stripe (Payment Element + Express Checkout) |
| AI Smart Search | OpenAI (tool-calling chat) |
| Web Search | Tavily (search + extract) |
| Governance data | Charity Commission + Companies House public APIs |
| Bot Protection | Cloudflare Turnstile |
| Email | Resend |
| Video | YouTube Data API v3 |
| Media Processing | Sharp (image resize/WebP) |
| Rich Text | TipTap |
| Analytics | Vercel Analytics + Speed Insights |
| Deployment | Vercel |
| Testing | Playwright (E2E) |

---

## Getting Started

### Prerequisites

- Node.js 18+
- A [Supabase](https://supabase.com) project
- A [Resend](https://resend.com) account
- A Google [YouTube Data API v3](https://developers.google.com/youtube/v3) key
- A [Stripe](https://stripe.com) account (for the shop)
- An [OpenAI](https://openai.com) API key and a [Tavily](https://tavily.com) key (for Smart Search)
- A [Cloudflare Turnstile](https://www.cloudflare.com/products/turnstile/) site/secret key pair

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
YOUTUBE_CHANNEL_HANDLE=DestinyOnlineChurch      # optional — the @ name, overrides CHANNEL_HANDLE for live detection
YOUTUBE_CHANNEL_VANITY=destinychurchteesvalley  # optional — the custom URL, overrides CHANNEL_VANITY

# Email
RESEND_API_KEY=your_resend_api_key

# Stripe (shop checkout)
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=your_stripe_publishable_key
STRIPE_SECRET_KEY=your_stripe_secret_key
STRIPE_WEBHOOK_SECRET=your_stripe_webhook_secret

# AI Smart Search
OPENAI_API_KEY=your_openai_api_key
TAVILY_API_KEY=your_tavily_api_key
NEXT_PUBLIC_GOOGLE_MAPS_EMBED_API_KEY=your_google_maps_embed_key

# Cloudflare Turnstile
NEXT_PUBLIC_TURNSTILE_SITE_KEY=your_turnstile_site_key
TURNSTILE_SECRET_KEY=your_turnstile_secret_key
TURNSTILE_COOKIE_SECRET=your_turnstile_cookie_secret

# Scheduled jobs / misc
CRON_SECRET=your_cron_secret
```

See [`REPOSITORY_DOCUMENTATION.md`](./REPOSITORY_DOCUMENTATION.md) for the full list of optional and per-feature environment variables.

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
├── about/            # About the church
├── admin/            # Protected admin dashboard
├── alpha/            # Alpha course
├── baptism/          # Baptism info
├── beliefs/          # Doctrine & beliefs
├── bible-course/     # The Bible Course
├── child-dedication/ # Child dedication
├── connect/          # Connect groups
├── connect-card/     # Connection & prayer form
├── contact/          # Contact form
├── dckids/           # DC Kids ministry
├── destiny-recovery/ # Recovery ministry
├── give/             # Giving & donations
├── governance/       # Charity/company registration & transparency (live regulator data)
├── hire/             # Venue hire enquiries
├── jobs/             # Job board & applications
├── kids/             # Kids ministry
├── links/            # Link hub
├── live/             # Live stream
├── missions/         # Missions & outreach
├── new-here/         # First-time visitor guide
├── nfc/              # "Digital back of seats" — NFC/QR tap-to-open service page
├── safeguarding/     # Safeguarding policy
├── sermons/          # Sermon archive & individual pages
├── serve/            # Volunteer opportunities
├── shop/             # Merchandise shop (Stripe checkout)
├── training/         # Staff training courses
├── visit/            # Plan a visit
├── whats-on/         # Events & what's on
├── young-adults/     # Young adults ministry
├── youth/            # Youth ministry
├── [slug]/           # Dynamic CMS pages
└── api/              # YouTube, chat, store, training, HR, webhooks, admin endpoints

components/           # Shared UI components (incl. smartSearch, admin, shop, training)
lib/                  # Server actions, data access, Stripe, Smart Search, HR, training utilities
supabase/
└── migrations/       # Database schema migrations
mobile/               # React Native / Expo app — Phase 1 (Home/Sermons/Events/Give tabs)
packages/shared/      # @destiny/shared — types & logic shared by web, mobile & app BFF
app/api/app/          # App BFF — mobile-facing endpoints (e.g. /api/app/events)
```

---

## Admin Dashboard

The `/admin` area is protected by Supabase Auth. Log in at `/login` to manage:

- **Sermons & Posts** — add, edit, or hide sermon videos and content pages
- **Shop** — products, categories, hero, and orders
- **Training** — courses, modules, and featured course
- **HR & Jobs** — job listings, applications, staff directory, leave, documents, reviews
- **Alpha & Recovery** — signups and events
- **Redirects** — configure URL redirects
- **Banner & Popup** — control the site-wide announcement banner and popups
- **NFC** — manage the tiles shown on the `/nfc` "digital back of seats" page
- **Cache** — trigger on-demand revalidation

---

## Testing & Linting

```bash
npm test              # Everything
npm run test:unit     # Plain-Node unit specs — no browser, no dev server
npm run test:e2e      # Browser E2E (chromium)
npm run typecheck     # tsc --noEmit
npm run lint          # Linting
```

Some E2E specs need an admin session and skip themselves unless credentials are
supplied. The test login lives in the gitignored `CLAUDE.local.md`:

```bash
ADMIN_EMAIL=... ADMIN_PASSWORD=... npm run test:e2e
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
