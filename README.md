# JidouNavi 自販機ナビ

Discover Japan, one vending machine at a time.

A crowdsourced vending machine discovery app for iOS & Android.

## Tech Stack

- **Mobile**: React Native + Expo
- **Maps**: Mapbox
- **Backend**: Supabase (PostgreSQL)
- **State**: Zustand

## Getting Started

### 1. Environment Setup

```bash
cp .env.example .env
```

Fill in the values:
- `EXPO_PUBLIC_SUPABASE_URL` - Supabase project URL
- `EXPO_PUBLIC_SUPABASE_ANON_KEY` - Supabase anon key
- `EXPO_PUBLIC_MAPBOX_TOKEN` - Mapbox public token (pk.xxx)
- `RNMAPBOX_MAPS_DOWNLOAD_TOKEN` - Mapbox secret token (sk.xxx)

### 2. Install Dependencies

```bash
npm install
```

### 3. Database Setup

Run these SQL files in Supabase SQL Editor (in order):
1. `supabase/schema.sql` - Creates tables and functions
2. `supabase/seed.sql` - Adds test data (Akihabara machines)

### 4. Running the App

**Note:** This app uses Mapbox which requires native code. Expo Go won't work - you need a development build.

#### Android (EAS Build)
```bash
eas build --profile development --platform android
```
Install the APK on your device, then:
```bash
npm start -- --tunnel
```

#### iOS (Mac only)
```bash
npx expo run:ios
```

## Scripts

| Command | Description |
|---------|-------------|
| `npm start` | Start Metro bundler |
| `npm start -- --tunnel` | Start with tunnel (for WSL/remote) |
| `eas build --profile development --platform android` | Build Android dev APK |
| `npx expo run:ios` | Build and run on iOS Simulator |

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
