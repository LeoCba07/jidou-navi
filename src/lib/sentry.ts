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

  // Global handler for errors outside React components (e.g. in async logic or listeners)
  if (!__DEV__ && typeof ErrorUtils !== 'undefined') {
    const defaultErrorHandler = (ErrorUtils as any).getGlobalHandler();
    (ErrorUtils as any).setGlobalHandler((error: any, isFatal?: boolean) => {
      Sentry.captureException(error, {
        level: isFatal ? 'fatal' : 'error',
        extra: { isFatal },
      });
      // Call the original handler so the app still crashes gracefully if fatal
      defaultErrorHandler(error, isFatal);
    });

    // Global promise rejection tracker for unhandled async errors
    const tracking = require('promise/setimmediate/rejection-tracking');
    tracking.enable({
      allRejections: true,
      onUnhandled: (id: any, error: any) => {
        Sentry.captureException(error, {
          extra: { promiseId: id, type: 'unhandled_rejection' },
        });
      },
      onHandled: (id: any) => {
        // Optional: track if a promise was eventually handled
      },
    });
  }
}

export { Sentry };
