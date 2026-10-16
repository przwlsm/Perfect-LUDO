import { Directory, File, Paths } from 'expo-file-system';
import {
  parseRecordingFileName,
  recordingFileName,
  type Recording,
} from '@/domain/entities/Recording';
import type { IRecordingStore } from '@/domain/ports';

/**
 * Takes live in the app's private documents folder, `recordings/`. They are
 * never uploaded, and deleting the app deletes them.
 */
export class FileRecordingStore implements IRecordingStore {
  private dir(): Directory {
    const d = new Directory(Paths.document, 'recordings');
    if (!d.exists) d.create({ intermediates: true, idempotent: true });
    return d;
  }

  async list(): Promise<readonly Recording[]> {
    try {
      const out: Recording[] = [];
      for (const item of this.dir().list()) {
        if (!(item instanceof File)) continue;
        const meta = parseRecordingFileName(item.name);
        if (meta) out.push({ ...meta, uri: item.uri });
      }
      return out.sort((a, b) => b.at - a.at);
    } catch {
      return [];
    }
  }

  async save(
    tempUri: string,
    phraseKey: string,
    durationMs: number,
    at: number,
  ): Promise<Recording | null> {
    try {
      const temp = new File(tempUri);
      const ext = /\.[a-z0-9]+$/i.exec(temp.name)?.[0]?.toLowerCase() ?? '.m4a';
      const name = recordingFileName(phraseKey, at, durationMs, ext);
      const target = new File(this.dir(), name);
      await temp.move(target);
      const meta = parseRecordingFileName(name);
      return meta ? { ...meta, uri: target.uri } : null;
    } catch {
      return null;
    }
  }

  async remove(recording: Recording): Promise<void> {
    try {
      const f = new File(recording.uri);
      if (f.exists) f.delete();
    } catch {
      // Already gone.
    }
  }

  async removeAll(): Promise<void> {
    try {
      const d = new Directory(Paths.document, 'recordings');
      if (d.exists) d.delete();
    } catch {
      // Nothing to delete.
    }
  }
}

/**
 * In a browser there is no private folder: takes are kept in memory for
 * the visit only (blob URLs), which is enough to hear yourself.
 */
export class MemoryRecordingStore implements IRecordingStore {
  private takes: Recording[] = [];

  async list(): Promise<readonly Recording[]> {
    return [...this.takes].sort((a, b) => b.at - a.at);
  }

  async save(tempUri: string, phraseKey: string, durationMs: number, at: number) {
    const id = recordingFileName(phraseKey, at, durationMs, '.webm');
    const r: Recording = { id, phraseKey, uri: tempUri, at, durationMs: Math.round(durationMs) };
    this.takes.push(r);
    return r;
  }

  async remove(recording: Recording): Promise<void> {
    this.takes = this.takes.filter((t) => t.id !== recording.id);
  }

  async removeAll(): Promise<void> {
    this.takes = [];
  }
}
