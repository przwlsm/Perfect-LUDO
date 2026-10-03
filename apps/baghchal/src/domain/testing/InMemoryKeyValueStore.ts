import type { IKeyValueStore } from '../ports/IKeyValueStore';

export class InMemoryKeyValueStore implements IKeyValueStore {
  private readonly items = new Map<string, string>();

  async getItem(key: string): Promise<string | null> {
    return this.items.get(key) ?? null;
  }

  async setItem(key: string, value: string): Promise<void> {
    this.items.set(key, value);
  }
}
