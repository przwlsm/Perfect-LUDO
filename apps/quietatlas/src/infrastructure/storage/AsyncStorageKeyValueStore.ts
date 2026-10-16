import AsyncStorage from '@react-native-async-storage/async-storage';
import type { IKeyValueStore } from '@/domain/ports/IKeyValueStore';

export class AsyncStorageKeyValueStore implements IKeyValueStore {
  getItem(key: string): Promise<string | null> {
    return AsyncStorage.getItem(key);
  }

  setItem(key: string, value: string): Promise<void> {
    return AsyncStorage.setItem(key, value);
  }
}
