import type { IKeyValueStore } from '../ports/IKeyValueStore';

/** In-memory IKeyValueStore test double — stands in for AsyncStorage in tests. */
export class InMemoryKeyValueStore implements IKeyValueStore {
  private readonly values = new Map<string, string>();

  async getItem(key: string): Promise<string | null> {
    return this.values.get(key) ?? null;
  }

  async setItem(key: string, value: string): Promise<void> {
    this.values.set(key, value);
  }
}
