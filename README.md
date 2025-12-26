# JidouNavi 自販機ナビ

Discover Japan, one vending machine at a time.

A crowdsourced vending machine discovery app for iOS & Android.

## Tech Stack

- **Mobile**: React Native + Expo
- **Maps**: Mapbox
- **Backend**: Supabase (PostgreSQL)
- **State**: Zustand

## Getting Started

1. Copy environment variables:
   ```bash
   cp .env.example .env
   ```
   Then fill in the values (get them from the team).

2. Install dependencies:
   ```bash
   npm install
   ```

3. Start Expo dev server:
   ```bash
   npx expo start --tunnel
   ```

4. Scan the QR code with Expo Go (Android) or Camera app (iOS).

## Scripts

- `npx expo start` - Start Expo dev server
- `npx expo start --tunnel` - Start with tunnel (for WSL2)
- `npx expo start --android` - Start on Android emulator
- `npx expo start --ios` - Start on iOS simulator (macOS only)
- `npx expo start --web` - Start web version
