/**
 * Local, unsynced key-value persistence — for on-device preferences like
 * "use the 3D board", not for anything that needs to survive a reinstall
 * or follow the user across devices (that's IUserProgressRepository).
 */
export interface IKeyValueStore {
  getItem(key: string): Promise<string | null>;
  setItem(key: string, value: string): Promise<void>;
}
