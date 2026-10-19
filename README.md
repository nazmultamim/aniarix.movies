# AniArix – HD Anime Streaming & Tracking Platform

AniArix is a modern, high-performance web application for streaming and tracking anime. Built on **Next.js 15 (App Router)** and **React 19**, AniArix provides an intuitive interface for discovering trending, seasonal, and top-rated anime series, streaming high-definition episodes, and managing personal watchlists with seamless cross-platform synchronization via **AniList** and **Jikan api (MAL)**.

---

## 🌟 Key Features

### 🎬 Streaming & Player Experience
- **Multi-Server Playback**: Built-in streaming embed generation supporting multiple streaming providers:
  - **MegaPlay**: Primary server with fallback stream construction supporting both AniList and MAL IDs.
  - **Vidnest Anime**: Dedicated high-quality AniList-based stream embed server.
  - **Vidnest AnimePahe**: Alternative stream server option optimized for smooth playback.
- **Sub & Dub Support**: Easy toggle between English subtitled (`sub`) and English dubbed (`dub`) streams.
- **Episode Navigation & Auto-Play Next**: Quick episode selector, next/previous buttons, and progress-aware playback.

### 📊 Anime Discovery & Metadata
- **AniList GraphQL Integration**: Real-time fetching of comprehensive media metadata, cover art, banners, trailers, character details, studio information, tags, and relations.
- **Advanced Search & Filtering**: Filter anime by title search, genres, format (TV, Movie, OVA, Special, ONA, Music), status (Releasing, Finished, Not Yet Released), season, release year, minimum score, and sorting criteria.
- **Dynamic Trending & Seasonal Highlights**: Dedicated pages for trending anime, current seasonal releases, and top-rated shows.

### 👤 User Dashboard & Tracking
- **Watch History & Progress Tracking**: Automatically records per-episode playback progress, current timestamp, total duration, and completion status.
- **Continue Watching**: Instant access to resume watching from where you left off across all devices.
- **AniList Sync**: Bi-directional sync with AniList user accounts to pull and update watching, planning, completed, on-hold, and dropped lists.
- **Custom Profile Management**: Customizable username, avatar picker, and personal list management.

### 🛡️ Administrative Suite (`/admin`)
- **Dashboard & Analytics**: Overview stats for total registered users, watch logs, catalog entries, and system activity.
- **Catalog Management**: View and audit cached anime metadata entries stored in the database.
- **User Management**: View user profiles, update roles (`user` / `admin`), and inspect user activity.
- **Security & Site Controls**: Manage site settings, security configurations, anti-inspect guards, and inspect system audit logs.

### ⚡ Technical & Security Features
- **Redis Caching**: Server-side response caching using **Upstash Redis** to minimize external API rate limits and deliver ultra-fast responses.
- **Supabase Authentication & Row-Level Security (RLS)**: Secure authentication flow using Supabase Auth, protected routes, and data-level security.
- **Bot Protection & Security**: Cloudflare **Turnstile** integration on auth forms and built-in Anti-Inspect guard options.
- **PWA (Progressive Web App)**: Service worker registration for progressive web application capabilities.
- **Contact & Feedback**: Direct messaging via **EmailJS** integration.

---

## 🏗️ Architecture & Tech Stack

### Core Frameworks & Libraries
- **Framework**: [Next.js 15](https://nextjs.org/) (App Router)
- **UI Library**: [React 19](https://react.dev/)
- **Styling**: [Tailwind CSS v4](https://tailwindcss.com/)
- **Animations & Graphics**: [Framer Motion](https://framer.com/motion), [Three.js](https://threejs.org/)
- **Icons**: [Lucide React](https://lucide.dev/), [React Icons](https://react-icons.github.io/react-icons/)
- **Data Visualization**: [Recharts](https://recharts.org/) (Admin analytics)

### Backend & Database Services
- **Database**: [Supabase](https://supabase.com/) (PostgreSQL 17)
  - `profiles`: User profiles linked 1:1 with `auth.users`, role management (`user`, `admin`).
  - `watch_history`: Per-user episode playback position and progress state.
  - `anilist_sync_cache`: Cached raw user data synced from AniList.
  - `anime_catalog`: Global cached catalog of anime metadata.
- **Caching**: [Upstash Redis](https://upstash.com/) for fast server-side caching of GraphQL queries and page results.
- **External Data Source**: AniList GraphQL API (`https://graphql.anilist.co`).

---

## 📁 Project Structure

```
├── public/                    # Static assets, PWA manifest, and icons
├── src/
│   ├── app/                   # Next.js App Router pages and API routes
│   │   ├── (Public)/          # Publicly accessible routes
│   │   │   ├── about/         # About page
│   │   │   ├── anime/         # Anime discovery & media detail ([anilist_id])
│   │   │   ├── contact/       # Contact form page
│   │   │   ├── home/          # Main landing / home dashboard
│   │   │   ├── search/        # Search & advanced filter page
│   │   │   ├── trending/      # Trending anime showcase
│   │   │   ├── user/          # User account dashboard (/user/dash)
│   │   │   └── watch/         # Video player route (/watch/[slug]/ep-[ep])
│   │   ├── admin/             # Admin management control panel
│   │   │   ├── activity/      # System activity logs
│   │   │   ├── catalog/       # Database catalog manager
│   │   │   ├── dash/          # Admin summary dashboard
│   │   │   ├── security/      # Anti-inspect & security settings
│   │   │   ├── settings/      # Site configuration
│   │   │   └── users/         # User administration
│   │   ├── api/               # Server API routes & cron endpoints
│   │   │   └── cron/keepalive # Supabase keepalive cron task
│   │   ├── auth/              # Authentication routes (callback, reset-password)
│   │   ├── layout.js          # Root application layout
│   │   ├── page.jsx           # Root landing redirect page
│   │   └── globals.css        # Global Tailwind CSS styles
│   ├── components/            # Reusable UI components
│   │   ├── admin/             # Admin-specific tables, cards, and navigation
│   │   ├── auth/              # Auth modals, turnstile widgets, reset forms
│   │   ├── layout/            # Player, cards, headers, sliders, hero banners
│   │   ├── pwa/               # Service worker register component
│   │   ├── security/          # Anti-inspect guard overlay
│   │   ├── ui/                # Navbars, footers, search inputs, pagination, modals
│   │   └── user/              # User tabs (my list, history, settings, avatar modal)
│   ├── graphql/               # AniList GraphQL client and query definitions
│   ├── lib/                   # Utility functions, Supabase clients, site configs
│   │   ├── action/            # Server actions (watch history, profiles, search)
│   │   ├── context/           # Auth Context Provider
│   │   ├── redis/             # Upstash Redis connection client
│   │   └── supabase/          # Supabase server, client, admin, and middleware scripts
│   ├── services/              # Business logic & external service abstractions
│   │   ├── anime/             # Anime normalizers, identity resolver, cache service
│   │   ├── anilist.service.js # Core AniList GraphQL API service
│   │   ├── Cache.service.js   # Redis/In-memory cache wrapper
│   │   ├── Megaplay.service.js# MegaPlay embed builder
│   │   ├── Vidnest.service.js # Vidnest embed builder
│   │   ├── servers.config.js  # Server list configuration & embed resolver
│   │   └── watchHistory.client.js # Watch history sync engine
│   └── proxy.js               # Proxy helper
├── supabase.md                # Detailed database schema and security documentation
└── vercel.json                # Vercel deployment configuration
```

---

## ⚙️ Environment Variables

To run AniArix locally or deploy to production, create a `.env.local` file in the root directory with the following environment variables:

```env
# Supabase Configuration
NEXT_PUBLIC_SUPABASE_URL=https://your-supabase-project.supabase.co
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=your-supabase-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-supabase-service-role-key

# Upstash Redis (Caching)
UPSTASH_REDIS_REST_URL=https://your-redis.upstash.io
UPSTASH_REDIS_REST_TOKEN=your-upstash-redis-token

# Security & Bot Protection
NEXT_PUBLIC_TURNSTILE_SITE_KEY=your-cloudflare-turnstile-site-key

# Contact Form (EmailJS)
NEXT_PUBLIC_EMAILJS_SERVICE_ID=your-emailjs-service-id
NEXT_PUBLIC_EMAILJS_TEMPLATE_ID=your-emailjs-template-id
NEXT_PUBLIC_EMAILJS_PUBLIC_KEY=your-emailjs-public-key

# Analytics & Site Metadata (Optional)
NEXT_PUBLIC_GA_ID=your-google-analytics-id
NEXT_PUBLIC_SITE_URL=http://localhost:3000

# Cron Security (Optional)
CRON_SECRET=your-cron-secret-key

# External GraphQL (Defaults to https://graphql.anilist.co if omitted)
ANILIST_GRAPHQL_ENDPOINT=https://graphql.anilist.co
```

---

## 🛠️ Getting Started

### Prerequisites
- **Node.js**: v18.18.0 or higher
- **npm**, **pnpm**, **yarn**, or **bun** package manager

### Installation & Setup

1. **Clone the repository**:
   ```bash
   git clone https://github.com/your-repo/aniarix.git
   cd aniarix
   ```

2. **Install dependencies**:
   ```bash
   npm install
   ```

3. **Configure Environment Variables**:
   Copy `.env.example` (or create `.env.local`) and add your credentials as described in the [Environment Variables](#️-environment-variables) section.

4. **Run the Development Server**:
   ```bash
   npm run dev
   ```
   Open [http://localhost:3000](http://localhost:3000) in your browser to view the application.

5. **Build for Production**:
   ```bash
   npm run build
   npm run start
   ```

6. **Linting**:
   ```bash
   npm run lint
   ```

---

## 🔐 Database & Auth Model Overview

The backend uses **Supabase PostgreSQL** configured with automated user triggers and Row-Level Security (RLS):

1. **User Sign Up Flow**: When a user registers, an `AFTER INSERT` database trigger (`on_auth_user_created`) automatically executes `public.handle_new_user()`. This creates a corresponding record in `public.profiles` with a generated unique username and default role `'user'`.
2. **Watch History**: The `public.watch_history` table stores progress per episode (`current_time_seconds`, `duration_seconds`, `completed`, `status`). RLS policies restrict users to accessing and updating only their own watch history records.
3. **AniList Sync Cache**: `public.anilist_sync_cache` stores cached payloads when users link and synchronize their AniList accounts.

For full schema details, triggers, functions, and security policies, refer to [`supabase.md`](./supabase.md).

---


## 📄 License

This project is private and intended for personal use only. All rights are reserved by the author. Unauthorized copying, modification, distribution, or commercial use is strictly prohibited without prior written permission.

