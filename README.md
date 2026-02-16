# JidouNavi 自販機ナビ

Discover Japan, one vending machine at a time.
A crowdsourced vending machine discovery app for iOS & Android — the Pokemon Go for vending machines.

## The Problem

Japan has **5+ million vending machines**, but the rare, themed, or bizarre ones are nearly impossible to find intentionally.

Tourists discover them through TikTok and Instagram, but:
- Locations are buried in comments
- Information is often fake or outdated
- Machines disappear without warning

There's no reliable way to know **what's actually near you, right now**.
You end up wandering blindly — or worse, traveling 30 minutes for a machine that no longer exists.

## The Solution

JidouNavi lets users map, share, and explore **real vending machines near them, in real time** — with gamification that turns everyday exploration into an adventure.

## Features

- **Interactive map** with vending machine pins (Mapbox)
- **Category filters** — Eats, Gachapon, Weird, Retro, Local Gems
- **Check-in system** — visit machines within 100m to collect stamps
- **Badges & XP** — unlock achievements for exploring, contributing, and verifying
- **Add machines** — photo with EXIF validation, GPS, category tags, admin approval workflow
- **Verification system** — crowdsourced data freshness ("Still there?" reports)
- **Upvotes** — highlight the best machines (max 3 daily, anti-spam enforced)
- **Friends system** — connect with other explorers
- **Admin dashboard** — approve/reject submissions, flag duplicates, review reports
- **Push notifications** — machine approvals, friend requests, badges earned
- **Referral system** — invite friends with referral codes
- **i18n** — English and Spanish
- **Leaderboard** — weekly rankings by visits and contributions

## Tech Stack

| Layer | Technology |
|-------|------------|
| Mobile | React Native 0.81 + Expo SDK 54 + Expo Router |
| Maps | Mapbox (`@rnmapbox/maps`) |
| Backend | Supabase (PostgreSQL + PostGIS, Auth, Storage, Edge Functions, RLS) |
| State | Zustand |
| i18n | i18next + react-i18next |
| Error tracking | Sentry |
| Build | EAS Build + EAS Submit |

## Screenshots
<!-- Add when ready -->

<img width="1455" height="715" alt="JidouNavi Landing Page" src="https://github.com/user-attachments/assets/33ab8568-f40b-4a23-bc74-b9f843238007" />

Join the waitlist at **www.jidou-navi.app**

## Documentation

- [Product Requirements Document](JidouNavi_PRD_v1.pdf)
- [Pre-Launch Audit Checklist](PRE_LAUNCH_AUDIT.md)
- [Testing Checklist](TESTING_CHECKLIST.md)

---

## Getting Started

### 1. Environment Setup
```bash
cp .env.example .env
```

Fill in:
- `EXPO_PUBLIC_SUPABASE_URL` — Supabase project URL
- `EXPO_PUBLIC_SUPABASE_ANON_KEY` — Supabase anon key
- `EXPO_PUBLIC_MAPBOX_TOKEN` — Mapbox public token (pk.xxx)
- `RNMAPBOX_MAPS_DOWNLOAD_TOKEN` — Mapbox secret token (sk.xxx)
- `EXPO_PUBLIC_SENTRY_DSN` — Sentry DSN

### 2. Install Dependencies
```bash
npm install
```

### 3. Database Setup

Run these SQL files in Supabase SQL Editor (in order):
1. `supabase/schema.sql` — creates tables, RLS policies, RPC functions, triggers, and seed data
2. `supabase/storage.sql` — storage bucket policies
3. `supabase/migrations/` — run in order (`001_*`, `002_*`, ...) for incremental changes

Optional:
- `supabase/seed.sql` — adds test data (Akihabara machines)
- `npm run seed` — seed via script

### 4. Running the App

**Note:** Mapbox requires native code. Expo Go won't work — you need a development build.

**Android (EAS Build):**
```bash
eas build --profile development --platform android
# Install APK, then:
npm start -- --tunnel
```

**iOS (Mac only):**
```bash
npx expo run:ios
```

### 5. Other Commands

```bash
npm run backup    # Backup database to backups/*.sql
npm run seed      # Seed machines from script
```

## Project Structure
```
app/                      # Expo Router screens & layouts
  (auth)/                 # Auth screens (login, signup)
  (tabs)/                 # Tab navigation (map, profile)
  admin/                  # Admin dashboard
  machine/                # Machine detail screens
  profile/                # Profile screens
  legal/                  # Privacy policy, terms
  invite/                 # Referral flow
src/
  components/             # Reusable UI components
  hooks/                  # Custom React hooks
  lib/                    # Business logic, API clients, utilities
  store/                  # Zustand stores
  theme/                  # Design system constants
  locales/                # i18n translation files (en, es)
supabase/
  schema.sql              # Full DB schema, RLS, RPCs, triggers
  migrations/             # Incremental DB migrations
  storage.sql             # Storage bucket policies
  functions/              # Supabase Edge Functions
  seed.sql                # Test data
scripts/                  # Seed and backup scripts
```

## License

All rights reserved. This source code and its associated data are proprietary. No permission is granted to use, copy, modify, or distribute this software without explicit written consent from the authors.

---

Built by [Leandro T.](https://github.com/LeoCba07) and [Matias Fernandez](https://github.com/matiifernandez)
