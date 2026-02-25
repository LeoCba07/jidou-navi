/**
 * Client-side auth rate limiter.
 * In-memory only — resets on app restart. Server-side Kong IP throttling
 * provides persistent protection; this layer prevents rapid UI-driven abuse.
 */

type AuthAction = 'login' | 'signup' | 'forgotPassword';

interface RateLimitConfig {
  maxAttempts: number;
  windowMs: number;
}

const LIMITS: Record<AuthAction, RateLimitConfig> = {
  login: { maxAttempts: 5, windowMs: 15 * 60 * 1000 },
  signup: { maxAttempts: 3, windowMs: 60 * 60 * 1000 },
  forgotPassword: { maxAttempts: 3, windowMs: 15 * 60 * 1000 },
};

const attempts: Record<AuthAction, number[]> = {
  login: [],
  signup: [],
  forgotPassword: [],
};

function pruneExpired(action: AuthAction): void {
  const now = Date.now();
  const { windowMs } = LIMITS[action];
  attempts[action] = attempts[action].filter((ts) => now - ts < windowMs);
}

/**
 * Returns true if the action is allowed (under the rate limit).
 * Records the attempt timestamp if allowed.
 */
export function checkAuthRateLimit(action: AuthAction): boolean {
  pruneExpired(action);
  const { maxAttempts } = LIMITS[action];
  if (attempts[action].length >= maxAttempts) {
    return false;
  }
  attempts[action].push(Date.now());
  return true;
}

/**
 * Returns the number of seconds until the next attempt is allowed,
 * or 0 if an attempt is currently allowed.
 */
export function getRetryAfterSeconds(action: AuthAction): number {
  pruneExpired(action);
  const { maxAttempts, windowMs } = LIMITS[action];
  if (attempts[action].length < maxAttempts) return 0;
  const oldest = attempts[action][0];
  return Math.ceil((oldest + windowMs - Date.now()) / 1000);
}
