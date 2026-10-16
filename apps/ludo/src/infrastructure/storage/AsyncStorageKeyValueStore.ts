import AsyncStorage from '@react-native-async-storage/async-storage';
import type { IKeyValueStore } from '@/domain';

export class AsyncStorageKeyValueStore implements IKeyValueStore {
  async getItem(key: string): Promise<string | null> {
    return AsyncStorage.getItem(key);
  }

  async setItem(key: string, value: string): Promise<void> {
    return AsyncStorage.setItem(key, value);
  }
}
