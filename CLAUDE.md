# JidouNavi Project Context

## Overview
JidouNavi (自販機ナビ) is a crowdsourced vending machine discovery app for Japan. "Pokemon Go for vending machines" — users find, document, and share rare/unique vending machines with gamification (badges, check-ins).

## Target Users
- Tourists wanting unique content for social media
- Long-term expats looking for new exploration
- Gachapon hunters
- Japanese locals

## Tech Stack
- **Mobile**: React Native + Expo (TypeScript)
- **Maps**: Mapbox
- **Backend**: Supabase (PostgreSQL, Auth, Storage)
- **State**: Zustand

## MVP Features (In Scope)
- Interactive map with vending machine pins
- Add machine: photo, GPS location, tags, description
- Category filters (Food, Drinks, Gachapon, Weird, Retro)
- User authentication (email + social)
- Basic user profiles with contribution count
- Search by location, category, or keyword
- Machine detail view with photos and info
- "Nearby" discovery based on current location
- Badges and achievement system
- Verification prompt ("Still there?" Yes/No)
- Save/bookmark machines
- "I visited this" check-in/stamp functionality

## Out of Scope (Future)
- Leveling/XP system
- "Weirdest this week" trending section
- Social features (follow users, likes)
- AI-powered scavenger hunts/quests
- AR camera overlay for directions
- Brand partnership integrations

## Data Model

### Users
- id, email, username, avatar_url, contribution_count, created_at

### Machines
- id, latitude, longitude, name, description, category_tags[], contributor_id, verified, visit_count, last_verified_at, created_at

### Machine_Photos
- id, machine_id, photo_url, thumbnail_url, uploaded_by, created_at

### Visits
- id, user_id, machine_id, visited_at, still_exists

### Saved_Machines
- id, user_id, machine_id, saved_at

### Badges
- id, name, description, icon_url, trigger_type, trigger_value

### User_Badges
- id, user_id, badge_id, unlocked_at

## Design Direction
- "Modern functionality with retro-pixel accents"
- Primary color: #FF4B4B (vending machine red)
- Secondary: #3C91E6 (retro screen blue)
- Background: #FDF3E7 (creamy vintage white)
- Typography: Press Start 2P for headers, Inter for body
- Bottom tab navigation: Map, Profile, (+) FAB for adding machines

## Key User Flows
1. **Discover**: Open app → see map → tap pin → view details → get directions
2. **Add Machine**: Tap + → take photo → auto GPS → add tags → submit
3. **Check-in**: At machine → tap "I visited" → badge popup → verify "Still there?"
4. **Earn Badge**: Complete trigger → popup animation → badge on profile

## API Endpoints (Core)
- GET /machines - Get machines in bounding box
- GET /machines/:id - Get machine details
- POST /machines - Create new machine
- POST /machines/:id/photos - Upload photo
- POST /machines/:id/visit - Check in
- GET /users/:id - Get profile
- GET /users/:id/visits - Get visited machines
- POST /users/:id/saved - Bookmark machine
- GET /badges - List all badges

## Critical Risks & Mitigations
- **Cold start**: Seed 30+ machines in ONE area (Akihabara) for density
- **Data staleness**: "Still there?" verification on check-in
- **Tourist churn**: Focus on sharing/virality for acquisition
- **Image uploads**: Compress client-side before upload (max 1200px, <500KB)
