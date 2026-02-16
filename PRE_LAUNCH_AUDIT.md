# Pre-Play Store Launch Audit Checklist

Comprehensive security and quality audit before publishing to the Play Store. Work through sections in priority order (P0 first).

---

## P0 — Critical Security

- [ ] Secrets audit — no hardcoded keys, tokens, or API secrets in code
- [ ] `.gitignore` covers `.env`, keystore files, and credentials
- [ ] RLS policies enabled on all Supabase tables
- [ ] Server-side permission checks on all protected routes
- [ ] Parameterized queries only — no raw SQL interpolation
- [ ] HTTPS only, no cleartext traffic allowed
- [ ] Never expose raw errors to users
- [ ] CORS locked down to allowed origins only
- [ ] Validate redirects against an allowlist
- [ ] API key restrictions (Supabase anon key scope, Google API keys restricted to app SHA-1)

## P1 — Auth & Sessions

- [ ] Session expiration configured
- [ ] Expired session triggers graceful logout
- [ ] Deleted account cannot log in
- [ ] Email verification required before login
- [ ] Rate limit password/username changes
- [ ] Webhook signature verification

## P2 — Rate Limiting & Anti-Abuse

- [ ] Rate limiting on all API routes
- [ ] Machine submission rate limits with cooldown between submissions
- [ ] Vote anti-spam checks
- [ ] IP throttling
- [ ] DDoS protection (Cloudflare free tier or equivalent)

## P3 — Data & Storage

- [ ] Lock down Supabase storage buckets
- [ ] File size upload limits enforced
- [ ] Compress images before upload
- [ ] Limit max image resolution client-side
- [ ] XSS prevention and secure data handling
- [ ] DB constraints: NOT NULL, unique indexes, foreign keys, check constraints (e.g. rating 1–5)
- [ ] Don't trust frontend validation alone — enforce server-side

## P4 — Cost Controls

- [ ] Supabase usage alerts configured
- [ ] Hard limits on storage
- [ ] Rate limit image uploads
- [ ] Cap API costs

## P5 — Dependencies & Build

- [ ] Remove ghost/unused packages
- [ ] Update dependencies to latest stable
- [ ] Check libraries for known security vulnerabilities
- [ ] ProGuard/R8 obfuscation on release APK
- [ ] Remove debug statements and console logs

## P6 — Privacy & Compliance

- [ ] Account deletion implemented and verified (GDPR)
- [ ] Privacy policy page updated with latest data collection info and deletion option
- [ ] Play Store data safety form filled out accurately
- [ ] Offline data cleared on logout/account deletion

## P7 — Android / Play Store Specific

- [ ] Play Store signing & integrity configured
- [ ] No keystore files committed
- [ ] App permissions match actual usage (no unnecessary permissions)
- [ ] Deep link validation (can't be hijacked by other apps)
- [ ] Certificate pinning (optional — skip for v1 unless handling financial data)

## P8 — Observability & Operations

- [ ] Verify Sentry receives test notifications
- [ ] PostHog tracking works
- [ ] Log critical actions (login, deletion, admin actions)
- [ ] Define crash-free rate baseline (target 99%+)
- [ ] Verify email sending with Resend
- [ ] Automate DB backups on Supabase
- [ ] Secret rotation schedule (every 90 days, set up post-launch)
- [ ] Rollback plan documented (what to do if critical bug ships)

## P9 — Moderation

- [ ] Admin dashboard: delete machine, ban user, remove image

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
