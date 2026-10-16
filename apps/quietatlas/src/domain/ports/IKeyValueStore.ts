/**
 * Local, unsynced key-value persistence for on-device preferences such as
 * sound on or off. Not for anything that must survive a reinstall or follow
 * the player across devices.
 */
export interface IKeyValueStore {
  getItem(key: string): Promise<string | null>;
  setItem(key: string, value: string): Promise<void>;
}
