import type { ComponentType } from 'react';
import * as Sentry from '@sentry/react-native';
import type { ICrashReporter } from '@/domain';

const dsn = process.env.EXPO_PUBLIC_SENTRY_DSN;
/** Only release builds with a DSN report; development errors stay local. */
const enabled = Boolean(dsn) && !__DEV__;

/**
 * Must run before the first render so startup crashes are caught too.
 * Native crashes (Java/Kotlin, Objective-C) are captured by the SDK itself.
 */
export function startSentry(): void {
  if (!enabled) return;
  Sentry.init({
    dsn,
    // No names, emails or IP addresses leave the device.
    sendDefaultPii: false,
    // A small sample of performance traces; errors are always sent.
    tracesSampleRate: 0.1,
  });
}

/** Wraps the root so render errors and app-start timing are reported. */
export function wrapWithSentry<P extends Record<string, unknown>>(
  root: ComponentType<P>,
): ComponentType<P> {
  return enabled ? Sentry.wrap(root) : root;
}

export class SentryCrashReporter implements ICrashReporter {
  captureException(error: unknown): void {
    if (!enabled) return;
    try {
      Sentry.captureException(error);
    } catch {
      // Reporting must never become a second crash.
    }
  }
}
