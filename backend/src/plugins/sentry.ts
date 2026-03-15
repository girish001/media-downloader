/**
 * plugins/sentry.ts
 * ──────────────────
 * Sentry error monitoring integration for Sentry v8+.
 * Set SENTRY_DSN in .env to activate; otherwise a no-op placeholder is used.
 *
 * NOTE: autoDiscoverNodePerformanceMonitoringIntegrations() was removed in
 * Sentry SDK v8. Use explicit integrations or omit the integrations array
 * entirely to get Sentry's defaults.
 */

let _sentryLoaded = false;

export function initSentry(): void {
  const dsn = process.env.SENTRY_DSN;
  if (!dsn) {
    console.warn('[sentry] SENTRY_DSN not set — error monitoring disabled.');
    return;
  }

  try {
    import('@sentry/node').then(Sentry => {
      Sentry.init({
        dsn,
        environment:      process.env.NODE_ENV ?? 'development',
        release:          process.env.npm_package_version ?? '1.0.0',
        tracesSampleRate: process.env.NODE_ENV === 'production' ? 0.1 : 1.0,
        // No integrations array needed — Sentry v8 auto-instruments Node.js
      });
      _sentryLoaded = true;
      console.info('[sentry] Initialized — DSN configured.');
    }).catch(err => {
      console.warn('[sentry] Failed to load @sentry/node:', err.message);
    });
  } catch {
    // No-op: Sentry not critical to service operation
  }
}

export async function captureException(error: unknown): Promise<void> {
  if (!_sentryLoaded || !process.env.SENTRY_DSN) return;
  try {
    const Sentry = await import('@sentry/node');
    Sentry.captureException(error);
  } catch {
    // Silently fail — Sentry capture must never crash the app
  }
}

export async function captureMessage(
  message: string,
  level: 'info' | 'warning' | 'error' = 'info',
): Promise<void> {
  if (!_sentryLoaded || !process.env.SENTRY_DSN) return;
  try {
    const Sentry = await import('@sentry/node');
    Sentry.captureMessage(message, level);
  } catch {
    // Silently fail
  }
}
