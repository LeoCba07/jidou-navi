# 🥤 JidouNavi 自販機ナビ

Discover Japan, one vending machine at a time.
A crowdsourced vending machine discovery app for iOS & Android — the Pokémon Go for vending machines.

## The Problem

Japan has **5+ million vending machines**, but the rare, themed, or bizarre ones are nearly impossible to find intentionally.

Tourists discover them through TikTok and Instagram, but:
- Locations are buried in comments  
- Information is often fake or outdated  
- Machines disappear without warning  

There’s no reliable way to know **what’s actually near you, right now**.  
You end up wandering blindly — or worse, traveling 30 minutes for a machine that no longer exists.

## The Solution

JidouNavi lets users map, share, and explore **real vending machines near them, in real time** — with gamification that turns everyday exploration into an adventure.

## Features

- **Interactive map** with vending machine pins  
- **Category filters** — Food, Drinks, Gachapon, Weird, Retro  
- **Check-in system** — collect stamps for visits  
- **Badges** — unlock achievements for exploring  
- **Add machines** — photo, GPS, category tags  
- **Verification system** — crowdsourced data freshness (“Still there?”)

## Tech Stack

| Layer | Technology |
|-------|------------|
| Mobile | React Native + Expo |
| Maps | Mapbox |
| Backend | Supabase (PostgreSQL) |
| State | Zustand |

## Screenshots
<!-- Add when ready -->
Early landing page + map prototype  

<img width="1455" height="715" alt="JidouNavi Landing Page" src="https://github.com/user-attachments/assets/33ab8568-f40b-4a23-bc74-b9f843238007" />

🚧 **In Development** — Targeting Q1 2026 beta launch
👉 Join the waitlist at **www.jidou-navi.app**

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
