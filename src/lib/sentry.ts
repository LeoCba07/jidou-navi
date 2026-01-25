import * as Sentry from '@sentry/react-native';

const SENTRY_DSN = process.env.EXPO_PUBLIC_SENTRY_DSN;

export function initSentry() {
  if (!SENTRY_DSN) {
    console.log('Sentry DSN not configured, crash reporting disabled');
    return;
  }

  Sentry.init({
    dsn: SENTRY_DSN,
    // Set tracesSampleRate to 1.0 to capture 100% of transactions for performance monitoring
    // Reduce in production for high-traffic apps
    tracesSampleRate: 0.2,
    // Only send errors in production
    enabled: !__DEV__,
    // Attach user info to errors
    beforeSend(event) {
      // Remove sensitive data if needed
      return event;
    },
  });
}

export { Sentry };
