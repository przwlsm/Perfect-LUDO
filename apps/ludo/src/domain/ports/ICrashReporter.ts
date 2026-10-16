/**
 * Sends unexpected errors to the crash-reporting service. A no-op in
 * development and in builds without a reporting key. Never throws.
 */
export interface ICrashReporter {
  captureException(error: unknown): void;
}
