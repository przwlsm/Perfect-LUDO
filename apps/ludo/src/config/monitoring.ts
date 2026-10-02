import type { ICrashReporter } from '@/domain';
import {
  SentryCrashReporter,
  startSentry,
  wrapWithSentry,
} from '@/infrastructure/monitoring/SentryCrashReporter';

/**
 * Crash reporting, wired separately from the container so it can start
 * before anything else is imported or rendered.
 */
export const startCrashReporting = startSentry;
export const withCrashReporting = wrapWithSentry;
export const crashReporter: ICrashReporter = new SentryCrashReporter();
