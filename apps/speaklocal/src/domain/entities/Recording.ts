/** One take of the learner saying a phrase, stored as a file on the device. */
export interface Recording {
  /** The file name; unique. */
  readonly id: string;
  readonly phraseKey: string;
  readonly uri: string;
  /** Epoch ms when it was recorded. */
  readonly at: number;
  readonly durationMs: number;
}

/** Takes kept per phrase: the latest one free, a history with Plus. */
export const FREE_TAKES = 1;
export const PLUS_TAKES = 20;

/** File name for a take: `kn~auto.1__1760000000000__2300.m4a`. */
export function recordingFileName(
  phraseKey: string,
  at: number,
  durationMs: number,
  ext: string,
): string {
  return `${phraseKey.replace(':', '~')}__${Math.round(at)}__${Math.round(durationMs)}${ext}`;
}

/** Reads a take's details back from its file name; null for any other file. */
export function parseRecordingFileName(name: string): Omit<Recording, 'uri'> | null {
  const m = /^([a-z]{2})~([A-Za-z]+\.x?\d+)__(\d+)__(\d+)\.[a-z0-9]+$/.exec(name);
  if (!m) return null;
  return { id: name, phraseKey: `${m[1]}:${m[2]}`, at: Number(m[3]), durationMs: Number(m[4]) };
}

/** Which takes to delete after a new one, keeping the newest `keep` per phrase. */
export function takesToPrune(
  all: readonly Recording[],
  phraseKey: string,
  keep: number,
): Recording[] {
  return all
    .filter((r) => r.phraseKey === phraseKey)
    .sort((a, b) => b.at - a.at)
    .slice(Math.max(0, keep));
}
