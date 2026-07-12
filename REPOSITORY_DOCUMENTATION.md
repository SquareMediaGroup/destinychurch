# Destiny Church Tees Valley — Complete Repository Documentation

**Version:** 1.0.1  
**Last Updated:** July 9, 2026  
**Repository:** Square Media Group — destinychurch  

This document provides a comprehensive explanation of every major component, line of code purpose, architecture decisions, and how the system works from end-to-end.

---

## Table of Contents

1. [Project Overview](#project-overview)
2. [Architecture & Philosophy](#architecture--philosophy)
3. [Technology Stack](#technology-stack)
4. [Directory Structure](#directory-structure)
5. [Database Schema](#database-schema)
6. [Core Application Layers](#core-application-layers)
7. [Routing & Pages](#routing--pages)
8. [Components](#components)
9. [API Routes & Server Actions](#api-routes--server-actions)
10. [Libraries & Utilities](#libraries--utilities)
11. [Authentication & Authorization](#authentication--authorization)
12. [Configuration](#configuration)
13. [Deployment & Performance](#deployment--performance)

---

## Project Overview

### What It Is

Destiny Church Tees Valley is a **full-stack church website platform** built by Square Media Group. It serves as the digital presence for a multi-cultural church in Stockton-on-Tees, UK, and handles:

- **Public Pages:** About, beliefs, events, contact, giving, venue hire
- **Ministry Pages:** Kids, youth, young adults, missions, connect groups
- **Media:** Sermon archive with 50+ videos, series/speaker filtering, AI-powered search
- **Member Engagement:** Prayer requests, volunteer signup, venue enquiries, connection forms
- **Admin Dashboard:** Protected area for staff to manage sermons, pages, redirects, banners, HR, jobs, training
- **Infrastructure:** Email, analytics, webhooks, caching, rate limiting

### Key Visitors

- **Church members:** Watch sermons, find events, volunteer, connect groups, training
- **First-time visitors:** Plan a visit, explore beliefs, understand what to expect
- **HR/Admin staff:** Manage jobs, staff directory, leave requests, documents
- **Job applicants:** Browse positions, submit applications
- **Training participants:** Access course materials and learning paths

### Non-Goals

- Real-time chat or messaging
- Video hosting (uses YouTube)
- Full ecommerce (giving is simplified)
- Social network features

---

## Architecture & Philosophy

### Key Design Principles

1. **Server-Driven:** Use server-side rendering and server actions wherever possible; minimize client-side complexity
2. **Security First:** Row-level security (RLS) on all sensitive data; rate limiting on public APIs; Supabase service role for backend operations
3. **Edge Caching:** Long TTLs on static assets; revalidate on-demand for dynamic content
4. **Mobile First:** Responsive Tailwind CSS; tested on real devices
5. **Accessibility:** Semantic HTML, ARIA labels, keyboard navigation
6. **AI-Ready:** Structured data for future AI features (smart search, content generation)
7. **No Vendor Lock-In:** Open-source stack (Next.js, React, Tailwind, Supabase PostgreSQL)

### Data Flow

```
User (Browser/Phone)
  ↓
Next.js App Router (Server/Client)
  ↓
API Routes (Node.js Serverless)
  ↓
Supabase PostgreSQL
  ↓
Responses: JSON, Server-Side HTML, Redirects, Cached Assets
```

### Authentication Layers

- **Public Pages:** No auth required; cached at edge
- **Member Features:** Supabase Auth (email/password); tokens in secure cookies
- **Admin Dashboard:** Supabase Auth required; additional role checks via proxy
- **API Endpoints:** Service role key (server-to-database); user tokens (client-to-server)

---

## Technology Stack

| Layer | Technology | Purpose |
|-------|-----------|---------|
| **Framework** | Next.js 16 (App Router) | Full-stack React with server-side rendering |
| **Language** | TypeScript | Type-safe code |
| **Styling** | Tailwind CSS v4 | Utility-first CSS framework |
| **Frontend** | React 19 | Component library and state management |
| **Database** | Supabase (PostgreSQL) | Relational database with RLS and real-time |
| **Auth** | Supabase Auth | User sessions and JWT tokens |
| **Email** | Resend | Transactional email (password resets, confirmations) |
| **Storage** | Supabase Storage | File uploads (HR documents, media, images) |
| **Video** | YouTube API v3 | Sermon hosting and metadata |
| **Podcasts** | Buzzsprout | Podcast RSS and metadata |
| **AI** | OpenAI (GPT-4 variant) | Smart search, page generation, code analysis |
| **Analytics** | Vercel Analytics + SpeedInsights | Performance and visitor tracking |
| **Deployment** | Vercel | Edge functions, serverless, CDN |
| **Testing** | Playwright | E2E browser testing |
| **Media Processing** | ffmpeg, Sharp | Image/video compression (not currently used in app) |
| **Search** | fuse.js + rbush | Client-side fuzzy search and spatial indexing |
| **Icons** | Phosphor + Material Symbols | Icon sets |
| **Rich Text** | TipTap (Prosemirror) | Sermon markdown, content editing |
| **State** | Zustand | Global client state (minimal usage) |
| **Motion** | Motion | Animation library |
| **QR Codes** | qrcode.react | QR code generation |

---

## Directory Structure

```
destinychurch/
├── app/                           # Next.js App Router routes
│   ├── layout.tsx                 # Root layout (header, footer, providers)
│   ├── page.tsx                   # Home page
│   ├── globals.css                # Tailwind + custom CSS
│   ├── robots.ts                  # robots.txt generation
│   ├── (public-pages)/            # Grouped public pages
│   │   ├── about/                 # About page
│   │   ├── beliefs/               # Beliefs page
│   │   ├── connect/               # Connect groups page
│   │   ├── give/                  # Giving/donations page
│   │   ├── kids/                  # Kids ministry
│   │   ├── youth/                 # Youth ministry
│   │   ├── young-adults/          # Young adults ministry
│   │   ├── missions/              # Missions & outreach
│   │   ├── serve/                 # Volunteer opportunities
│   │   ├── sermons/               # Sermon archive (+ [id] detail)
│   │   ├── contact/               # Contact form
│   │   ├── visit/                 # Plan a visit
│   │   ├── new-here/              # First-time visitor guide
│   │   ├── hire/                  # Venue hire enquiries
│   │   ├── connect-card/          # Prayer requests & connections
│   │   ├── alpha/                 # Alpha course info
│   │   ├── whats-on/              # Events listing
│   │   └── [slug]/                # Dynamic catchall page
│   ├── admin/                     # Protected admin dashboard
│   │   ├── login/                 # Admin login page
│   │   ├── forgot-password/       # Password recovery
│   │   ├── layout.tsx             # Admin layout (sidebar)
│   │   ├── page.tsx               # Admin home (dashboard)
│   │   ├── sermons/               # Manage sermons
│   │   ├── banner/                # Manage site banners
│   │   ├── popup/                 # Manage pop-ups
│   │   ├── redirects/             # Manage URL redirects
│   │   ├── cache/                 # Cache invalidation tools
│   │   ├── posts/                 # Standalone content pages
│   │   ├── training/              # Training/courses management
│   │   └── hr/                    # HR staff features (unlinked, in progress)
│   ├── jobs/                      # Job listing & application
│   │   ├── page.tsx               # Job list
│   │   ├── [slug]/page.tsx        # Job detail
│   │   ├── ApplyForm.tsx          # Job application form
│   │   └── actions.ts             # Server actions for applying
│   ├── api/                       # API routes (serverless functions)
│   │   ├── admin/                 # Admin API endpoints
│   │   │   ├── logout/            # End admin session
│   │   │   ├── redirects/         # CRUD redirects
│   │   │   ├── popup/             # CRUD pop-ups
│   │   │   ├── revalidate/        # ISR cache invalidation
│   │   │   └── ...
│   │   ├── public/                # Public API endpoints
│   │   │   ├── youtube-sync/      # Fetch latest YouTube videos
│   │   │   ├── smart-search/      # AI search endpoint
│   │   │   └── ...
│   │   ├── webhooks/              # GitHub, Vercel, etc.
│   │   └── ...
│   ├── [slug]/page.tsx            # Dynamic catchall (for dynamic pages)
│   └── annual-report-2025/        # Specific campaign pages
│
├── components/                    # React components (shared across pages)
│   ├── ChurchHeader.tsx           # Site header with nav
│   ├── ChurchFooter.tsx           # Site footer
│   ├── Providers.tsx              # Client context providers
│   ├── CookieBanner.tsx           # GDPR cookie consent
│   ├── AnalyticsGate.tsx          # Conditional analytics loading
│   ├── SiteBanner.tsx             # Announcement banner (from DB)
│   ├── SitePopup.tsx              # Modal pop-up (from DB)
│   ├── FloatingSmartSearch.tsx    # AI search widget
│   ├── VisualEditOverlay.tsx      # Admin edit mode overlay
│   ├── admin/                     # Admin-specific components
│   │   ├── AdminSidebar.tsx       # Admin nav menu
│   │   ├── training/              # Course management UI
│   │   ├── hr/                    # HR management UI (unlinked, in progress)
│   │   ├── posts/                 # Content editor
│   │   └── ...
│   ├── connect-card/              # Prayer form components
│   ├── kids/                      # Kids ministry components
│   ├── home/                      # Home page components
│   ├── visit/                     # Visit page components
│   ├── serve/                     # Volunteer components
│   ├── new-here/                  # Onboarding components
│   ├── alpha/                     # Alpha course components
│   ├── AnimateIn.tsx              # Scroll-triggered animations
│   ├── ChurchSuiteEmbed.tsx       # ChurchSuite integration (events)
│   └── ...
│
├── lib/                           # Utility functions and helpers
│   ├── supabase.ts                # Supabase admin client (server-only)
│   ├── supabase-browser.ts        # Supabase client (browser)
│   ├── sermons.ts                 # Sermon fetching & filtering
│   ├── youtube.ts                 # YouTube API client
│   ├── smartSearch.ts             # AI search logic
│   ├── pageContent.ts             # Dynamic page editing
│   ├── posts.ts                   # Dynamic posts/pages
│   ├── training.ts                # Training courses
│   ├── jobs.ts                    # Job listing & applications
│   ├── hr.ts                      # HR staff operations
│   ├── roles.ts                   # Permission checking
│   ├── siteKnowledge.ts           # AI search knowledge base
│   ├── serviceStatus.ts           # Feature flags
│   ├── rateLimit.ts               # Rate limiting
│   ├── loginRateLimit.ts          # Login attempt limiting
│   ├── podcast.ts                 # Podcast metadata
│   ├── accessRequestEmail.ts      # Email templates
│   ├── passwordResetEmail.ts      # Email templates
│   ├── staffLogins.ts             # Staff login records
│   ├── collections.ts             # Content collections
│   ├── sermonPlayerContext.tsx    # Sermon player state
│   ├── sermonSearchContext.tsx    # Sermon search state
│   ├── cookieConsent.tsx          # Cookie preferences
│   ├── alphaSession.ts            # Alpha course sessions
│   ├── trainingAccess.ts          # Training permissions
│   ├── ai/                        # AI-specific utilities
│   │   ├── llm-client.ts          # OpenAI wrapper
│   │   ├── code-generator.ts      # Page generation from AI
│   │   ├── code-validator.ts      # Validation for generated code
│   │   ├── git-automation.ts      # Git commit automation
│   │   ├── page-audit-email.ts    # Page audit reports
│   │   ├── media-types.ts         # Media type detection
│   │   └── ...
│   ├── reserved-slugs.ts          # Protected URL paths
│   └── ...
│
├── supabase/                      # Supabase configuration
│   └── migrations/                # Database schema migrations
│       ├── 001_redirects.sql      # URL redirect table
│       ├── 002_hidden_videos.sql  # Hidden sermon videos
│       ├── 003_content.sql        # Site banner & page content
│       ├── 004_banner_type.sql    # Banner types (sitewide, alpha, etc.)
│       ├── 006_hire_enquiries.sql # Venue hire form submissions
│       ├── 007_alpha_events.sql   # Alpha course events
│       ├── 008_alpha_events_online.sql # Online/hybrid Alpha support
│       ├── 009_alpha_events_frequency.sql # Event recurrence
│       ├── 010_alpha_events_recovery_type.sql # Recovery program
│       ├── 20260712_alpha_events_bible_course_type.sql # The Bible Course
│       ├── 20260712_02_featured_course.sql # Featured course (What's On)
│       ├── 20260329_contact_messages.sql # Contact form submissions
│       ├── 20260502_site_popup.sql # Modal pop-ups
│       ├── 20260507_builder_media_bucket.sql # AI page builder media
│       ├── 20260514_studio_v2_schema.sql # Page builder schema
│       ├── 20260531_hr.sql        # HR staff, leave, reviews, documents
│       ├── 20260606_jobs.sql      # Job listings & applications
│       ├── 20260608_service_status.sql # Feature flags
│       ├── 20260614_staff_logins.sql # Staff login audit trail
│       ├── 20260708_shop.sql   # Shop: products, variants, orders, items
│       └── 20260710_shop_hero.sql # Editable auto-rotating /shop hero slides
│
├── utils/                         # Utility modules
│   ├── supabase/                  # Supabase client factories
│   │   ├── service.ts             # Service role client
│   │   └── ...
│   └── ...
│
├── contexts/                      # React context definitions
├── content/                       # Static content (markdown, text)
├── docs/                          # Additional documentation
├── public/                        # Static files
│   ├── img/                       # Church logos, backgrounds
│   ├── og/                        # Open Graph images (social share)
│   ├── fonts/                     # Custom fonts
│   └── ...
│
├── .github/                       # GitHub workflows
│   └── workflows/                 # CI/CD pipelines
│
├── .claude/                       # Claude Code settings
├── .vscode/                       # VS Code workspace settings
├── next.config.ts                 # Next.js configuration
├── tailwind.config.ts             # Tailwind CSS customization
├── playwright.config.ts           # E2E test configuration
├── eslint.config.mjs              # ESLint rules
├── postcss.config.mjs             # PostCSS plugins
├── tsconfig.json                  # TypeScript compiler options
├── package.json                   # Node dependencies and scripts
├── package-lock.json              # Locked versions
├── .gitignore                     # Git exclusions
├── CLAUDE.md                      # Project instructions
├── README.md                      # Public project README
└── REPOSITORY_DOCUMENTATION.md    # This file
```

---

## Database Schema

### Overview

The database uses Supabase (managed PostgreSQL) with Row-Level Security (RLS) for sensitive data. Public tables are readable via the anonymous key; member-only and admin tables use the service role key (server-to-database communication).

### Tables

#### 1. **redirects**
**Purpose:** URL redirect management (e.g., `/prayer-request` → `/connect-card`)

```sql
CREATE TABLE redirects (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug text UNIQUE NOT NULL,            -- /short-path
  target_url text NOT NULL,             -- https://example.com or /absolute/path
  label text,                           -- Display name (unused currently)
  active boolean DEFAULT true,          -- Toggle visibility
  created_at timestamptz DEFAULT now()
);

-- RLS: Public read access to active redirects; service role has full access
```

**Used By:**
- `app/api/[slug]` or Next.js `redirects()` config during build
- Admin dashboard to manage redirects

---

#### 3. **site_banner**
**Purpose:** Sitewide announcement banners (top of every page)

```sql
CREATE TABLE site_banner (
  id uuid PRIMARY KEY,
  message text NOT NULL,               -- Banner text (HTML allowed)
  active boolean DEFAULT false,        -- Toggle on/off
  type text,                           -- 'sitewide', 'alpha', 'youth_alpha', 'recovery', 'bible_course'
  link text,                           -- Optional URL for banner
  link_text text,                      -- CTA button text
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz
);

-- Types reference alpha_events for dynamic data (e.g., next Alpha start date)
-- RLS: Service role only
```

**Used By:**
- `app/layout.tsx` fetches active banner on every request
- Admin dashboard to edit banners

---

#### 4. **page_content**
**Purpose:** Key-value store for editable site content

```sql
CREATE TABLE page_content (
  page text NOT NULL,                  -- 'give', 'general', etc.
  key text NOT NULL,                   -- 'account_name', 'service_time'
  value text DEFAULT '',               -- Content value
  updated_at timestamptz DEFAULT now(),
  PRIMARY KEY (page, key)
);

-- Example rows:
-- ('give', 'account_name', 'Destiny Church Tees Valley')
-- ('give', 'sort_code', '08-92-99')
-- ('general', 'service_time', '11am')
-- RLS: Service role only
```

**Used By:**
- `lib/pageContent.ts` to fetch dynamic content
- Admin dashboard to edit giving details, service times, etc.

---

#### 5. **contact_messages**
**Purpose:** Messages from the public contact form

```sql
CREATE TABLE contact_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  email text NOT NULL,
  subject text,                        -- Added later (migration 20260329)
  message text NOT NULL,
  created_at timestamptz DEFAULT now()
);

-- RLS: Public insert (form submission); service role read
```

**Used By:**
- `app/contact/actions.ts` (server action) inserts submissions
- Admin dashboard to view inquiries

---

#### 6. **hire_enquiries**
**Purpose:** Venue hire request submissions

```sql
CREATE TABLE hire_enquiries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  email text NOT NULL,
  phone text NOT NULL,
  date_needed date NOT NULL,
  event_description text NOT NULL,
  approx_guests integer,
  created_at timestamptz DEFAULT now()
);

-- RLS: Public insert; service role read
```

**Used By:**
- `app/hire/actions.ts` (server action) inserts submissions
- Admin dashboard to view inquiries

---

#### 7. **alpha_events**
**Purpose:** Alpha course event scheduling and details

```sql
CREATE TABLE alpha_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  type text NOT NULL,                  -- 'alpha', 'youth_alpha', 'recovery', 'bible_course'
  active boolean DEFAULT true,
  start_date date NOT NULL,
  signup_url text,                     -- External booking link
  format text,                         -- 'in_person', 'online', 'hybrid'
  location text,                       -- 'Destiny Centre', etc.
  meeting_platform text,               -- 'Zoom', 'Teams', etc. (if online)
  frequency text DEFAULT 'weekly',     -- 'weekly', 'fortnightly'
  custom_interval_days integer,        -- Override frequency
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz
);

-- RLS: Public read; service role write
```

**Used By:**
- `app/layout.tsx` fetches to populate site-wide banner
- `/alpha`, `/destiny-recovery` and `/bible-course` pages display their next upcoming event
- Admin (`/admin/alpha`, `/admin/recovery`, `/admin/bible-course`) to manage event dates and URLs

> The `bible_course` type is shared infrastructure for The Bible Course (Bible Society) — it
> reuses this table and the `/api/admin/alpha-events` routes rather than adding new ones.
> Added by migration `20260712_alpha_events_bible_course_type.sql`.

---

#### 7b. **featured_course**
**Purpose:** Singleton setting for which course headlines the What's On "Courses" section.

```sql
CREATE TABLE featured_course (
  id integer PRIMARY KEY DEFAULT 1,        -- always 1 (singleton)
  course_id text NOT NULL DEFAULT 'bible_course'
    CHECK (course_id IN ('bible_course','cap','alpha','recovery')),
  updated_at timestamptz DEFAULT now()
);
-- RLS: enabled, deny-all ("service only"); server routes use the service key.
```

The four courses are defined in `lib/courses.ts` (each with a grid-card and a full-width
"featured" config). The featured course renders as the wide banner; the other three render as
cards, so all four are always visible. Chosen at `/admin/featured-course`.

**Used By:**
- `app/whats-on/page.tsx` reads it and passes `featuredId` to `CoursesSection`
- `app/api/admin/featured-course` (GET/PUT) — PUT revalidates `/whats-on`
- Migration `20260712_02_featured_course.sql`

---

#### 8. **site_popup**
**Purpose:** Modal pop-ups that appear once per session/visitor

```sql
CREATE TABLE site_popup (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  active boolean DEFAULT false,
  title text,
  body text,                           -- Supports markdown/HTML
  cta_text text,                       -- Button label
  cta_link text,                       -- Button URL
  image_url text,                      -- Popup image
  show_once boolean DEFAULT true,      -- Show only once per browser session
  updated_at timestamptz DEFAULT now()
);

-- RLS: Service role only
```

**Used By:**
- `app/layout.tsx` fetches active pop-up
- Displayed by `SitePopup.tsx` component
- Admin dashboard to manage pop-ups

---

#### 10. **hr_staff**
**Purpose:** Employee/volunteer directory

```sql
CREATE TABLE hr_staff (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  first_name text NOT NULL,
  last_name text NOT NULL,
  email text,
  phone text,
  job_title text,
  department text,
  employment_type text NOT NULL DEFAULT 'full_time'
    CHECK (employment_type IN ('full_time','part_time','volunteer','contractor')),
  status text NOT NULL DEFAULT 'active'
    CHECK (status IN ('active','on_leave','left')),
  start_date date,
  end_date date,
  annual_leave_entitlement numeric DEFAULT 0,
  notes text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Trigger: hr_staff_updated_at auto-updates `updated_at` on every change
-- RLS: Service role only (accessed via proxy requiring auth)
```

**Used By:**
- HR admin to manage staff directory
- `/admin/hr` dashboard

---

#### 11. **hr_leave_requests**
**Purpose:** Time-off and leave requests

```sql
CREATE TABLE hr_leave_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  staff_id uuid NOT NULL REFERENCES hr_staff(id) ON DELETE CASCADE,
  type text NOT NULL DEFAULT 'holiday'
    CHECK (type IN ('holiday','sick','other')),
  start_date date NOT NULL,
  end_date date NOT NULL,
  days numeric DEFAULT 0,              -- Calculated number of working days
  reason text,
  status text NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending','approved','rejected')),
  reviewed_by text,                    -- Name of approver
  reviewed_at timestamptz,
  created_at timestamptz DEFAULT now()
);

-- RLS: Service role only
-- Indexes: staff_id, status
```

**Used By:**
- HR staff to request/approve leave
- Admin dashboard for leave tracking

---

#### 12. **hr_documents**
**Purpose:** HR document library (contracts, policies, payslips)

```sql
CREATE TABLE hr_documents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  staff_id uuid REFERENCES hr_staff(id) ON DELETE CASCADE,  -- NULL = org-wide
  title text NOT NULL,
  category text NOT NULL DEFAULT 'other'
    CHECK (category IN ('contract','policy','payslip','other')),
  file_path text NOT NULL,             -- Supabase Storage path
  file_name text NOT NULL,
  mime_type text,
  size_bytes bigint,
  uploaded_by text,
  created_at timestamptz DEFAULT now()
);

-- RLS: Service role only
-- Indexes: staff_id
-- Files stored in 'hr-documents' private bucket (signed URLs only)
```

**Used By:**
- Admin to upload and organize HR documents
- Staff to download their documents via signed URLs

---

#### 13. **hr_reviews**
**Purpose:** Appraisals and 1-to-1 meeting records

```sql
CREATE TABLE hr_reviews (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  staff_id uuid NOT NULL REFERENCES hr_staff(id) ON DELETE CASCADE,
  review_date date NOT NULL,
  type text NOT NULL DEFAULT 'one_to_one'
    CHECK (type IN ('appraisal','one_to_one')),
  reviewer text,                       -- Name of reviewer
  summary text,                        -- Notes/outcomes
  next_review_date date,               -- Scheduled follow-up
  created_at timestamptz DEFAULT now()
);

-- RLS: Service role only
-- Indexes: staff_id
```

**Used By:**
- Admin to log reviews
- HR dashboard to track review schedule

---

#### 14. **jobs**
**Purpose:** Job listings and applications

```sql
CREATE TABLE jobs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,                 -- Job title
  slug text UNIQUE NOT NULL,           -- URL slug
  description text NOT NULL,           -- Full job description (markdown)
  department text,                     -- 'Worship', 'Admin', etc.
  employment_type text,                -- 'full_time', 'part_time'
  salary_range text,                   -- Free text (e.g., "£25,000-£30,000")
  closing_date date,                   -- Application deadline
  active boolean DEFAULT true,         -- Hide expired jobs
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- RLS: Public read (active only); service role write
-- Indexes: slug, active
```

**Used By:**
- `/jobs` page to list open positions
- `/jobs/[slug]` for job detail pages
- Admin to create/edit job postings

---

#### 15. **job_applications**
**Purpose:** Submitted job applications

```sql
CREATE TABLE job_applications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id uuid NOT NULL REFERENCES jobs(id) ON DELETE CASCADE,
  name text NOT NULL,
  email text NOT NULL,
  phone text NOT NULL,
  cv_url text,                         -- Uploaded CV (signed URL)
  cover_letter text,                   -- Freeform text
  status text DEFAULT 'pending'
    CHECK (status IN ('pending','reviewing','rejected','offered')),
  created_at timestamptz DEFAULT now()
);

-- RLS: Public insert (application form); service role read
-- Indexes: job_id, status
```

**Used By:**
- Job application form (`app/jobs/ApplyForm.tsx`)
- Admin dashboard to review applications

---

#### 16. **service_status**
**Purpose:** Feature flags for experimental/beta features

```sql
CREATE TABLE service_status (
  service_name text PRIMARY KEY,       -- 'smart_search', etc.
  enabled boolean DEFAULT false,
  updated_at timestamptz DEFAULT now()
);

-- RLS: Public read; service role write
```

**Used By:**
- `lib/serviceStatus.ts` to check if features are active
- Admin to toggle features on/off without deploying

---

#### 17. **staff_logins**
**Purpose:** Audit trail of admin/staff logins

```sql
CREATE TABLE staff_logins (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid,                        -- Supabase Auth user ID
  email text NOT NULL,
  ip_address text,
  user_agent text,
  login_time timestamptz DEFAULT now()
);

-- RLS: Service role only
-- Used for security auditing and unusual activity detection
```

**Used By:**
- Login endpoints to log authentication events
- Security monitoring

---

### Row-Level Security (RLS) Strategy

#### 18. **products / product_variants / orders / order_items** (Shop)
**Purpose:** The Stripe-powered store (`/shop`), replacing the old WooCommerce site. Physical apparel with size + colour variants and per-variant stock; collection-only fulfilment. Prices are integer **pennies** (GBP). Migration: `supabase/migrations/20260708_shop.sql`.

```sql
CREATE TABLE products (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug text UNIQUE NOT NULL,
  name text NOT NULL,
  description text,
  base_price_pennies integer NOT NULL DEFAULT 0,
  category text,
  images jsonb NOT NULL DEFAULT '[]',   -- [{ url, path, alt }]
  is_published boolean NOT NULL DEFAULT false,
  is_featured boolean NOT NULL DEFAULT false,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE TABLE product_variants (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id uuid REFERENCES products(id) ON DELETE CASCADE,
  size text, color text, color_hex text, sku text,
  price_pennies integer,                -- null → inherit product base price
  stock integer NOT NULL DEFAULT 0,
  is_active boolean NOT NULL DEFAULT true,
  sort_order integer NOT NULL DEFAULT 0,
  UNIQUE (product_id, size, color)
);

CREATE TABLE orders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_number text UNIQUE NOT NULL,    -- human-friendly, e.g. DT-7F3K9Q2X
  stripe_payment_intent_id text UNIQUE,
  customer_name text NOT NULL, customer_email text NOT NULL, customer_phone text,
  notes text,
  status text NOT NULL DEFAULT 'pending',  -- pending|paid|fulfilled|cancelled|refunded
  fulfillment_method text NOT NULL DEFAULT 'collection',
  subtotal_pennies integer, total_pennies integer, currency text DEFAULT 'gbp',
  paid_at timestamptz, created_at timestamptz DEFAULT now(), updated_at timestamptz DEFAULT now()
);

CREATE TABLE order_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid REFERENCES orders(id) ON DELETE CASCADE,
  product_id uuid, variant_id uuid,     -- snapshot fields survive product deletion
  product_name text NOT NULL, size text, color text,
  unit_price_pennies integer NOT NULL, quantity integer NOT NULL DEFAULT 1
);
-- RLS: single "service only" policy on all four (like jobs). Public storefront
-- reads via lib/shop.server.ts; checkout/webhook write via the service role.
-- Storage: public `product-images` bucket for product photos (WebP).
```

**Used By:** `/shop` storefront, `/admin/store` CRUD, `POST /api/store/checkout`, `POST /api/webhooks/stripe`.

---

#### 19. **shop_hero_slides** (Shop hero)
**Purpose:** Dynamic, admin-editable hero at the top of `/shop`. Multiple active slides auto-rotate (crossfade) on the storefront; with no active slides the shop shows its static "The Destiny Store" masthead. Migration: `supabase/migrations/20260710_shop_hero.sql`.

```sql
CREATE TABLE shop_hero_slides (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  active boolean NOT NULL DEFAULT true,
  heading text, subheading text,
  cta_text text, cta_link text,
  image_url text, image_path text,      -- storage path in shop-hero-images bucket
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz DEFAULT now(), updated_at timestamptz DEFAULT now()
);
-- RLS: single "service only" policy (like the shop tables). Public storefront
-- reads active slides via lib/shop.server.ts → getActiveShopHeroSlides().
-- Storage: public `shop-hero-images` bucket for hero backgrounds (WebP).
```

**Used By:** `/shop` storefront (`components/shop/ShopHero.tsx`), `/admin/store/hero` CRUD.

---

All tables have RLS enabled. Access rules:

| Table | Public Read | Authenticated Read | Service Role | Purpose |
|-------|-------------|-------------------|--------------|---------|
| redirects | Yes | - | Yes | Public navigation |
| site_banner | Yes | - | Yes | Show on every page |
| page_content | - | - | Yes | Protect sensitive values |
| contact_messages | - | - | Yes | Protect submissions |
| hire_enquiries | - | - | Yes | Protect submissions |
| alpha_events | Yes | - | Yes | Public event dates |
| featured_course | - | - | Yes | Featured course setting (read via server component) |
| site_popup | - | - | Yes | Protect pop-up content |
| hr_* (staff, leave, reviews, docs) | - | - | Yes | Sensitive HR data |
| jobs | Yes | - | Yes | Public listings |
| job_applications | - | - | Yes | Protect applications |
| service_status | Yes | - | Yes | Feature flags |
| staff_logins | - | - | Yes | Audit trail |
| products / product_variants | - | - | Yes | Shop catalogue (public read via server components) |
| orders / order_items | - | - | Yes | Store orders (written by Stripe webhook) |
| shop_hero_slides | - | - | Yes | Editable /shop hero (public read via server components) |

**Key Point:** No table uses authenticated user RLS. All member-facing features use API proxy routes that enforce authentication in application code, then access the database with the service role key. This gives finer control and better error messages.

---

## Core Application Layers

### Layer 1: Root Layout (`app/layout.tsx`)

The root layout wraps every page in the application. It:

1. **Defines metadata & SEO** — Title templates, description, Open Graph images for social share
2. **Fetches server data** — Banner, pop-up, feature flags (called on every request)
3. **Renders custom SVG filter** — A sophisticated glass refraction effect used for visual polish
4. **Wraps in providers** — Context providers for auth, theme, analytics
5. **Loads fonts** — Roboto, Anton, Playfair Display from Google Fonts
6. **Sets up structure** — Header, main content area, footer

**Key Code:**

```typescript
// Fetch active banner (shown at top of site)
async function getActiveBanner() {
  const supabase = createServiceClient();
  const { data: rows } = await supabase
    .from("site_banner")
    .select("active, message, type, link, link_text")
    .eq("active", true);
  
  // If multiple banners, prioritize sitewide > event banners
  const sitewide = banners.find((b) => b.type === "sitewide");
  if (sitewide) return sitewide;
  
  // Otherwise return first active event banner (Alpha, Youth Alpha, Recovery)
  // ...
}

// Fetch active pop-up (modal overlay)
async function getActivePopup() {
  const supabase = createServiceClient();
  const { data } = await supabase
    .from("site_popup")
    .select("active, title, body, cta_text, cta_link, image_url, show_once")
    .eq("active", true)
    .limit(1)
    .maybeSingle();  // Returns null if no results
  return data ?? null;
}

// Render root HTML
export default async function RootLayout({ children }) {
  const banner = await getActiveBanner();
  const popup = await getActivePopup();
  const smartSearchEnabled = await isSmartSearchEnabled();
  
  return (
    <html>
      <body className="...">
        <svg aria-hidden>
          {/* Glass refraction filter (SVG filters for visual effects) */}
        </svg>
        
        <Providers banner={banner}>
          <CookieBanner />
          <div className="flex flex-col">
            <ChurchHeader />
            <main>{children}</main>
            <ChurchFooter />
          </div>
          <AnalyticsGate />        {/* Conditionally load Vercel Analytics */}
          <SitePopup popup={popup} />
          {smartSearchEnabled && <FloatingSmartSearch />}  {/* AI chat widget */}
        </Providers>
        
        <SpeedInsights />             {/* Vercel performance monitoring */}
        <VisualEditOverlay />         {/* Admin visual editor (on admins only) */}
      </body>
    </html>
  );
}
```

**SVG Glass Refraction Filter Explanation:**

The `<filter id="glass-refract">` is a sophisticated visual effect:

1. **feGaussianBlur** — Blur the alpha channel to create a soft edge ramp
2. **feOffset** — Offset the blurred version left/right and up/down to detect edges
3. **feComposite** — Subtract offsets to create signed X/Y displacement vectors
4. **feDisplacementMap** — Apply the displacement at three scales (42/48/54) to separate color channels slightly
5. **feBlend** — Recombine RGB channels; the offset makes colors separate at edges (chromatic dispersion)

**Result:** Elements with `.glass-refract` backdrop-filter get a thick glass effect with color separation at edges.

---

### Layer 2: Providers (`components/Providers.tsx`)

Wraps children with React context providers:

- **Supabase Client Provider** — Browser auth token management
- **Theme Provider** — Dark/light mode
- **Query Client** (if using) — API caching
- **Toast Provider** (`components/ToastProvider.tsx`) — Passive notifications via `useToast()` (`success`/`error`/`info`)
- **Dialog Provider** (`components/DialogProvider.tsx`) — Styled, promise-based modal dialogs via `useDialog()`

#### Dialogs & notifications — no native browser dialogs

Native `alert()`, `confirm()`, and `window.prompt()` are **banned** in this codebase — they
look untrustworthy, can't be styled, and freeze the tab. Use the in-app equivalents instead:

- **Passive message** → `useToast()` from `components/ToastProvider.tsx`:
  `toast.error("…")`, `toast.success("…")`, `toast.info("…")`.
- **Yes/No decision** → `useDialog().confirm(opts)` → `Promise<boolean>`. Renders a centered,
  blocking styled modal. Options: `{ title?, message, confirmLabel?, cancelLabel?, tone? }`
  where `tone: "danger"` gives a red confirm button for destructive actions.
  Pattern: `if (!(await confirm({ message: "Delete this?", tone: "danger", confirmLabel: "Delete" }))) return;`
  (the enclosing handler must be `async`).
- **Free-text input** → `useDialog().prompt(opts)` → `Promise<string | null>` (`null` = cancelled,
  matching native `prompt`). Options: `{ title?, message?, placeholder?, defaultValue?, confirmLabel? }`.

Both dialog helpers reuse the visual conventions from `components/admin/hr/HrUI.tsx`
(backdrop + rounded card + shared button/input classes). Escape and backdrop-click cancel.

---

### Layer 3: Header & Navigation (`components/ChurchHeader.tsx`)

Rendered on every page (server component with Suspense).

- **Logo** — Clickable link to home
- **Navigation menu** — Links to all main pages
- **Mobile menu** — Hamburger on small screens
- **Search bar** — Filters sermons/content (client-side with fuse.js)
- **Auth indicator** — Login/logout buttons

---

### Layer 4: Main Content (Route-Specific Components)

Each page route (`app/*/page.tsx`) renders page-specific content. Examples:

#### `/app/sermons/page.tsx` — Sermon Archive
- Fetches YouTube videos via `lib/youtube.ts`
- Filters by series/speaker/date using client-side state
- Displays video grid with thumbnails and metadata
- Lazy-loads videos on scroll

#### `/app/[slug]/page.tsx` — Dynamic Catchall
- Looks up `slug` in `dynamic_pages` table (if exists)
- Renders content with `next/image` for optimization
- Falls back to 404 if not found

---

### Layer 5: Footer (`components/ChurchFooter.tsx`)

Displayed on every page:

- **Contact info** — Address, phone, email
- **Social links** — YouTube, Facebook, Instagram
- **Quick links** — Common pages
- **Copyright** — Auto-updates year
- **Accessibility statement**

---

## Routing & Pages

### Public Pages (No Auth Required)

| Route | File | Purpose |
|-------|------|---------|
| `/` | `app/page.tsx` | Home page — hero, featured sermon, CTAs |
| `/about` | `app/about/page.tsx` | About church, team, vision, mission |
| `/beliefs` | `app/beliefs/page.tsx` | Statement of faith, doctrine |
| `/sermons` | `app/sermons/page.tsx` | Archive of all sermon videos, searchable |
| `/sermons/[id]` | `app/sermons/[id]/page.tsx` | Individual sermon detail, video embed, transcript |
| `/live` | `app/live/page.tsx` | Livestream page — custom glass player when live, offline state otherwise |
| `/contact` | `app/contact/page.tsx` | Contact form, address, hours |
| `/give` | `app/give/page.tsx` | Giving info — bank details, online giving |
| `/shop` | `app/shop/page.tsx` | Store front — published products grid (editorial `/links` style) |
| `/shop/[slug]` | `app/shop/[slug]/page.tsx` | Product detail — gallery, size/colour variant picker, add to basket |
| `/shop/cart` | `app/shop/cart/page.tsx` | Basket (client, zustand + localStorage) |
| `/shop/checkout` | `app/shop/checkout/page.tsx` | Contact details + embedded Stripe Payment Element |
| `/shop/checkout/success` | `app/shop/checkout/success/page.tsx` | Order confirmation; clears the basket |
| Also served at `shop.destinytees.uk/*` | `next.config.ts` `rewrites()` | Legacy subdomain host-rewrites to `/shop/*` |
| `/visit` | `app/visit/page.tsx` | First-time visitor guide, parking, service times |
| `/new-here` | `app/new-here/page.tsx` | Onboarding for new members |
| `/hire` | `app/hire/page.tsx` | Venue hire enquiry form |
| `/serve` | `app/serve/page.tsx` | Volunteer opportunities |
| `/connect` | `app/connect/page.tsx` | Connect groups (small groups) |
| `/kids` | `app/kids/page.tsx` | Kids ministry (ages 0-11) |
| `/youth` | `app/youth/page.tsx` | Youth ministry (ages 11-18) |
| `/young-adults` | `app/young-adults/page.tsx` | Young adults (18-30s) |
| `/missions` | `app/missions/page.tsx` | Mission partners, outreach |
| `/alpha` | `app/alpha/page.tsx` | Alpha course info, next event |
| `/bible-course` | `app/bible-course/page.tsx` | The Bible Course (Bible Society), next event |
| `/whats-on` | `app/whats-on/page.tsx` | Events listing (ChurchSuite embed) |
| `/connect-card` | `app/connect-card/page.tsx` | Prayer requests, connection form |
| `/jobs` | `app/jobs/page.tsx` | Job listings |
| `/jobs/[slug]` | `app/jobs/[slug]/page.tsx` | Job detail page |
| `/[slug]` | `app/[slug]/page.tsx` | Dynamic catchall (custom pages) |

### Admin Pages (Auth Required, Checked in `middleware.ts`)

All admin/staff features live under a single `/admin` prefix with one login at `/login` (no per-section roles — any authenticated staff account has full access). `/admin/hr` is built but intentionally unlinked from any nav (not yet launched).

| Route | File | Purpose |
|-------|------|---------|
| `/login` | `app/login/page.tsx` | Staff sign-in |
| `/admin/forgot-password` | `app/admin/forgot-password/page.tsx` | Password reset request |
| `/admin` | `app/admin/page.tsx` | Admin dashboard home |
| `/admin/banner` | `app/admin/banner/page.tsx` | Manage site banners |
| `/admin/popup` | `app/admin/popup/page.tsx` | Manage pop-ups |
| `/admin/redirects` | `app/admin/redirects/page.tsx` | Manage URL redirects |
| `/admin/cache` | `app/admin/cache/page.tsx` | Invalidate ISR cache |
| `/admin/posts` | `app/admin/posts/page.tsx` | Standalone content pages |
| `/admin/training` | `app/admin/training/page.tsx` | Training categories → subgroups → posts |
| `/admin/hr` | `app/admin/hr/page.tsx` | HR dashboard (staff, leave, jobs, documents, reviews) — unlinked, in progress |
| `/admin/store` | `app/admin/store/page.tsx` | Store — product list |
| `/admin/store/products/new` | `app/admin/store/products/new/page.tsx` | Create a product (name → editor) |
| `/admin/store/products/[id]` | `app/admin/store/products/[id]/page.tsx` | Product editor — details, photos, size/colour variants, stock |
| `/admin/store/hero` | `app/admin/store/hero/page.tsx` | Shop hero slides — add/edit/reorder rotating hero |
| `/admin/store/orders` | `app/admin/store/orders/page.tsx` | Orders list |
| `/admin/store/orders/[id]` | `app/admin/store/orders/[id]/page.tsx` | Order detail — mark fulfilled/cancelled/refunded |

---

## Components

### Global Components

#### `ChurchHeader.tsx`
- **What:** Site navigation header
- **Props:** None (uses client context for mobile menu state)
- **Behavior:**
  - Desktop: Horizontal menu bar with search
  - Mobile: Hamburger menu (drawer slides from left)
  - Active route highlighting
  - Search filters sermons by title/speaker (client-side fuse.js)

#### `ChurchFooter.tsx`
- **What:** Sitewide footer
- **Displays:** Contact info, quick links, social, copyright
- **Dynamic content:** Address and hours from `page_content` table

#### `CookieBanner.tsx`
- **What:** GDPR cookie consent banner
- **Behavior:**
  - Shows once per session
  - User can accept all / essential only
  - Preference stored in localStorage
  - Disables analytics if rejected

#### `AnalyticsGate.tsx`
- **What:** Conditional analytics loading
- **Logic:** Only loads Vercel Analytics if cookie consent given
- **Files:** `_document.js` or inline script tag

#### `SiteBanner.tsx`
- **What:** Top-of-page announcement banner
- **Data:** `site_banner` table (fetched in root layout)
- **Features:**
  - Multiple banner types (sitewide, alpha events, recovery)
  - Optional CTA link
  - Can be dismissed by user (session storage)

#### `SitePopup.tsx`
- **What:** Modal pop-up overlay
- **Data:** `site_popup` table
- **Features:**
  - Shows once per session (if `show_once=true`)
  - Title, body (markdown), image, CTA button
  - Dismiss button
  - Centered on screen

#### `shop/ShopHero.tsx`
- **What:** Dynamic, auto-rotating hero at the top of `/shop`
- **Data:** `shop_hero_slides` table (via `getActiveShopHeroSlides()`; passed in as a prop from the server component)
- **Features:**
  - Image-backed slides (next/image `fill`) with dark gradient + Anton headline + orange CTA pill
  - Auto-rotates (~6s crossfade) with 2+ slides; static with one
  - Pauses on hover/focus; honours `prefers-reduced-motion` (no auto-advance)
  - Keyboard-navigable dot indicators
  - Falls back to the static "The Destiny Store" masthead when no slides are active (handled in `app/shop/page.tsx`)

#### `FloatingSmartSearch.tsx`
- **What:** AI-powered search widget (floating button)
- **Feature:** If `smart_search` service is enabled
- **Behavior:**
  - Click button → chat modal opens
  - User types query → sent to `/api/public/smart-search` (OpenAI)
  - Response includes answer + optional page link + CTA
  - Chat history stored in component state (not persisted)

#### `VisualEditOverlay.tsx`
- **What:** Admin visual editing mode
- **Feature:** Only visible if user is admin + admin mode enabled
- **Behavior:**
  - Highlights editable sections on every page
  - Click section → edit modal opens
  - Changes persisted to database immediately
  - Used for non-technical admins to edit page copy

#### `GlassBloomTracker.tsx`
- **What:** Performance tracking script
- **Purpose:** Tracks bloom/glass effect performance for optimization

#### `LiveBanner.tsx`
- **What:** "WE ARE LIVE" banner bar, styled like `SiteBanner.tsx`'s bars
- **Data:** `LiveContext` (server-seeded in root layout via `getLiveStatus()`, then polled client-side every 60s)
- **Behavior:** Renders at the top banner slot (offsetting any DB banner below it) whenever the channel is live; hidden on `/live` and `/admin/*`. CTA links to `/live`.

#### `live/LiveExperience.tsx` + `live/LivePlayer.tsx`
- **What:** The `/live` page's client UI
- **`LiveExperience.tsx`:** Switches between live / offline / stream-ended states based on `LiveContext`; requires the ENDED player event or two consecutive negative polls before dropping out of the live view
- **`LivePlayer.tsx`:** YouTube IFrame API player with `controls=0` and a fully custom glass control bar (play/pause, mute, volume, fullscreen, live-edge seek) — see `lib/youtubeIframe.ts` for the shared API loader (also used by `SermonPlayer.tsx`)

---

### Page-Specific Components

#### Kids Ministry (`components/kids/*`)
- `KidsHero.tsx` — Hero banner for kids section
- `KidsAges.tsx` — Age groupings (babies, toddlers, kids)
- `KidsProgram.tsx` — Sunday program overview
- `KidsContact.tsx` — Parent contact form

#### Youth Ministry (`components/youth/*`)
- Similar structure to kids

#### Admin Components (`components/admin/*`)
- `AdminSidebar.tsx` — Admin navigation menu
- `AdminHeader.tsx` — Sticky desktop header for the admin shell; shows an "Admin / {section}" breadcrumb (title derived from the pathname) and a "View live site" button
- `MediaUploader.tsx` — File upload widget (drag-drop, progress)
- `AdminSermonManager.tsx` — Hide/show sermons, edit metadata
- `PageEditor.tsx` — WYSIWYG editor for page content (TipTap)
- `RedirectManager.tsx` — CRUD redirects UI
- `BannerManager.tsx` — Create/edit site banners

#### Admin Content/Training/HR Components (`components/admin/{posts,training,hr}/*`)
- `HrUI.tsx` — Staff directory, leave requests, documents
- `TrainingUI.tsx` — Course browser, access control
- `JobsList.tsx` — Job listings (member view)
- `ApplicationModal.tsx` — Submit job application

#### Connect Card (`components/connect-card/*`)
- `ConnectCardForm.tsx` — Prayer request + connection form
- `ConnectCardCTAs.tsx` — Call-to-action buttons
- `ConnectCardSuccess.tsx` — Confirmation screen

#### Home Page (`components/home/*`)
- `HeroSection.tsx` — Main hero banner with video/image
- `MinistriesGrid.tsx` — Ministry cards (kids, youth, etc.)
- `UpcomingSermons.tsx` — Latest sermons carousel
- `CTAButtons.tsx` — Prominent call-to-action buttons

#### Shop (`components/shop/*`)
- `ProductCard.tsx` — storefront product tile (editorial `.shop-card` hover wipe)
- `ProductGallery.tsx` — main image + thumbnail strip (client)
- `ProductBuyPanel.tsx` — colour swatches + size pills + quantity + add-to-basket (client)
- `CartButton.tsx` — header basket icon with live item-count badge (client)
- `CheckoutForm.tsx` — Stripe Express Checkout Element (Apple Pay / Google Pay / Link, shown only when a wallet is available) above the Payment Element card form; both confirm the same PaymentIntent (client)

> **Apple Pay:** enabled automatically by `automatic_payment_methods` — no extra API params. The only prerequisite is a **registered payment-method domain**; Stripe hosts the Apple domain-association file, so there is no `/.well-known` file to deploy. Register the live domain(s) once via Stripe Dashboard → Settings → Payment methods → Apple Pay, or run `scripts/register-apple-pay-domain.mjs` with the live `STRIPE_SECRET_KEY` (e.g. `destinytees.uk` and `www.destinytees.uk`). Apple Pay renders on supported devices/browsers only (Safari on Apple hardware).

---

## API Routes & Server Actions

### Server Actions vs. API Routes

**Server Actions** (`app/*/actions.ts`):
- Call from client components directly
- Typed, type-safe
- Auto-serialize arguments & return values
- Good for: Form submission, data mutation
- Example: `app/contact/actions.ts`

**API Routes** (`app/api/*/route.ts`):
- HTTP endpoints
- Called from fetch() or external integrations
- Good for: Webhooks, public APIs, external tools
- Example: `/api/public/smart-search`

---

### Key Server Actions

#### `app/contact/actions.ts`
```typescript
"use server";

export async function submitContactForm(data: ContactFormData) {
  // Validate input
  const parsed = contactFormSchema.parse(data);
  
  // Rate limit: max 5 submissions per IP per hour
  const remaining = await rateLimit(request.ip, "contact-form", 5, 3600);
  if (remaining <= 0) throw new Error("Too many submissions. Try again later.");
  
  // Insert into database
  const supabase = createServiceClient();
  await supabase.from("contact_messages").insert({
    name: parsed.name,
    email: parsed.email,
    subject: parsed.subject,
    message: parsed.message
  });
  
  // Send notification email to admin
  await sendEmail({
    to: "hello@destinytees.uk",
    subject: `New contact form: ${parsed.subject}`,
    html: renderEmailTemplate("contactNotification", parsed)
  });
  
  return { success: true };
}
```

#### `app/hire/actions.ts`
Similar structure to contact form:
- Validate form data
- Rate limit
- Insert to `hire_enquiries` table
- Send email notification

#### `app/connect-card/actions.ts`
- Submit prayer request
- Submit connection card (first-time visitor form)
- Inserts to `contact_messages` with category prefix
- Sends email to prayer team

#### `app/jobs/actions.ts`
```typescript
export async function applyForJob(jobId: string, formData: ApplicationData) {
  // Validate
  const parsed = applicationSchema.parse(formData);
  
  // Upload CV to storage
  const file = parsed.cv;
  const { path } = await uploadToStorage(file, `job-cvs/${jobId}`);
  
  // Insert application
  await supabase.from("job_applications").insert({
    job_id: jobId,
    name: parsed.name,
    email: parsed.email,
    phone: parsed.phone,
    cv_url: path,
    cover_letter: parsed.coverLetter
  });
  
  // Send confirmation email to applicant
  await sendEmail({
    to: parsed.email,
    subject: "We've received your application",
    html: renderEmailTemplate("applicationReceived", { jobTitle })
  });
  
  return { success: true };
}
```

---

### Admin API Routes

#### `POST /api/admin/redirects`
```typescript
// Create or update redirect
// Body: { slug, targetUrl, label, active }
// Logic:
// 1. Check auth
// 2. Insert/update redirects table
// 3. Trigger full rebuild (redirects are in next.config.ts)
// 4. Return success or error
```

#### `POST /api/admin/popup/upload`
```typescript
// Upload image for pop-up
// FormData: { file: File }
// Logic:
// 1. Check auth
// 2. Upload to storage bucket
// 3. Return public URL or signed URL
// 4. Admin uses URL in pop-up form
```

#### `POST /api/admin/cache/revalidate`
```typescript
// Manually trigger ISR for a path
// Body: { path: string }
// Logic:
// 1. Check auth
// 2. Call revalidatePath(path) or revalidateTag(tag)
// 3. Return success
```

---

### Public API Routes

#### `GET /api/public/smart-search`
```typescript
// AI-powered search
// Query: { query: string }
// Response: { answer, page, ctaLabel, options? }

// Logic:
// 1. Rate limit: 5 requests per IP per minute
// 2. Validate query length (min 3 chars)
// 3. Create OpenAI chat completion:
//    - System prompt: Instructions from lib/siteKnowledge.ts
//    - User message: The visitor's query
//    - Model: gpt-4-turbo or similar
// 4. Parse response:
//    - Extract prose answer
//    - Extract PAGE: and CTA: tags
//    - Validate page against allowlist
//    - Return structured response
// 5. Log search for analytics
```

#### `GET /api/public/youtube-sync`
```typescript
// Sync latest YouTube videos to cache/database
// Called periodically by GitHub Actions workflow

// Logic:
// 1. Fetch latest videos from YouTube API
// 2. Extract metadata: title, description, thumbnail, published_date
// 3. Store in local cache or database
// 4. Filter out hidden videos
// 5. Return video list
```

#### `GET /api/youtube/live`
```typescript
// Livestream status, polled client-side every 60s by LiveContext
// Response: { live: boolean, videoId: string | null, title?: string, checkedAt: string }
// revalidate = 60

// Backed by lib/youtube.ts getLiveStatus() — see Libraries & Utilities.
```

#### `POST /api/webhooks/vercel`
```typescript
// Triggered on Vercel deployment
// Body: { deployment }

// Logic:
// 1. Validate webhook secret
// 2. Log deployment event (analytics)
// 3. Optionally trigger post-deploy checks (E2E tests, etc.)
```

#### Shop API

```typescript
// PUBLIC (outside the middleware matcher)
POST /api/store/checkout
//   Body: { items: [{ variantId, quantity }], customer: { name, email, phone?, notes? } }
//   Recomputes every price + stock from the DB (client prices never trusted),
//   creates a pending order + items, creates a Stripe PaymentIntent, returns
//   { clientSecret, orderNumber }. Rate-limited per IP.

POST /api/webhooks/stripe
//   Stripe signature-verified (STRIPE_WEBHOOK_SECRET), runtime = nodejs, raw body.
//   payment_intent.succeeded → order 'paid', decrement variant stock, Resend
//   confirmation emails (customer + church). Idempotent. payment_failed → 'cancelled'.

POST /api/store/checkout/bypass
//   TEST ONLY. 404 unless server env SHOP_TEST_BYPASS=1. Creates a real order and
//   finalises it WITHOUT Stripe (paid, stock decremented, emails) so the full flow
//   can be demoed without a payment. The checkout page shows a "Complete test order"
//   button when NEXT_PUBLIC_SHOP_TEST_BYPASS=1. Never set either flag in production.

// Shared order logic (pricing recompute, order creation, paid-finalisation) lives
// in lib/checkout.server.ts and is used by checkout, the webhook, and the bypass.

// ADMIN (gated by middleware, site_editor role)
GET|POST            /api/admin/store/products
GET|PUT|DELETE      /api/admin/store/products/[id]        // PUT reconciles variants
POST|DELETE         /api/admin/store/products/[id]/images // sharp → WebP → product-images bucket
GET                 /api/admin/store/orders
GET|PATCH           /api/admin/store/orders/[id]          // PATCH updates fulfilment status
GET|POST            /api/admin/shop-hero                  // list / create hero slides
PATCH|DELETE        /api/admin/shop-hero/[id]             // update (content/active/sort_order) / delete
POST                /api/admin/shop-hero/upload           // sharp → WebP → shop-hero-images bucket
```

---

## Libraries & Utilities

### Shop (`lib/shop*.ts`, `lib/stripe.ts`, `lib/cart-store.ts`)
- `lib/shop.ts` — client-safe types (`Product`, `ProductVariant`, `Order`, `CartItem`), `formatPrice(pennies)`, `variantPrice`, `fromPrice`, `totalStock`. Prices are integer pennies (GBP).
- `lib/shop.server.ts` (`server-only`) — public read fetchers: `getPublishedProducts()`, `getProductBySlug()`, `getAllProductsAdmin()` (via `getSupabaseAdmin()`).
- `lib/stripe.ts` (`server-only`) — `getStripe()` singleton from `STRIPE_SECRET_KEY`.
- `lib/cart-store.ts` — `useCart` zustand store persisted to `localStorage` (`destiny-cart`), plus `cartCount` / `cartSubtotal` helpers.

---

### `lib/youtube.ts`

```typescript
// Wrapper around YouTube Data API v3
export async function getAllVideos(maxResults = 50): Promise<YTVideo[]> {
  const youtube = google.youtube({
    version: "v3",
    auth: process.env.YOUTUBE_API_KEY
  });
  
  // Search for videos in our channel
  const { data } = await youtube.search.list({
    part: "snippet",
    channelId: process.env.YOUTUBE_CHANNEL_ID,
    maxResults,
    order: "date",     // Newest first
    type: "video"
  });
  
  // Transform to YTVideo type with metadata
  return data.items.map((item) => ({
    id: item.id.videoId,
    title: item.snippet.title,
    description: item.snippet.description,
    thumbnail: item.snippet.thumbnails.high.url,
    publishedAt: item.snippet.publishedAt,
    // ... extract speaker, series from description/title
  }));
}

export async function getLatestVideo(): Promise<YTVideo | null> {
  const videos = await getAllVideos(1);
  return videos[0] ?? null;
}

// Livestream detection — used by the /live page and the "WE ARE LIVE" banner.
// Zero-quota by design: scrapes youtube.com/channel/{id}/live for the
// canonical watch URL + "isLiveNow" flag, falling back to a 1-unit
// videos.list confirm call only when the scrape is ambiguous (never uses
// search?eventType=live, which costs 100 units/call). Fails closed — any
// fetch/parse error or LIVE_DISABLED=1 returns { live: false }.
export async function getLiveStatus(): Promise<LiveStatus> { /* ... */ }
```

**Why Supabase Storage isn't used for videos:**
- YouTube handles CDN/caching automatically
- Bandwidth costs for video are lower on YouTube
- YouTube playlist/channel management features
- Comments, engagement metrics built-in

---

### `lib/smartSearch.ts`

Parses the LLM response and validates navigation:

```typescript
export interface SmartSearchResult {
  answer: string;              // Main prose answer
  page: string | null;         // Valid page URL (or null)
  ctaLabel: string | null;     // Button text
  options?: string[];          // For clarifying questions
}

export function parseAnswer(raw: string): SmartSearchResult {
  // Extract OPTION: lines (clarifying question choices)
  const options = Array.from(
    raw.matchAll(/^\s*(?:[-*•]\s*)?OPTION:\s*(.+?)\s*$/gim)
  )
    .map((m) => m[1])
    .slice(0, 4);  // Max 4 options
  
  // Strip OPTION/PAGE/CTA lines from prose
  const prose = raw
    .replace(/^\s*OPTION:\s*.+$/gim, "")
    .replace(/^\s*PAGE:\s*\S+/gim, "")
    .replace(/^\s*CTA:\s*.+$/gim, "")
    .trim();
  
  // If options present, this is a clarifying question
  if (options.length >= 2) {
    return { answer: prose, page: null, ctaLabel: null, options };
  }
  
  // Extract PAGE and CTA from end of response
  const pageMatch = raw.match(/^\s*PAGE:\s*(\S+)\s*$/im);
  const ctaMatch = raw.match(/^\s*CTA:\s*(.+?)\s*$/im);
  
  let page: string | null = null;
  if (pageMatch) {
    const candidate = pageMatch[1].replace(/[.,)"']+$/, "");
    // Validate against allowlist (prevents hallucinated links)
    if (ALLOWED_PAGES.has(candidate)) page = candidate;
  }
  
  let ctaLabel: string | null = null;
  if (page && ctaMatch) {
    ctaLabel = ctaMatch[1].trim();
  }
  
  return { answer: prose, page, ctaLabel };
}

export const FALLBACK_ANSWERS = {
  tooShort: "Ask me anything about Destiny...",
  unavailable: "I can't reach the assistant right now...",
  empty: "I'm not totally sure on that one..."
};

export function cooldownAnswer(): SmartSearchResult {
  // User hit rate limit
  return {
    answer: "You've made a lot of searches in a short time...",
    page: "/contact",
    ctaLabel: "Contact Us"
  };
}
```

**Key Security:**

1. **Allowlist validation** — Page URLs must be in `PAGE_INTENTS`; any hallucinated links are dropped
2. **Rate limiting** — Max 5 searches per IP per minute
3. **Fallback answers** — If service unavailable, still show a friendly response (never "error")

---

### `lib/siteKnowledge.ts`

Single source of truth for the AI assistant:

```typescript
export const PAGE_INTENTS = [
  { href: "/give", cta: "Give Now", intent: "giving, donations, bank details..." },
  { href: "/visit", cta: "Plan Your Visit", intent: "visiting, first time..." },
  { href: "/sermons", cta: "Watch Sermons", intent: "sermons, messages..." },
  { href: "/live", cta: "Watch Live", intent: "livestream, live service, Sundays at 11am" },
  { href: "/shop", cta: "Browse Merch", intent: "shop, apparel, merch, buy" },
  { href: "/help", cta: "Help Centre", intent: "help, FAQ, questions" },
  // ... 17 more pages (kids, youth, Alpha, serve, connect, missions, etc.)
];

export const ALLOWED_PAGES = new Set(PAGE_INTENTS.map(p => p.href));

// System prompt sent to OpenAI (truncated here):
const SEARCH_INSTRUCTIONS = `
You are a friendly assistant for Destiny Church Tees Valley.

HOW TO REPLY:
- Write 2–5 conversational sentences
- Never restart the question or use full church name
- Append PAGE: and CTA: tags ONLY if relevant:
  PAGE: /the-path
  CTA: Short Action Label

GROUNDING (MOST IMPORTANT):
- Only state facts in the KNOWLEDGE section below
- Do NOT guess, invent, or assign roles unless listed
- If you don't know, warmly say so and point to /contact

CLARIFYING QUESTIONS:
- If a request is ambiguous, ask ONE short question with 2–4 OPTION: choices
- Do NOT ask follow-ups for simple factual questions

KNOWLEDGE:
... (church-specific facts: pastor names, service times, livestream, shop, mission, etc.) ...
`;
```

**Why this pattern?**

1. **Prevents hallucination** — Model is grounded in actual church knowledge
2. **Limits links** — Only allows pages we've defined
3. **Consistent tone** — Friendly, warm, not corporate
4. **Scalable** — Easy to update facts without retraining

---

### `lib/pageContent.ts`

Fetch dynamic content from the `page_content` table:

```typescript
export async function getPageContent(page: string, key: string): Promise<string> {
  const supabase = createServiceClient();
  const { data } = await supabase
    .from("page_content")
    .select("value")
    .eq("page", page)
    .eq("key", key)
    .maybeSingle();
  return data?.value ?? "";
}

// Used by:
export async function getGivingDetails() {
  return Promise.all([
    getPageContent("give", "account_name"),
    getPageContent("give", "sort_code"),
    getPageContent("give", "account_number"),
    getPageContent("give", "text_keyword"),
    getPageContent("give", "text_number")
  ]);
}

export async function getServiceInfo() {
  return Promise.all([
    getPageContent("general", "service_day"),
    getPageContent("general", "service_time"),
    getPageContent("general", "service_address")
  ]);
}
```

**Why key-value store?**

1. **Editable by non-technical users** — No code changes needed
2. **Centralized** — All dynamic content in one table
3. **Cacheable** — Rarely changes; can be cached aggressively
4. **Typed access** — TypeScript ensures correct key names

---

### `lib/roles.ts`

Check user roles and permissions:

```typescript
export async function isAdmin(userId: string): Promise<boolean> {
  const supabase = createServiceClient();
  const { data } = await supabase
    .from("admin_users")
    .select("role")
    .eq("id", userId)
    .maybeSingle();
  return data?.role === "admin";
}

export async function canAccessHR(userId: string): Promise<boolean> {
  const supabase = createServiceClient();
  const { data } = await supabase
    .from("staff_roles")
    .select("can_access_hr")
    .eq("user_id", userId)
    .maybeSingle();
  return data?.can_access_hr ?? false;
}

// Used in:
// app/admin/layout.tsx — wraps with auth check
// app/admin/hr/page.tsx — HR dashboard
```

---

### `lib/rateLimit.ts`

Prevent abuse:

```typescript
export async function rateLimit(
  identifier: string,        // IP address or user ID
  action: string,            // 'contact-form', 'search', 'login'
  maxRequests: number,
  windowSeconds: number      // e.g., 3600 for 1 hour
): Promise<number> {
  const supabase = createServiceClient();
  const now = new Date();
  const windowStart = new Date(now.getTime() - windowSeconds * 1000);
  
  // Count requests in time window
  const { count } = await supabase
    .from("rate_limit_log")
    .select("*", { count: "exact" })
    .eq("identifier", identifier)
    .eq("action", action)
    .gte("created_at", windowStart.toISOString());
  
  const remaining = maxRequests - (count ?? 0);
  
  if (remaining > 0) {
    // Log this request
    await supabase.from("rate_limit_log").insert({
      identifier,
      action,
      created_at: now.toISOString()
    });
  }
  
  return remaining;
}

// Used by:
// Form submissions (contact, hire, apply for job)
// API endpoints (smart search, YouTube sync)
// Login attempts
```

---

### `lib/training.ts`

Training course management:

```typescript
export interface TrainingCategory {
  id: string;
  name: string;
  description: string;
  icon: string;
  order: number;
}

export interface TrainingModule {
  id: string;
  categoryId: string;
  title: string;
  description: string;
  content: string;  // Markdown or HTML
  duration: number; // Minutes
  videoUrl?: string;
  completed: boolean;
}

export async function getTrainingCategories(): Promise<TrainingCategory[]> {
  const supabase = createServiceClient();
  const { data } = await supabase
    .from("training_categories")
    .select("*")
    .order("order");
  return data ?? [];
}

export async function getUserCourseProgress(userId: string) {
  // Fetch completed modules for this user
  // Used to show progress bars and completion badges
}
```

---

### `lib/jobs.ts` & `lib/hr.ts`

Similar patterns for job listings and HR management.

---

## Authentication & Authorization

### Supabase Auth Flow

1. **User signs up/in:**
   - Email + password sent to Supabase
   - Returns JWT token
   - Token stored in secure HTTP-only cookie (via `@supabase/ssr`)

2. **On every request:**
   - Next.js middleware checks for valid token
   - If valid, attached to request context
   - If expired, refresh token is used automatically

3. **On protected routes:**
   - Server component checks if user exists
   - Redirects to login if not authenticated

4. **Server actions & API:**
   - Get user ID from token
   - Query database with service role (not user role)
   - Apply RLS policies based on table settings

### Authorization Layers

#### Layer 1: Route-Level (Layout)
```typescript
// app/admin/layout.tsx
export default async function AdminLayout({ children }) {
  const { user } = await getUser();
  if (!user) {
    redirect("/admin/login");
  }
  
  const isAdmin = await isAdmin(user.id);
  if (!isAdmin) {
    return <ErrorPage message="Access denied" />;
  }
  
  return <AdminSidebar>{children}</AdminSidebar>;
}
```

#### Layer 2: API Route (Proxy)
```typescript
// app/api/admin/redirects/route.ts
export async function POST(request: NextRequest) {
  const user = request.nextUrl.searchParams.get("userId");
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  
  const isAdmin = await isAdmin(user);
  if (!isAdmin) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  
  // Proceed with operation using service role
  // (database RLS doesn't apply to service role, so this is explicit auth)
}
```

#### Layer 3: Database (RLS)
```sql
-- Example: Only service role can read HR staff
CREATE POLICY "service only" ON hr_staff USING (false);
```

**Why multiple layers?**
- **Defense in depth** — Even if one layer fails, others catch issues
- **Clear error messages** — Can tell user if they're not logged in vs. not authorized
- **Audit trail** — API logs show who attempted what
- **Performance** — Early rejection saves database calls

---

### Session Management

- **Session storage:** Secure HTTP-only cookie (managed by `@supabase/ssr`)
- **Token refresh:** Automatic when expired (hooks in Providers.tsx)
- **Logout:** Clear cookie, redirect to home
- **CSRF protection:** Next.js built-in (automatic for POST requests)

---

## Configuration

### `next.config.ts`

```typescript
const nextConfig: NextConfig = {
  // Include ffmpeg binary for serverless functions (if needed)
  outputFileTracingIncludes: {
    "*": ["node_modules/ffmpeg-static/ffmpeg"],
  },
  
  // Permanent redirects (handled at edge)
  async redirects() {
    return [
      { source: "/prayer-request", destination: "/connect-card", permanent: true },
      { source: "/prayer-requests", destination: "/connect-card", permanent: true }
    ];
  },
  
  // Security headers
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          {
            key: "Permissions-Policy",
            value: "camera=(), microphone=(), geolocation=()"  // Disable dangerous features
          }
        ]
      },
      // Long-lived cache for static assets (immutable = only update if filename changes)
      {
        source: "/img/:path*",
        headers: [
          { key: "Cache-Control", value: "public, max-age=31536000, immutable" }
        ]
      }
    ];
  },
  
  // Image optimization
  images: {
    minimumCacheTTL: 2592000, // 30 days
    // Allow images from these domains
    remotePatterns: [
      { protocol: "https", hostname: "i.ytimg.com" },      // YouTube thumbnails
      { protocol: "https", hostname: "storage.buzzsprout.com" },  // Podcast images
      { protocol: "https", hostname: "cdn.churchsuite.com" },     // ChurchSuite events
      { protocol: "https", hostname: "lwmnrbglbtbyypzcenzf.supabase.co" },  // Our Supabase bucket
      // ... more patterns
    ]
  }
};
```

### `tailwind.config.ts`

```typescript
import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx}",
    "./components/**/*.{js,ts,jsx,tsx}"
  ],
  theme: {
    extend: {
      colors: {
        brand: "#FF6B35",      // Church brand color
        accent: "#004E89",
        light: "#F7F7F9"
      },
      fontFamily: {
        display: ["var(--font-anton)"],      // Bold, display headings
        serif: ["var(--font-playfair)"],     // Editorial headings
        sans: ["var(--font-roboto)"]         // Body text
      },
      animation: {
        "fade-in": "fadeIn 0.5s ease-in",
        "slide-up": "slideUp 0.6s ease-out"
      }
    }
  },
  plugins: []
};

export default config;
```

### `tsconfig.json`

- `strict: true` — Strict type checking
- `jsx: "react-jsx"` — React 17+ JSX transform
- `@/*` — Path alias for imports (e.g., `@/components/Button`)

### `.env.local` Template

```env
# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
SUPABASE_SERVICE_ROLE_KEY=eyJ...

# YouTube
YOUTUBE_API_KEY=AIza...
YOUTUBE_CHANNEL_ID=UCxx...

# Email
RESEND_API_KEY=re_...

# OpenAI (for Smart Search)
OPENAI_API_KEY=sk-...

# GitHub (for CI/CD)
GITHUB_TOKEN=ghp_...

# Feature flags
ENABLE_SMART_SEARCH=true
```

---

## Deployment & Performance

### Deployment Target: Vercel

**Why Vercel?**
- **Next.js first-party** — Built by Vercel team
- **Edge functions** — Faster redirects, rate limiting
- **ISR (Incremental Static Regeneration)** — Cache pages, revalidate on-demand
- **CDN** — Automatic global distribution
- **Analytics** — Built-in performance monitoring

### Caching Strategy

| Content | Strategy | TTL | Invalidation |
|---------|----------|-----|--------------|
| Static assets (`/img`, `/fonts`) | Immutable | 1 year | Filename change |
| Home page | ISR | 1 hour | `revalidatePath("/")` |
| Sermon archive | ISR | 4 hours | `revalidatePath("/sermons")` |
| Dynamic pages (`/[slug]`) | ISR | 24 hours | `revalidatePath("/[slug]")` |
| Redirects | Edge | Infinite | Deploy |
| API responses | None | - | Fresh on every request |
| Images | Browser cache | 30 days | `next/image` optimization |

### Performance Optimizations

1. **Image optimization:**
   - `next/image` component auto-resizes
   - WebP format for modern browsers
   - Lazy loading by default

2. **Code splitting:**
   - Dynamic imports for heavy components
   - Suspense boundaries for loading states

3. **Database queries:**
   - No N+1 queries (use `select()` joins)
   - Cache at Supabase level (pg_cache extension)
   - Use materialized views for complex queries

4. **Edge caching:**
   - Long TTLs on assets
   - Geography-aware CDN (UK origin)

5. **Monitoring:**
   - Vercel Analytics — tracks Web Vitals
   - Vercel Speed Insights — performance timeline
   - Custom events logged to analytics

---

## Key Design Decisions & Rationale

### Decision 1: Service Role Key for Backend

**Why:** Instead of client tokens accessing database directly:

- **Security** — Client can't be trusted; always use server role for writes
- **RLS consistency** — Service role bypasses RLS; we apply auth in app code
- **Error messages** — Can give user-friendly feedback (vs. RLS "you don't have permission")
- **Audit logging** — API routes log who did what; database doesn't

### Decision 2: Supabase for Database

**Why:** Not a custom Node/Express API:

- **PostgreSQL power** — JSON, full-text search, PostGIS for geo (future)
- **RLS built-in** — Security at database layer
- **Real-time** — Subscriptions for live updates (not currently used)
- **Managed** — No DevOps overhead

### Decision 3: Server Components Over Client

**Why:** Use React server components wherever possible:

- **SEO** — Content rendered server-side, searchable
- **Security** — Secrets stay on server (not in browser)
- **Performance** — Less JavaScript shipped to client
- **Simplicity** — No useState/useEffect for data fetching

### Decision 4: AI Knowledge Base Over Retrieval

**Why:** Single `siteKnowledge.ts` instead of RAG:

- **Reliability** — Model grounded in actual facts; no hallucination risk
- **Control** — Easy to edit facts without retraining
- **Cost** — Fewer API calls (no embedding search)
- **Speed** — Lower latency (fewer round-trips)

### Decision 5: TipTap for Rich Text

**Why:** Not Slate, Draft.js, or Lexical:

- **Smaller bundle** — ~50KB gzipped (vs. 150KB+)
- **Extensions** — Underline, highlight, image, YouTube, placeholder
- **Prosemirror foundation** — Battle-tested
- **No config** — Works out of box

---

## File Manifest

### Public Pages
- `app/page.tsx` — Home (hero, latest sermon, CTAs)
- `app/sermons/page.tsx` — Sermon archive (grid, filters)
- `app/sermons/[id]/page.tsx` — Sermon detail (video, transcript)
- `app/live/page.tsx` — Livestream (custom glass player / offline state)
- `app/about/page.tsx` — About church
- `app/beliefs/page.tsx` — Statement of faith
- `app/kids/page.tsx` — Kids ministry
- `app/youth/page.tsx` — Youth ministry
- `app/young-adults/page.tsx` — Young adults
- `app/missions/page.tsx` — Missions partners
- `app/serve/page.tsx` — Volunteer opportunities
- `app/connect/page.tsx` — Connect groups
- `app/give/page.tsx` — Giving & donations
- `app/visit/page.tsx` — Plan a visit
- `app/new-here/page.tsx` — First-time visitor guide
- `app/hire/page.tsx` — Venue hire enquiry
- `app/contact/page.tsx` — Contact form
- `app/connect-card/page.tsx` — Prayer requests
- `app/alpha/page.tsx` — Alpha course
- `app/whats-on/page.tsx` — Events (ChurchSuite embed)
- `app/jobs/page.tsx` — Job listings
- `app/jobs/[slug]/page.tsx` — Job detail
- `app/shop/page.tsx` — Store (product grid)
- `app/shop/[slug]/page.tsx` — Product detail (variants, gallery)
- `app/shop/cart/page.tsx` — Shopping cart (Zustand + localStorage)
- `app/shop/checkout/page.tsx` — Stripe Payment Element checkout
- `app/shop/checkout/success/page.tsx` — Order confirmation
- `app/baptism/page.tsx` — Baptism information & registration
- `app/child-dedication/page.tsx` — Child dedication requests
- `app/safeguarding/page.tsx` — Safeguarding & child protection
- `app/help/page.tsx` — Help centre & FAQ
- `app/[slug]/page.tsx` — Dynamic catchall

### Admin Pages
- `app/admin/login/page.tsx` — Admin login
- `app/admin/page.tsx` — Admin home (dashboard)
- `app/admin/banner/page.tsx` — Banner management
- `app/admin/popup/page.tsx` — Pop-up management
- `app/admin/redirects/page.tsx` — Redirect management
- `app/admin/cache/page.tsx` — Cache invalidation
- `app/admin/store/page.tsx` — Store management
- `app/admin/store/products/new/page.tsx` — Create product
- `app/admin/store/products/[id]/page.tsx` — Edit product (variants, stock)
- `app/admin/store/orders/page.tsx` — Orders list
- `app/admin/store/orders/[id]/page.tsx` — Order detail (fulfillment)
- `app/admin/store/hero/page.tsx` — Shop hero slides (add/edit/reorder rotating hero)

### Component Directory
- **109 components** organized by feature:
  - Global: Header, Footer, Providers, CookieBanner, Analytics
  - Admin: Sidebar, MediaUploader, SermonManager, PageEditor
  - Ministry-specific: Kids, Youth, Young Adults
  - Forms: ConnectCard, ContactForm, HireForm
  - Content: Training, Jobs, HR

### Libraries (`lib/`)
- **43 utility files** including:
  - Supabase clients (admin, browser)
  - API wrappers (YouTube, OpenAI, Resend)
  - Domain logic (sermons, jobs, HR, training)
  - Email templates
  - Rate limiting, authentication checks
  - Feature flags, role checks

### API Routes (`app/api/`)
- **Admin endpoints:** Banners, redirects, pop-ups, cache revalidation, store management
- **Public endpoints:** Destiny AI (multi-turn chat), YouTube sync, webhooks
- **Store endpoints:** Stripe payment processing, order management
- **Webhooks:** Vercel deployments, GitHub events

### Database Migrations
- **17 migration files** defining schema for:
  - URL redirects
  - Hidden videos
  - Site content (banners, pop-ups, page_content)
  - Event management (Alpha course)
  - HR management (staff, leave, documents, reviews)
  - Job listings & applications
  - Feature flags
  - Staff login audit

---

## Summary

Destiny Church Tees Valley is a **professional, full-stack Next.js application** that combines:

1. **Public-facing website** — Sermons, ministries, contact, events, livestream
2. **Member engagement** — Prayer requests, volunteering, training, small groups
3. **Admin dashboard** — Content management, HR tools, store management
4. **Ecommerce** — Online store with Stripe payments, product variants, order management
5. **Intelligent features** — Destiny AI assistant, live banner management

**Architecture:** Server-driven React with Supabase PostgreSQL, deployed to Vercel with ISR caching. All sensitive operations use service-role API proxies with explicit auth checks. Code is type-safe (TypeScript), styled with Tailwind CSS, and tested with Playwright E2E.

**Key Differentiators:**
- **No vendor lock-in** — Open-source stack (Next.js, React, Tailwind, PostgreSQL)
- **Security first** — RLS, rate limiting, CSRF protection, signed URLs
- **AI-ready** — Grounded knowledge base, code generation with validation
- **Accessible** — Semantic HTML, ARIA labels, keyboard nav
- **Mobile-first** — Responsive design, tested on real devices
- **Performant** — ISR caching, image optimization, edge functions

This repository serves as a **reusable platform** for churches nationwide, licensed through Square Media Group.

---

**Document Version:** 1.0.0  
**Created:** June 18, 2026  
**For:** Destiny Church Tees Valley  
**By:** Square Media Group (Malachi <malachi@squaremediagroup.org>)
