# 🥤 JidouNavi 自販機ナビ

Discover Japan, one vending machine at a time.

A crowdsourced vending machine discovery app for iOS & Android — like Pokémon Go for vending machines.

## The Problem

Japan has **5+ million vending machines**, but the rare, themed, or bizarre ones are nearly impossible to find intentionally. Tourists discover them through TikTok and Instagram, but location info is buried in comments that are sometimes fake and often outdated.

There's no good way to see what's actually near you right now.

## The Solution

JidouNavi lets users map, share, and explore interesting vending machines nearby — with gamification that turns everyday exploration into an adventure.

## Features

- **Interactive map** with vending machine pins
- **Add machines** — photo, GPS, category tags
- **Category filters** — Food, Drinks, Gachapon, Weird, Retro
- **Check-in system** — collect stamps for visits
- **Badges** — unlock achievements for exploring
- **Verification** — crowdsourced data freshness ("Still there?")

## Tech Stack

| Layer | Technology |
|-------|------------|
| Mobile | React Native + Expo |
| Maps | Mapbox |
| Backend | Supabase (PostgreSQL) |
| State | Zustand |

## Screenshots

<!-- Add when ready -->
🚧 **In Development** — Targeting Q1 2026 beta launch

## Documentation

- [Product Requirements Document](JidouNavi_PRD_v1.pdf)

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

### 2. Install Dependencies
```bash
npm install
```

### 3. Database Setup

Run these SQL files in Supabase SQL Editor (in order):
1. `supabase/schema.sql` — Creates tables and functions
2. `supabase/seed.sql` — Adds test data (Akihabara machines)

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

## Project Structure
```
app/                  # Expo Router screens
  (tabs)/            # Tab navigation
    index.tsx        # Map screen
    profile.tsx      # Profile screen
src/
  lib/               # Supabase client, API functions
  store/             # Zustand stores
supabase/
  schema.sql         # Database schema
  seed.sql           # Test data
```

---

Built by [Leandro T.](https://github.com/LeoCba07) and [Matias Fernandez](https://github.com/matiifernandez)
