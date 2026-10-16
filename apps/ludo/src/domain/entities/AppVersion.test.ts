import {
  compareVersions,
  evaluateVersionPolicy,
  parseVersionPolicy,
  type VersionPolicy,
} from './AppVersion';

const policy = (minVersion: string | null, latestVersion: string | null): VersionPolicy => ({
  minVersion,
  latestVersion,
  storeUrl: null,
  message: null,
});

describe('compareVersions', () => {
  it('compares numerically, part by part', () => {
    expect(compareVersions('1.10.0', '1.9.0')).toBeGreaterThan(0);
    expect(compareVersions('1.2.3', '1.2.4')).toBeLessThan(0);
    expect(compareVersions('2.0.0', '1.99.99')).toBeGreaterThan(0);
  });

  it('treats missing parts as zero', () => {
    expect(compareVersions('1.2', '1.2.0')).toBe(0);
    expect(compareVersions('1', '1.0.1')).toBeLessThan(0);
  });
});

describe('evaluateVersionPolicy', () => {
  it('requires an update below the minimum', () => {
    expect(evaluateVersionPolicy('1.0.0', policy('1.1.0', '1.2.0'))).toBe('REQUIRED');
  });

  it('offers an update between the minimum and the latest', () => {
    expect(evaluateVersionPolicy('1.1.0', policy('1.1.0', '1.2.0'))).toBe('OPTIONAL');
  });

  it('asks nothing of an up-to-date or newer install', () => {
    expect(evaluateVersionPolicy('1.2.0', policy('1.1.0', '1.2.0'))).toBe('NONE');
    expect(evaluateVersionPolicy('1.3.0', policy('1.1.0', '1.2.0'))).toBe('NONE');
  });

  it('fails open when anything is unknown', () => {
    expect(evaluateVersionPolicy(null, policy('9.0.0', '9.0.0'))).toBe('NONE');
    expect(evaluateVersionPolicy('1.0.0', null)).toBe('NONE');
    expect(evaluateVersionPolicy('dev', policy('9.0.0', null))).toBe('NONE');
    expect(evaluateVersionPolicy('1.0.0', policy('bad', 'also bad'))).toBe('NONE');
  });
});

describe('parseVersionPolicy', () => {
  it('reads a well-formed payload', () => {
    expect(
      parseVersionPolicy({
        min_version: '1.1.0',
        latest_version: '1.2.0',
        store_url: 'https://apps.apple.com/app/id123',
        message: ' Faster matchmaking. ',
      }),
    ).toEqual({
      minVersion: '1.1.0',
      latestVersion: '1.2.0',
      storeUrl: 'https://apps.apple.com/app/id123',
      message: 'Faster matchmaking.',
    });
  });

  it('drops malformed fields and non-https store links', () => {
    expect(
      parseVersionPolicy({ min_version: '1.x', latest_version: 3, store_url: 'http://x.io' }),
    ).toEqual({ minVersion: null, latestVersion: null, storeUrl: null, message: null });
  });

  it('rejects non-objects', () => {
    expect(parseVersionPolicy(null)).toBeNull();
    expect(parseVersionPolicy('1.0.0')).toBeNull();
  });
});
