# Pre-Launch Audit Checklist

Comprehensive security and quality audit before publishing to the Play Store and App Store. Work through sections in priority order (P0 first).

---

## P0 — Critical Security

- [ ] Secrets audit — no hardcoded keys, tokens, or API secrets in code (grep found nothing, but needs manual review to be sure)
- [x] `.gitignore` covers `.env`, keystore files, and credentials
- [x] RLS policies enabled on all Supabase tables
- [ ] Server-side permission checks on all protected routes (several RPCs verified, but not exhaustively checked for every route)
- [x] Parameterized queries only — no raw SQL interpolation
- [ ] HTTPS only, no cleartext traffic allowed (likely true — Supabase/Mapbox are HTTPS, but not explicitly tested)
- [ ] Never expose raw errors to users (edge function returns `error.message` to client)
- [ ] Validate redirects against an allowlist (deep links have no route allowlist)
- [ ] API key restrictions — Supabase anon key scope, Google API keys restricted to app SHA-1 (env vars used in code, but need to verify restrictions in Supabase/Google Cloud dashboards)

### P0.5 — Data Scraping Protection

Machine data is a hand-curated competitive asset. Currently anyone with the anon key can dump the entire dataset via the REST API or RPC functions.

- [ ] Require authentication for machine table reads (change SELECT policy from public to `auth.role() = 'authenticated'`)
- [ ] Require authentication for `machines_with_details` view (currently granted to anon via `029_deep_linking_permissions.sql`)
- [ ] Rate-limit `machines_in_bounds`, `nearby_machines`, and `search_machines` RPC functions (e.g. 30 calls / 10 min)
- [ ] Enforce hard server-side cap on `limit_count` params (currently user-controlled up to 200)
- [ ] Require authentication for profile reads (currently `USING (true)` — all usernames/avatars public)

## P1 — Auth & Sessions

- [ ] Session expiration configured (currently relies on Supabase 1hr default — no custom config)
- [ ] Expired session triggers graceful logout (auth listener exists, but actual expired token flow not tested)
- [ ] Deleted account cannot log in (deletion RPC deletes auth.users record, but full flow not tested)
- [ ] Email verification required before login (signup allows login without confirmation)
- [x] Rate limit password/username changes (display name has 14-day cooldown)
- ~~[ ] Webhook signature verification~~ N/A — no webhooks in use

## P2 — Rate Limiting & Anti-Abuse

- [x] Rate limiting on write API routes (`check_rate_limit()` on visits, reports, photo removal)
- [ ] Machine submission rate limits with cooldown between submissions (admin approval exists but no per-user cooldown)
- [x] Vote anti-spam checks (max 3 daily upvotes enforced server-side)
- [ ] IP throttling
- [ ] DDoS protection (Cloudflare free tier or equivalent)

## P3 — Data & Storage

- [x] Lock down Supabase storage buckets (RLS on buckets, ownership-based delete)
- [x] File size upload limits enforced (5MB limit)
- [ ] Compress images before upload (camera quality=0.5, but library picker uses quality=1)
- [ ] Limit max image resolution client-side (no dimension limits enforced)
- [x] XSS prevention and secure data handling (React Native — no HTML injection surface)
- [x] DB constraints: NOT NULL, unique indexes, foreign keys, check constraints
- [x] Don't trust frontend validation alone — enforce server-side (distance, coordinate bounds, name format)

## P4 — Cost Controls

- [ ] Supabase usage alerts configured (needs dashboard config)
- [ ] Hard limits on storage
- [ ] Rate limit image uploads (max 2 photos per submission, but no frequency limit)
- [ ] Cap API costs

## P5 — Dependencies & Build

- [x] Remove ghost/unused packages (all packages actively used)
- [ ] Update dependencies to latest stable (reasonably current but no audit automation)
- [ ] Check libraries for known security vulnerabilities (no npm audit/snyk in CI)
- [ ] ProGuard/R8 obfuscation on release APK (EAS-managed — needs verification)
- [ ] Remove debug statements and console logs (92 console statements in `/src`, some guarded by `__DEV__`)

## P6 — Privacy & Compliance

- [x] Account deletion implemented and verified (GDPR) — full UI + RPC + cascade deletes
- [x] Privacy policy page updated with latest data collection info and deletion option
- [ ] Offline data cleared on logout/account deletion (some Zustand stores cleared, but not verified for every store)

## P7 — Store Submission & Build

### Android (Play Store)

- [ ] Play App Signing configured in Google Play Console
- [ ] Upload signing key from EAS to Play Console (or let Google manage it)
- [x] No keystore files committed (properly gitignored)
- [x] App permissions match actual usage (only location, camera, storage — all needed)
- [ ] Deep link validation (scheme configured, no route validation against allowlist)
- [ ] Certificate pinning (optional — skip for v1 unless handling financial data)
- [ ] `eas submit` config added for Android (currently no `submit` block in `eas.json`)
- [ ] Verify R8/ProGuard minification enabled in EAS production build
- [ ] Play Store listing: screenshots, feature graphic, short & long descriptions
- [ ] Localize store listing for target regions (English + Spanish)
- [ ] Play Store content rating questionnaire completed
- [ ] Play Store data safety form filled out accurately
- [ ] Target API level meets Play Store minimum requirement
- [ ] Run closed beta track first (beta users can't leave public reviews — protects your rating while you catch real-device bugs)
- [ ] Review Google Play Pre-Launch Report (automated testing on real devices — catches crashes, ANRs, and accessibility issues you won't see in dev)
- [ ] Plan staged rollout for GA release — Google lets you release to a percentage of users instead of everyone at once. Start at 10-20%, monitor crashes for a few days, then gradually increase to 50% → 100%. If a bug only appears on certain devices, only a small fraction of users are affected and you can fix it before the rest ever see it. Going 100% on day one risks a flood of 1-star reviews you can't undo.

### iOS (App Store)

- [ ] Apple Developer Program membership active
- [ ] App Store Connect app record created
- [ ] `eas submit` config added for iOS
- [ ] Provisioning profile and signing configured via EAS
- [ ] App Store listing: screenshots (6.7", 6.5", 5.5"), preview video (optional), descriptions
- [ ] App Store privacy nutrition labels filled out
- [ ] App Review guidelines compliance check (location usage, user-generated content, account deletion)
- [ ] NSLocationWhenInUseUsageDescription is descriptive enough for review (currently set in app.json)
- [ ] Export compliance (encryption questionnaire — Supabase uses HTTPS/TLS)
- [ ] Age rating questionnaire completed

### Both Platforms

- [ ] Bump `version` and `versionCode`/`buildNumber` before each release
- [ ] Test production build locally before submitting (`eas build --profile production`)
- [ ] Verify all env vars are set in EAS secrets (not just local `.env`)

## P8 — Observability & Operations

- [x] Verify Sentry receives test notifications (full error tracking, global handlers, ErrorBoundary)
- [ ] PostHog tracking works (not integrated)
- [ ] Log critical actions — login, deletion, admin actions (analytics to Supabase exists, but gaps in auth/admin event logging)
- [ ] Define crash-free rate baseline (target 99%+) — needs Sentry dashboard setup
- [ ] Verify email sending with Resend (currently uses Supabase Auth only)
- [ ] Automate DB backups on Supabase (manual script exists at `scripts/backup-db.ts`, no CI automation)
- [ ] Secret rotation schedule (every 90 days, set up post-launch)
- [ ] Rollback plan documented (what to do if critical bug ships)

## P9 — Moderation

- [ ] Admin dashboard: delete machine, ban user, remove image (approve/reject machines works, but no user ban or image deletion UI)

## P10 — Testing (final pass before launch)

- [ ] Test on slow 3G connection
- [ ] Test on low-end Android device
- [ ] Test account deletion flow
- [ ] Test password reset flow
- [ ] Test email verification flow
- [ ] Test image upload failure handling
- [ ] Test no-network state
- [ ] Database load test (50 concurrent machine submissions, image uploads)
- [ ] Penetration testing (try to break the app yourself)
