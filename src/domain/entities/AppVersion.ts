/**
 * Store-version policy: which installed app versions may keep playing.
 *
 * Over-the-air updates only replace JavaScript, so a server change that needs
 * new native code (or a protocol an old client no longer speaks) has to send
 * players to the store. The server publishes a floor and the newest version;
 * the client compares its own installed version against them.
 */
export interface VersionPolicy {
  /** Below this, the app refuses to continue until updated. */
  readonly minVersion: string | null;
  /** Newest store version; below it the player is offered, not forced, an update. */
  readonly latestVersion: string | null;
  /** Store page override (required on iOS, where the App Store id is not derivable). */
  readonly storeUrl: string | null;
  /** Optional note shown on the update screen, e.g. what the update fixes. */
  readonly message: string | null;
}

export type UpdateRequirement = 'NONE' | 'OPTIONAL' | 'REQUIRED';

const VERSION = /^\d+(\.\d+){0,3}$/;

export function isVersion(value: unknown): value is string {
  return typeof value === 'string' && VERSION.test(value);
}

/**
 * Numeric, part-by-part comparison, so "1.10.0" is newer than "1.9.0" and
 * "1.2" equals "1.2.0". Returns negative, zero or positive like a sort key.
 */
export function compareVersions(a: string, b: string): number {
  const left = a.split('.').map(Number);
  const right = b.split('.').map(Number);
  for (let i = 0; i < Math.max(left.length, right.length); i++) {
    const diff = (left[i] ?? 0) - (right[i] ?? 0);
    if (diff !== 0) return diff;
  }
  return 0;
}

/**
 * Fails open: an unknown installed version or a malformed policy never locks
 * a player out. Only a clear "installed < minimum" blocks the app.
 */
export function evaluateVersionPolicy(
  installed: string | null,
  policy: VersionPolicy | null,
): UpdateRequirement {
  if (!policy || !isVersion(installed)) return 'NONE';
  if (isVersion(policy.minVersion) && compareVersions(installed, policy.minVersion) < 0) {
    return 'REQUIRED';
  }
  if (isVersion(policy.latestVersion) && compareVersions(installed, policy.latestVersion) < 0) {
    return 'OPTIONAL';
  }
  return 'NONE';
}

/** Validates an untrusted server payload; anything unexpected becomes null. */
export function parseVersionPolicy(raw: unknown): VersionPolicy | null {
  if (!raw || typeof raw !== 'object') return null;
  const row = raw as Record<string, unknown>;
  const text = (value: unknown, max: number) =>
    typeof value === 'string' && value.trim().length > 0 && value.length <= max
      ? value.trim()
      : null;
  const storeUrl = text(row.store_url, 300);
  return {
    minVersion: isVersion(row.min_version) ? row.min_version : null,
    latestVersion: isVersion(row.latest_version) ? row.latest_version : null,
    storeUrl: storeUrl?.startsWith('https://') ? storeUrl : null,
    message: text(row.message, 300),
  };
}
